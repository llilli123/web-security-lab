/** Inspector real de cabeceras de una respuesta de Pages Functions. */
export function onRequestGet({request}) {
  const isHttps = new URL(request.url).protocol === 'https:';
  const headers = new Headers({
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'strict-origin-when-cross-origin',
    'X-Frame-Options':'DENY',
    'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'"
  });
  if(isHttps) headers.set('Strict-Transport-Security','max-age=31536000');
  return new Response(JSON.stringify({
    real: true,
    message:'Inspecciona estas cabeceras en DevTools > Network > /api/headers.',
    headers: Object.fromEntries(['content-security-policy','x-content-type-options','referrer-policy','x-frame-options','permissions-policy','strict-transport-security'].map(k=>[k,headers.get(k) || '(solo HTTPS)']))
  }), {headers});
}
