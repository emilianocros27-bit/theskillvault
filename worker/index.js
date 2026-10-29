// Worker publicado en Cloudflare: sirve los archivos de public/ desde este repo.
const ORIGIN = 'https://raw.githubusercontent.com/emilianocros27-bit/theskillvault/main/public';
const TYPES = { html: 'text/html; charset=utf-8', webp: 'image/webp', png: 'image/png', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', svg: 'image/svg+xml', ico: 'image/x-icon', txt: 'text/plain; charset=utf-8', json: 'application/json; charset=utf-8' };
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
    if (new URL(req.url).pathname === '/mcp') return mcp(req);
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

// ---------- MCP (Streamable HTTP, sin estado, solo lectura) ----------
// Conector para Claude en https://theskillvault.emicros.workers.dev/mcp. El catálogo sale de public/skills.json
// (lo genera src/export_skills.py), así que las skills nuevas aparecen aquí sin volver a subir el Worker.
const VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const RO = { readOnlyHint: true, openWorldHint: false };
const TOOLS = [
  { name: 'listar_carpetas', title: 'Listar carpetas',
    description: 'Lista las carpetas (categorías) de The Skill Vault con su descripción y cuántas skills tiene cada una.',
    inputSchema: { type: 'object', properties: {} }, annotations: RO },
  { name: 'buscar_skills', title: 'Buscar skills',
    description: 'Busca skills para Claude en The Skill Vault por texto (nombre, autor o para qué sirve) y/o por carpeta. Sin argumentos devuelve todas. Cada resultado trae el comando para instalarla.',
    inputSchema: { type: 'object', properties: {
      texto: { type: 'string', description: 'Palabras a buscar, por ejemplo "excel", "animación" o "roblox".' },
      carpeta: { type: 'string', description: 'Id o nombre de la carpeta, por ejemplo "web" o "Diseño web". Usa listar_carpetas para verlas.' } } },
    annotations: RO },
  { name: 'ver_skill', title: 'Ver skill',
    description: 'Devuelve los datos de una skill y el contenido completo de su SKILL.md, leído de su repositorio en GitHub.',
    inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'Id de la skill, por ejemplo "frontend-design".' } }, required: ['id'] },
    annotations: { readOnlyHint: true, openWorldHint: true } }
];
const norm = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const text = (v, isError) => ({ content: [{ type: 'text', text: typeof v === 'string' ? v : JSON.stringify(v, null, 1) }], ...(isError ? { isError: true } : {}) });
const json = (body, status = 200) => new Response(body == null ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...SEC } });

async function catalog() {
  const r = await fetch(ORIGIN + '/skills.json', { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!r.ok) throw new Error('No se pudo leer el catálogo');
  return r.json();
}

async function callTool(name, a = {}) {
  const { carpetas, skills } = await catalog();
  const cname = id => (carpetas.find(c => c.id === id) || {}).nombre;
  if (name === 'listar_carpetas') return text(carpetas);
  if (name === 'buscar_skills') {
    let list = skills;
    if (a.carpeta) {
      const c = carpetas.find(c => norm(c.id) === norm(a.carpeta) || norm(c.nombre) === norm(a.carpeta));
      if (!c) return text(`No existe la carpeta "${a.carpeta}". Carpetas: ${carpetas.map(c => `${c.id} (${c.nombre})`).join(', ')}`, true);
      list = list.filter(s => s.carpeta === c.id);
    }
    const words = norm(a.texto).split(/\s+/).filter(Boolean);
    if (words.length) list = list.filter(s => { const h = norm([s.id, s.autor, s.descripcion, cname(s.carpeta)].join(' ')); return words.every(w => h.includes(w)); });
    if (!list.length) return text('Sin resultados. Prueba con otras palabras o con listar_carpetas.');
    return text(list.map(s => ({ id: s.id, carpeta: cname(s.carpeta), autor: s.autor, descripcion: s.descripcion, instalar: s.instalar })));
  }
  if (name === 'ver_skill') {
    const s = skills.find(s => norm(s.id) === norm(a.id));
    if (!s) return text(`No existe la skill "${a.id}". Usa buscar_skills para encontrarla.`, true);
    const r = await fetch(s.skill_md, { cf: { cacheTtl: 3600, cacheEverything: true } });
    const md = r.ok ? (await r.text()).slice(0, 100000) : `(No se pudo leer el SKILL.md: HTTP ${r.status})`;
    const { skill_md, ...meta } = s;
    return text(`${JSON.stringify({ ...meta, carpeta: cname(s.carpeta), skill_md }, null, 1)}\n\n---- SKILL.md ----\n${md}`);
  }
  return null;
}

async function rpc(m) {
  if (!m || m.jsonrpc !== '2.0' || typeof m.method !== 'string') return { jsonrpc: '2.0', id: m?.id ?? null, error: { code: -32600, message: 'Solicitud inválida' } };
  if (m.id === undefined) return null; // notificación
  const ok = result => ({ jsonrpc: '2.0', id: m.id, result });
  const p = m.params || {};
  switch (m.method) {
    case 'initialize':
      return ok({ protocolVersion: VERSIONS.includes(p.protocolVersion) ? p.protocolVersion : VERSIONS[1],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'theskillvault', title: 'The Skill Vault', version: '1.0.0' },
        instructions: 'Catálogo de skills para Claude agrupadas por carpeta. Usa buscar_skills para encontrar una y ver_skill para leer su SKILL.md completo.' });
    case 'ping': return ok({});
    case 'tools/list': return ok({ tools: TOOLS });
    case 'tools/call': {
      try {
        const r = await callTool(p.name, p.arguments);
        return r ? ok(r) : { jsonrpc: '2.0', id: m.id, error: { code: -32602, message: `Herramienta desconocida: ${p.name}` } };
      } catch (e) { return ok(text(String(e.message || e), true)); }
    }
    default: return { jsonrpc: '2.0', id: m.id, error: { code: -32601, message: `Método no encontrado: ${m.method}` } };
  }
}

async function mcp(req) {
  if (req.method !== 'POST') return new Response('Usa POST', { status: 405, headers: { Allow: 'POST', ...SEC } });
  let body;
  try { body = await req.json(); } catch { return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON inválido' } }, 400); }
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map(rpc))).filter(Boolean);
    return out.length ? json(out) : json(null, 202);
  }
  const out = await rpc(body);
  return out ? json(out) : json(null, 202);
}
