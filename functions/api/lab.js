/**
 * Cloudflare Pages Function: backend educativo.
 * En producción jamás ejecuta SQL deliberadamente vulnerable ni omite controles IDOR.
 * Los ejemplos inseguros reales solo se activan en `localhost` con LAB_MODE=local.
 * Ningún dato de la base de prueba es auténtico.
 */
const json = (data, status=200) => Response.json(data, {
  status,
  headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});
const localOnly = ({ request, env }) =>
  env.LAB_MODE === 'local' && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname);
const safeString = (v, max=120) => String(v ?? '').slice(0,max);
const requireDB = env => {
  if (!env.LAB_DB) throw new Error('La base LAB_DB no está configurada. Lee README.md.');
  return env.LAB_DB;
};
// Cloudflare Workers (workerd) rechaza PBKDF2 con más de 100.000 iteraciones.
const PBKDF2_ITERATIONS = 100000;
const MAX_BODY = 4096;
const hex = b => Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');
async function derive(password, salt) {
  const secret = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name:'PBKDF2', hash:'SHA-256', salt, iterations:PBKDF2_ITERATIONS }, secret, 256));
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let data;
  try {
    // Se mide el cuerpo real: la cabecera Content-Length puede faltar (chunked) o mentir.
    if (Number(request.headers.get('content-length') || 0) > MAX_BODY) return json({ error:'Entrada demasiado grande' },413);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_BODY) return json({ error:'Entrada demasiado grande' },413);
    try { data = JSON.parse(raw); } catch { return json({error:'JSON inválido'},400); }
    if (!data || typeof data !== 'object') return json({error:'JSON inválido'},400);
    const mode = data.mode === 'vulnerable' ? 'vulnerable' : 'protected';
    const realBad = mode === 'vulnerable' && localOnly(context);
    const topic = safeString(data.topic,25);
    const fields = data.fields || {};

    if (topic === 'sql') {
      const db = requireDB(env);
      const username = safeString(fields.username,80);
      const pin = safeString(fields.pin,100);
      if (mode === 'vulnerable' && !realBad) {
        return json({kind:'simulation', success:true,
          title:'SIMULACIÓN: la consulta insegura podría devolver registros',
          details:['Admin DEMO · ACCESO-ROJO-001','Ana DEMO · ACCESO-AZUL-002'],
          explanation:'En público no ejecutamos SQL vulnerable. El ejemplo ilustra un bypass en una consulta concatenada.'});
      }
      let rows;
      if (realBad) {
        // INTENCIONALMENTE INSEGURO: solo en el D1 LOCAL con datos ficticios.
        // No reutilices este fragmento en aplicaciones reales.
        const query = `SELECT display_name, badge FROM demo_users WHERE username='${username}' AND pin='${pin}' LIMIT 4`;
        rows = (await db.prepare(query).all()).results || [];
      } else {
        // SEGURO: la entrada viaja separada del texto SQL.
        rows = (await db.prepare('SELECT display_name, badge FROM demo_users WHERE username = ? AND pin = ? LIMIT 4')
          .bind(username, pin).all()).results || [];
      }
      return json({kind:'real', success:rows.length>0,
        title:rows.length ? 'La consulta devolvió registros de demostración' : 'Acceso denegado: no hay coincidencias',
        details:rows.map(r=>`${r.display_name} · ${r.badge}`),
        explanation:realBad ? 'Consulta concatenada ejecutada en D1 LOCAL de prueba.' : 'D1 ejecutó la consulta parametrizada: el texto no pudo cambiar el SQL.'});
    }

    if (topic === 'idor') {
      const db = requireDB(env);
      const actor = ['ana','luis'].includes(fields.actor) ? fields.actor : 'ana';
      const invoiceId = Number(fields.invoiceId);
      if (!Number.isInteger(invoiceId) || invoiceId < 1 || invoiceId > 9999) return json({error:'ID de factura inválido'},400);
      if (mode === 'vulnerable' && !realBad) {
        return json({kind:'simulation',success:true,title:'SIMULACIÓN: factura ajena visible',
          details:['Factura #202 · Titular Luis · RD$3,200 (ficticio)'],
          explanation:'La versión publicada nunca elimina la autorización del servidor.'});
      }
      const query = realBad
        ? 'SELECT * FROM demo_invoices WHERE id = ?'
        : 'SELECT * FROM demo_invoices WHERE id = ? AND owner = ?';
      const record = await (realBad
        ? db.prepare(query).bind(invoiceId).first()
        : db.prepare(query).bind(invoiceId,actor).first());
      return json({kind:'real',success:!!record,
        title:record ? 'El servidor devolvió una factura ficticia' : '403 / 404: no tienes acceso a esa factura',
        details:record ? [`#${record.id} · ${record.owner} · ${record.item} · RD$${record.total}`]:[],
        explanation: realBad ? 'Solo en local: no se comprobó el propietario del recurso.' : 'El filtro exige coincidencia de ID Y titular. Nota: el actor del laboratorio es una identidad ficticia seleccionada en pantalla; no sustituye la autenticación real.'});
    }

    if (topic === 'hash') {
      const password = safeString(fields.password,72);
      if (!password) return json({error:'Introduce una contraseña de prueba'},400);
      if (mode === 'vulnerable') {
        return json({kind:'real',success:true,title:'Contraseña guardada como texto plano (demostración)',
          details:[`valor: ${password}`],
          explanation:'El servidor muestra la representación insegura, pero no la almacena.'});
      }
      const salt1 = crypto.getRandomValues(new Uint8Array(16));
      const salt2 = crypto.getRandomValues(new Uint8Array(16));
      const hash1 = await derive(password,salt1);
      const hash2 = await derive(password,salt2);
      return json({kind:'real',success:false,title:'Hash real calculado correctamente en el servidor',
        details:[`PBKDF2 #1: ${hash1.slice(0,42)}…`,`PBKDF2 #2: ${hash2.slice(0,42)}…`,`Salts diferentes: ${hash1 !== hash2 ? 'sí' : 'no'}`],
        explanation:'Este laboratorio usa PBKDF2-HMAC-SHA-256 con 100.000 iteraciones (máximo admitido por Cloudflare Workers) y dos salts aleatorios. No es bcrypt ni Argon2id; para proyectos nuevos se recomienda Argon2id cuando esté disponible.'});
    }

    if (topic === 'rate') {
      if (mode === 'vulnerable') return json({kind:'simulation',success:true,title:'Modo sin limitación (simulado)',
        details:['La aplicación aceptaría nuevos intentos indefinidamente.'],
        explanation:'Para no ofrecer un endpoint abusivo en Internet, el modo vulnerable no genera carga real.'});
      const db = requireDB(env);
      const client = safeString(fields.client,64);
      if (!/^[a-zA-Z0-9_-]{12,64}$/.test(client)) return json({error:'Identificador de laboratorio inválido'},400);
      const now = Math.floor(Date.now()/1000);
      const end = now + 30;
      const row = await db.prepare(`
        INSERT INTO demo_limits(bucket, attempts, resets_at) VALUES (?, 1, ?)
        ON CONFLICT(bucket) DO UPDATE SET
          attempts = CASE WHEN demo_limits.resets_at <= ? THEN 1 ELSE demo_limits.attempts + 1 END,
          resets_at = CASE WHEN demo_limits.resets_at <= ? THEN excluded.resets_at ELSE demo_limits.resets_at END
        RETURNING attempts, resets_at
      `).bind(`rate:${client}`,end,now,now).first();
      const accepted = row.attempts <= 4;
      return json({kind:'real',success:accepted,blocked:!accepted,
        title:accepted ? `Solicitud ${row.attempts}/4 aceptada` : '429: demasiadas solicitudes. Bloqueo temporal',
        details:[`Contador en D1: ${row.attempts}`,`Se reinicia en: ${Math.max(0,row.resets_at-now)} segundos`],
        explanation:'El límite se comprueba en el servidor y se guarda en D1. Es una demo por identificador de sesión, NO un rate limiter de producción resistente a evasión.'},accepted?200:429);
    }

    return json({error:'Laboratorio desconocido'},404);
  } catch (error) {
    // En producción no se revelan trazas ni detalles internos del error.
    return json({error: 'Error del laboratorio o base de datos no inicializada',
      hint: localOnly(context) ? String(error?.message || '') : 'Comprueba el binding LAB_DB y las migraciones.'},500);
  }
}

export async function onRequestOptions() { return new Response(null, { status: 405 }); }
