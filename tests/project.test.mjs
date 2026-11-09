import {test} from 'node:test';
import assert from 'node:assert/strict';
import {topics,categories} from '../public/js/data.js';
import {onRequestGet as getXss} from '../functions/api/xss-frame.js';
import {onRequestGet as getHeaders} from '../functions/api/headers.js';
import {onRequestPost as runLab} from '../functions/api/lab.js';

const req = (url,mode='vulnerable',comment='<img src=x onerror="document.body.textContent=\'alterado\'">') => ({request:new Request(url+'?mode='+mode+'&comment='+encodeURIComponent(comment)),env:{LAB_MODE:'local'}});
const body = (topic,mode,fields={})=>new Request('http://localhost:8788/api/lab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic,mode,fields})});

test('20 temas y 6 prácticas principales, agrupados en cinco categorías',()=>{
 assert.equal(topics.length,20);assert.equal(topics.filter(x=>x.type==='real').length,6);assert.equal(categories.length,5);
 assert.equal(new Set(topics.map(x=>x.id)).size,20);
 for(const t of topics) for(const key of ['what','risk','fix','bad','good','app','name']) assert.ok(t[key],`${t.id}.${key}`);
});
test('los veinte temas contienen ejemplo e interacción',()=>{
 for(const t of topics){assert.ok(Array.isArray(t.fields));assert.ok(t.preset);}
});
test('XSS en sitio público siempre escapa HTML incluso pidiendo modo vulnerable',async()=>{
 const res=getXss(req('https://example.pages.dev/api/xss-frame'));
 const html=await res.text();
 assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img src=x onerror=/);
 assert.match(res.headers.get('Content-Security-Policy'),/script-src 'none'/);
});
test('XSS local permite la demostración únicamente en iframe aislable',async()=>{
 const res=getXss(req('http://localhost:8788/api/xss-frame'));
 assert.match(await res.text(),/<img src=x onerror=/);
});
test('cabeceras reales no dependen de un interruptor del frontend',async()=>{
 const res=getHeaders({request:new Request('https://example.pages.dev/api/headers')});
 assert.equal(res.headers.get('X-Content-Type-Options'),'nosniff');
 assert.match(res.headers.get('Content-Security-Policy'),/default-src/);
 assert.match(res.headers.get('Strict-Transport-Security'),/max-age/);
});
test('PBKDF2 genera hashes reales distintos gracias a salts distintos',async()=>{
 const res=await runLab({request:body('hash','protected',{password:'PruebaD3mo!'}),env:{}});
 assert.equal(res.status,200);
 const data=await res.json();assert.equal(data.kind,'real');
 assert.match(data.details[0],/PBKDF2/);assert.match(data.details[2],/sí/);
});
test('en modo público no se ejecuta la rama SQL deliberadamente vulnerable',async()=>{
 const mockDB={prepare(){throw new Error('Nunca debe usarse la DB en el modo público vulnerable')}};
 const res=await runLab({request:new Request('https://example.pages.dev/api/lab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic:'sql',mode:'vulnerable',fields:{username:'admin',pin:"' OR '1'='1' -- "}})}),env:{LAB_MODE:'local',LAB_DB:mockDB}});
 const data=await res.json();assert.equal(data.kind,'simulation');
});
test('en modo público no se ejecuta la rama IDOR vulnerable',async()=>{
 const mockDB={prepare(){throw new Error('Nunca debe usarse DB en modo público vulnerable')}};
 const res=await runLab({request:new Request('https://example.pages.dev/api/lab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic:'idor',mode:'vulnerable',fields:{actor:'ana',invoiceId:'202'}})}),env:{LAB_MODE:'local',LAB_DB:mockDB}});
 assert.equal((await res.json()).kind,'simulation');
});
test('PBKDF2 respeta el máximo de 100.000 iteraciones de Cloudflare Workers',async()=>{
 const original=crypto.subtle.deriveBits.bind(crypto.subtle);let used=0;
 crypto.subtle.deriveBits=(algo,...rest)=>{used=algo.iterations;return original(algo,...rest)};
 try{await runLab({request:body('hash','protected',{password:'x'}),env:{}});}finally{crypto.subtle.deriveBits=original}
 assert.ok(used>0&&used<=100000,`iteraciones usadas: ${used}`);
});
test('rechaza cuerpos grandes aunque no envíen Content-Length',async()=>{
 const big=JSON.stringify({topic:'hash',mode:'protected',fields:{password:'x'.repeat(5000)}});
 const stream=new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(big));c.close()}});
 const res=await runLab({request:new Request('http://localhost/api/lab',{method:'POST',body:stream,duplex:'half'}),env:{}});
 assert.equal(res.status,413);
});
test('JSON malformado responde 400',async()=>{
 const res=await runLab({request:new Request('http://localhost/api/lab',{method:'POST',body:'{oops'}),env:{}});
 assert.equal(res.status,400);
});
test('rate limiting limpia contadores vencidos y bloquea tras 4 intentos',async()=>{
 const rows=new Map();const sql=[];
 const mockDB={prepare(q){sql.push(q);return{bind:(...a)=>({run:async()=>{for(const [k,v] of rows) if(v.resets_at<a[0]) rows.delete(k)},
  first:async()=>{const [bucket,end,now]=a;const r=rows.get(bucket);const n=!r||r.resets_at<=now?{attempts:1,resets_at:end}:{attempts:r.attempts+1,resets_at:r.resets_at};rows.set(bucket,n);return n}})}}};
 let last;for(let i=0;i<5;i++) last=await runLab({request:body('rate','protected',{client:'student_abcdef123456'}),env:{LAB_DB:mockDB}});
 assert.equal(last.status,429);assert.ok(sql.some(q=>/DELETE FROM demo_limits/.test(q)));
});
