import pathlib
from playwright.sync_api import sync_playwright
C = pathlib.Path('public'); P5 = pathlib.Path('src/node_modules/p5/lib/p5.min.js').read_bytes()
def route(r):
    u = r.request.url
    if u.startswith('https://cdn.jsdelivr.net/npm/'):
        rel = u.split('/npm/')[1]; pkg, rest = rel.split('@', 1) if not rel.startswith('@') else (rel, ''); path = rest.split('/', 1)[1]
        return r.fulfill(body=pathlib.Path('src/node_modules/'+pkg+'/'+path).read_bytes(), headers={'content-type': 'application/javascript', 'access-control-allow-origin': '*'})
    if u.startswith('https://site.test/'):
        p = u.split('site.test/')[1].split('?')[0] or 'index.html'; f = C / p
        if f.exists(): return r.fulfill(body=f.read_bytes(), content_type={'html': 'text/html', 'webp': 'image/webp'}[f.suffix[1:]])
        return r.fulfill(status=404)
    return r.abort()
with sync_playwright() as p:
    b = p.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1280, 'height': 900}); pg.on('pageerror', lambda e: errs.append(str(e))); pg.route('**/*', route)
    pg.goto('https://site.test/'); pg.wait_for_timeout(2000); pg.screenshot(path='/tmp/cf_top.png')
    ids = pg.evaluate("[...document.querySelectorAll('.grid .pick')].map(b=>b.dataset.skill)"); bad = []
    for sid in ['algorithmic-art', 'canvas-design', 'docx', 'pptx', 'xlsx', 'matplotlib', 'seaborn']:
        pg.locator(f'.grid .pick[data-skill="{sid}"]').click(); pg.wait_for_timeout(500)
        n = pg.evaluate("[...document.querySelectorAll('#dStage img')].filter(i=>!i.complete||!i.naturalWidth).length")
        if n: bad.append(sid)
        if sid == 'algorithmic-art': pg.screenshot(path='/tmp/cf_alg.png')
        pg.locator('#dClose').click()
    v = b.new_page(); v.on('pageerror', lambda e: errs.append(str(e))); v.route('**/*', route)
    v.goto('https://site.test/ejemplos/vapor.html'); v.wait_for_timeout(1500)
    print('folders', pg.locator('.gf-root').count(), 'skills', len(ids), 'broken', bad, 'p5', v.evaluate('typeof p5'), 'canvas', v.locator('canvas').count(), 'errors', errs)
    b.close()
