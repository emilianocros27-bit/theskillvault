// Worker publicado en Cloudflare: sirve los archivos de public/ desde este repo.
const ORIGIN = 'https://raw.githubusercontent.com/emilianocros27-bit/theskillvault/main/public';
const TYPES = { html: 'text/html; charset=utf-8', webp: 'image/webp', png: 'image/png', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', svg: 'image/svg+xml', ico: 'image/x-icon', txt: 'text/plain; charset=utf-8' };
const SEC = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000'
};
const notFound = () => new Response('No encontrado', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', ...SEC } });

export default {
  async fetch(req) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Método no permitido', { status: 405, headers: { Allow: 'GET, HEAD', ...SEC } });
    const url = new URL(req.url);
    let p;
    try { p = decodeURIComponent(url.pathname); } catch { return notFound(); }
    if (p.endsWith('/')) p += 'index.html';
    if (!/^\/[A-Za-z0-9][A-Za-z0-9._-]*(\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/.test(p) || p.includes('..')) return notFound();
    const type = TYPES[p.split('.').pop().toLowerCase()];
    if (!type) return notFound();
    const up = await fetch(ORIGIN + p, { cf: { cacheTtl: 300, cacheEverything: true } });
    if (!up.ok) return notFound();
    const headers = { 'Content-Type': type, 'Cache-Control': 'public, max-age=300', ...SEC };
    return new Response(req.method === 'HEAD' ? null : up.body, { headers });
  }
};
