import {categories,topics} from './data.js';

const TEAM_NAMES = 'Integrante 1 · Integrante 2'; // Cambia los nombres antes de exponer
const $ = id => document.getElementById(id);
const stage=$('stage'), index=$('topics-index');
const h=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
let at=-1, mode='vulnerable', lastValues={};
const clientId = (()=>{
  let key=sessionStorage.getItem('websec-demo-client');
  if(!key){key='student_'+crypto.randomUUID().replaceAll('-','');sessionStorage.setItem('websec-demo-client',key)}
  return key;
})();

function badge(t){return `<span class="tag ${t.type==='real'?'real':'sim'}">${t.type==='real'?'PRÁCTICA PRINCIPAL':'SIMULACIÓN'}</span>`;}
function fieldMarkup(field){
  const value=lastValues[field.key]??field.value??field.options?.[0]?.[0]??'';
  if(field.type==='select') return `<div><label class="label" for="f-${h(field.key)}">${h(field.label)}</label><select class="field" data-field="${h(field.key)}" id="f-${h(field.key)}">${field.options.map(([v,label])=>`<option value="${h(v)}" ${v===value?'selected':''}>${h(label)}</option>`).join('')}</select></div>`;
  return `<div><label class="label" for="f-${h(field.key)}">${h(field.label)}</label><input class="field" id="f-${h(field.key)}" data-field="${h(field.key)}" maxlength="350" autocomplete="off" spellcheck="false" value="${h(value)}" /></div>`;
}
function values(){return Object.fromEntries([...stage.querySelectorAll('[data-field]')].map(e=>[e.dataset.field,e.value]));}
function setDrawer(open){$('drawer').classList.toggle('open',open);$('drawer').inert=!open;$('scrim').hidden=!open;$('menu-btn').setAttribute('aria-expanded',String(open));}
function buildIndex(){
  index.innerHTML=`<button class="drawer-topic" data-go="-1">◈ Portada</button>`+
    categories.map(c=>`<div class="drawer-cat">${h(c.name)}</div>`+
    topics.filter(t=>t.category===c.id).map(t=>`<button class="drawer-topic" data-go="${t.n-1}">${String(t.n).padStart(2,'0')}. ${h(t.name)} <small>${t.type==='real'?'REAL':'SIM'}</small></button>`).join('')).join('')+
    `<button class="drawer-topic" data-go="20">✓ Conclusiones</button>`;
  index.addEventListener('click',e=>{const target=e.target.closest('[data-go]');if(target)goto(Number(target.dataset.go));});
}
function goto(n){
  at=Math.max(-1,Math.min(topics.length,n));mode='vulnerable';lastValues=at>=0&&at<topics.length?{...topics[at].preset}:{};setDrawer(false);render();
  stage.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});
}
function cover(){return `<div class="cover"><div class="eyebrow">Tecnología de Internet II · Clase 05</div><h1 class="title">WEB SECURITY <span>LAB</span></h1><p>Una presentación que también es un laboratorio: descubre qué pasa cuando una web es vulnerable, activa su protección y repite la prueba.</p><div class="cover-chips"><span class="tag">20 temas</span><span class="tag real">6 prácticas funcionales</span><span class="tag">14 simulaciones</span><span class="tag">Modo vulnerable / protegido</span></div><button id="start-btn" class="btn blue cover-start">Comenzar exposición →</button><div class="presenters">${h(TEAM_NAMES)} · Universidad Central del Este · ISW-312</div></div>`;}
function ending(){return `<div class="end"><div class="check-big">✓</div><div class="kicker">Conclusiones</div><h2>Seguridad en cada capa.</h2><p>Una defensa no basta. Seguridad significa verificar entradas, permisos, sesiones, consultas y configuraciones, y demostrar que las protecciones funcionan.</p><div class="end-list"><article><strong>Cliente</strong>Escape contextual, CSP, HTTPS y archivos confiables.</article><article><strong>Servidor</strong>Autorización, consultas parametrizadas y límites.</article><article><strong>Equipo</strong>Revisión, actualizaciones, auditorías y monitoreo.</article></div><button id="restart-btn" class="btn blue">Volver al inicio</button><div class="presenters">Prácticas en entornos ficticios y aislados · Investigación basada en OWASP, MDN e INCIBE.</div></div>`;}
function topicView(t){
  return `<div class="kicker">${h(categories.find(c=>c.id===t.category).name)} · Laboratorio ${String(t.n).padStart(2,'0')}/20</div>
   <h1 class="h1">${h(t.name)}</h1><p class="summary">${h(t.what)}</p>
   <div class="meta-row">${badge(t)}<span class="tag">Escenario: ${h(t.app)}</span><span class="tag">${t.type==='real'?'Backend / navegador':'Interacción en navegador'}</span></div>
   <div class="topic-layout">
    <section class="card lab-card" aria-label="Laboratorio interactivo">
     <div class="section-head"><h2>Prueba interactiva</h2>
       <div class="mode-switch" role="group" aria-label="Modo de seguridad">
        <button class="mode-btn bad ${mode==='vulnerable'?'active':''}" aria-pressed="${mode==='vulnerable'}" data-mode="vulnerable">● Vulnerable</button>
        <button class="mode-btn good ${mode==='protected'?'active':''}" aria-pressed="${mode==='protected'}" data-mode="protected">✓ Protegido</button>
       </div>
     </div>
     <div class="fields">${t.fields.map(fieldMarkup).join('')||'<div class="hint">Pulsa ejecutar para comprobar la respuesta del servidor.</div>'}</div>
     <div class="actions"><button id="example-btn" class="btn ghost">↺ Cargar ejemplo</button><button id="run-btn" class="btn blue">▶ Ejecutar prueba</button></div>
     <div id="output" class="output"><div class="output-empty">Selecciona un modo y ejecuta la demostración.<br/>Después cambia al otro modo y repite.</div></div>
    </section>
    <aside class="card info-card"><div class="info-section danger"><h3>Si no se protege</h3><p>${h(t.risk)}</p></div>
     <div class="info-section safe"><h3>Cómo protegerse</h3><p>${h(t.fix)}</p></div>
     <button class="details-link" id="code-toggle" aria-expanded="false">+ Mostrar código vulnerable y corregido</button>
     <div class="code-wrap" id="code-wrap" hidden>
      <div class="code-card bad"><div class="c-head">✗ Implementación insegura (ilustrativa)</div><pre><code>${h(t.bad)}</code></pre></div>
      <div class="code-card good"><div class="c-head">✓ Implementación corregida (ilustrativa)</div><pre><code>${h(t.good)}</code></pre></div>
     </div><p class="tiny-note">${t.type==='sim'?'Simulación educativa: este ejemplo no hace solicitudes maliciosas reales.':'Algunas pruebas son reales solo en localhost; el backend público nunca ofrece rutas vulnerables.'}</p></aside>
   </div>`;
}
function render(){
  $('position').textContent=at<0?'Portada':at>=20?'Final':`${at+1} / 20`;
  $('progress').style.width=`${Math.max(0,at+1)/21*100}%`;
  $('prev-btn').disabled=at<=-1;$('next-btn').disabled=at>=20;
  $('next-btn').textContent=at===19?'Conclusiones →':'Siguiente →';
  stage.innerHTML=at<0?cover():at>=20?ending():topicView(topics[at]);
  index.querySelectorAll('[data-go]').forEach(b=>b.classList.toggle('active',Number(b.dataset.go)===at));
  if(at===-1){$('start-btn').addEventListener('click',()=>goto(0));return}
  if(at===20){$('restart-btn').addEventListener('click',()=>goto(-1));return}
  const topic=topics[at];
  stage.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{
    lastValues=values();mode=b.dataset.mode;render();
  }));
  $('example-btn').addEventListener('click',()=>{lastValues={...topic.preset};render();});
  $('run-btn').addEventListener('click',()=>run(topic));
  $('code-toggle').addEventListener('click',()=>{
    const open=$('code-wrap').hidden;
    $('code-wrap').hidden=!open;
    $('code-toggle').setAttribute('aria-expanded',String(open));
    $('code-toggle').textContent=open?'− Ocultar código':'+ Mostrar código vulnerable y corregido';
  });
}
function present({kind='simulation',success,blocked=false,title,details=[],explanation,frameUrl}){
  const out=$('output');if(!out)return;
  const good=mode==='protected';
  out.className=`output ${good?'good':'bad'}`;
  out.replaceChildren();
  const status=document.createElement('div');status.className=`status ${good?'good':'bad'}`;
  status.textContent=`${kind==='real'?'EJECUCIÓN REAL':kind==='mixed'?'PRUEBA CONTROLADA':'SIMULACIÓN'} · ${good?'PROTEGIDO':'VULNERABLE'}`;out.append(status);
  const heading=document.createElement('h3');heading.textContent=title;out.append(heading);
  if(frameUrl){const frame=document.createElement('iframe');frame.className='frame';frame.title='Demostración XSS en marco aislado';frame.sandbox='allow-scripts';frame.referrerPolicy='no-referrer';frame.src=frameUrl;out.append(frame);}
  if(details?.length){const ul=document.createElement('ul');details.forEach(d=>{const li=document.createElement('li');li.textContent=String(d);ul.append(li)});out.append(ul);}
  const p=document.createElement('p');p.textContent=explanation;out.append(p);
}
function simulate(t,fields){
  const bad=mode==='vulnerable';
  const details=[];
  let title=bad?t.badTitle:t.goodTitle;
  if(t.id==='https') details.push(bad?`Dato visible: ${String(fields.message).slice(0,80)}`:'Contenido en tránsito: [CIFRADO POR TLS · VISTA DIDÁCTICA]');
  if(t.id==='ddos') details.push(`${Number(fields.volume||0).toLocaleString('es-DO')} peticiones ficticias, 0 peticiones reales enviadas.`);
  if(t.id==='upload') details.push(`Archivo examinado visualmente: ${fields.file}`);
  if(t.id==='csrf') details.push(`Operación de prueba: ${fields.operation}`);
  if(t.id==='command') details.push(`Entrada mostrada, jamás ejecutada: ${String(fields.folder).slice(0,70)}`);
  if(t.id==='ssrf') details.push(`URL no solicitada: ${String(fields.url).slice(0,100)}`);
  if(t.id==='ia') details.push(`Hallazgo seleccionado: ${fields.snippet}`);
  if(t.id==='owasp') details.push(`Categoría seleccionada: ${fields.risk}`);
  if(t.id==='sesiones') details.push(`Prueba de sesión: ${fields.action}`);
  if(t.id==='dependencias') details.push(`Paquete ficticio: ${fields.package}`);
  if(t.id==='auditoria') details.push(`Revisión: ${fields.test}`);
  if(t.id==='secretos') details.push(`Inspección: ${fields.view}`);
  if(t.id==='principios') details.push(`Escenario: ${fields.layer}`);
  if(t.id==='api') details.push(`Token de prueba: ${fields.token}`);
  if(title) title=title.replace('{message}',String(fields.message||'').slice(0,70));
  present({kind:'simulation',success:!bad,title,details,explanation:bad?t.badExplain:t.goodExplain});
}
async function post(topic,fields){
  const response=await fetch('/api/lab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic,mode,fields})});
  const data=await response.json();
  if(data.error)throw new Error(data.error+(data.hint?' · '+data.hint:''));
  return data;
}
async function run(t){
  const fields=values();lastValues={...fields};
  const btn=$('run-btn');btn.disabled=true;btn.textContent='Ejecutando…';
  try{
    if(t.type==='sim'){simulate(t,fields);return;}
    if(t.route==='xss'){
      const query=new URLSearchParams({mode,comment:String(fields.comment).slice(0,350)});
      const live=location.hostname==='localhost'||location.hostname==='127.0.0.1';
      present({kind:live?'mixed':'simulation',success:mode==='protected',
        title:mode==='protected'?'Comentario mostrado sin ejecutar etiquetas':live?'El payload intenta alterar el DOM del iframe':'SIMULACIÓN PÚBLICA: un XSS podría alterar el DOM',
        details:[live?'Observa el iframe aislado.':'El servidor público siempre escapa el comentario, incluso en modo vulnerable.'],
        explanation:mode==='protected'?t.goodExplain:t.badExplain,
        frameUrl:'/api/xss-frame?'+query.toString()});return;
    }
    if(t.route==='headers'){
      if(mode==='vulnerable'){present({kind:'simulation',success:true,title:'Escenario sin cabeceras de seguridad',details:['CSP: ausente','X-Content-Type-Options: ausente','Referrer-Policy: ausente'],explanation:t.badExplain});return;}
      const res=await fetch('/api/headers',{cache:'no-store'});
      if(!res.ok)throw new Error('No fue posible consultar las cabeceras');
      const j=await res.json();
      const headers=['content-security-policy','x-content-type-options','referrer-policy','x-frame-options','permissions-policy','strict-transport-security']
        .map(key=>`${key}: ${res.headers.get(key)||'(no presente en HTTP local)'}`);
      present({kind:'real',success:false,title:'Cabeceras reales recibidas del backend',details:headers,explanation:t.goodExplain});return;
    }
    if(t.route==='rate' && mode==='protected'){
      const number=Math.max(1,Math.min(8,Number(fields.attempts)||6));
      const lines=[];let blocked=false;
      for(let i=0;i<number;i++){
        const res=await post('rate',{client:clientId});
        lines.push(`Intento ${i+1}: ${res.blocked?'HTTP 429 · bloqueado':'HTTP 200 · aceptado'}`);
        if(res.blocked)blocked=true;
      }
      present({kind:'real',success:!blocked,blocked,title:blocked?'El servidor bloqueó el exceso de intentos':'Todas las peticiones bajo el límite',details:lines,explanation:t.goodExplain});return;
    }
    if(t.route==='rate' && mode==='vulnerable'){
      const data=await post('rate',{attempts:fields.attempts});
      present({...data,details:[`${Math.min(8,Number(fields.attempts)||6)} solicitudes representadas; ninguna carga masiva enviada`],explanation:t.badExplain});return;
    }
    const data=await post(t.route,fields);
    present(data);
  }catch(err){present({kind:'simulation',success:false,
    title:'Backend no disponible o sin inicializar',details:[String(err.message).slice(0,200)],
    explanation:'No se ha fingido una prueba real. Comprueba npm run dev, el esquema D1 y la conexión. Las simulaciones siguen funcionando sin Internet.'});}
  finally{if(btn.isConnected){btn.disabled=false;btn.textContent='▶ Ejecutar prueba';}}
}

$('prev-btn').addEventListener('click',()=>goto(at-1));$('next-btn').addEventListener('click',()=>goto(at+1));
$('menu-btn').addEventListener('click',()=>setDrawer(true));$('drawer-close').addEventListener('click',()=>setDrawer(false));
$('scrim').addEventListener('click',()=>setDrawer(false));
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){setDrawer(false);return}
  if(e.key.toLowerCase()==='i'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){setDrawer(!$('drawer').classList.contains('open'));return}
  if(['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement?.tagName)||$('drawer').classList.contains('open'))return;
  if(e.key==='ArrowRight'){e.preventDefault();goto(at+1)}
  if(e.key==='ArrowLeft'){e.preventDefault();goto(at-1)}
});
buildIndex();render();
