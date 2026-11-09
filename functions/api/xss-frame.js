/**
 * Microdocumento para mostrar XSS en un iframe sandbox SIN allow-same-origin.
 * La versión vulnerable solo se sirve en localhost con LAB_MODE=local.
 * En público siempre se escapa el contenido. No contiene secretos ni cookies.
 */
const encode = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function onRequestGet({request, env}) {
  const url = new URL(request.url);
  const local = env.LAB_MODE === 'local' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  const vulnerable = url.searchParams.get('mode') === 'vulnerable';
  const comment = String(url.searchParams.get('comment') || 'Hola, mundo').slice(0,350);
  const execute = local && vulnerable;
  const rendered = execute ? comment : encode(comment);
  const html = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>
   body{font:14px system-ui,sans-serif;margin:12px;color:#23304a}b{display:block;margin-bottom:7px}#comment{border:1px solid #d5def0;border-radius:8px;padding:12px;background:#fff;min-height:35px;overflow-wrap:anywhere}
   small{display:block;margin-top:8px;color:#556581}
   </style><b>Comentarios del blog de prueba</b><div id="comment">${rendered}</div><small>${execute?'DOM vulnerable REAL, aislado en localhost':'Contenido escapado; sin JavaScript del usuario'}</small></html>`;
  return new Response(html,{
    headers:{
      'Content-Type':'text/html; charset=utf-8',
      'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'no-referrer',
      // En local permitimos únicamente JS inline dentro del iframe aislado.
      // Sin red saliente y sin acceso al origen de la app por sandbox.
      'Content-Security-Policy': execute
        ? "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'none'; connect-src 'none'; form-action 'none'"
        : "default-src 'none'; style-src 'unsafe-inline'; script-src 'none'; img-src 'none'; form-action 'none'"
    }
  });
}
