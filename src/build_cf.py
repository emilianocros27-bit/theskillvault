import pathlib, hashlib, base64, re, sys
B = pathlib.Path('build'); page = (B/'page.html').read_text(); esc = lambda t: t.replace('</script', '<\\/script')
def sri(p): return 'sha384-' + base64.b64encode(hashlib.sha384((B/p).read_bytes()).digest()).decode()
tags = ''.join(f'<script src="https://cdn.jsdelivr.net/npm/{pkg}@18.3.1/umd/{f}" integrity="{sri("node_modules/"+pkg+"/umd/"+f)}" crossorigin="anonymous" referrerpolicy="no-referrer"></script>\n' for pkg, f in [('react', 'react.production.min.js'), ('react-dom', 'react-dom.production.min.js')])
i = page.index('/*APP_BUNDLE*/'); a = page.rindex('<script', 0, i); page = page[:a] + tags + page[a:]
out = page.replace('/*APP_BUNDLE*/', esc((B/'app-ext.js').read_text())).replace('/*D3_BUNDLE*/', esc((B/'d3lite.js').read_text())).replace('/*ICONS_BUNDLE*/', esc((B/'icons.js').read_text()))
out = out.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
out = '<!doctype html>\n<html lang="es">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="description" content="Colección de skills para Claude por categoría, con ejemplos y packs para copiar.">\n' + out
for png in pathlib.Path('src/ejemplos-png').glob('*.png'): out = out.replace(f'ejemplos/{png.stem}.png', f'ejemplos/{png.stem}.webp')
out = re.sub(r'ejemplos/pptx-\$\{([^}]*)\}\.png', r'ejemplos/pptx-${\1}.webp', out)
assert '.png' not in re.sub(r'https?://\S+', '', ' '.join(re.findall(r'ejemplos/\S+', out)))
pathlib.Path(sys.argv[1]).write_text(out); print('ok', len(out))
