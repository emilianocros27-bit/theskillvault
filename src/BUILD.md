# Cómo editar y publicar

Fuente: `src/page.html` (plantilla con `/*APP_BUNDLE*/`, `/*D3_BUNDLE*/`, `/*ICONS_BUNDLE*/`).
Publicado: `public/index.html` (lo sirve el Worker de Cloudflare `theskillvault`, ~5 min de caché).

```bash
cd src && npm install
# bundles (solo si cambias iconos o el componente de carpetas)
npx esbuild icons-entry.js --bundle --minify --format=iife --target=es2019 --outfile=icons.js
npx esbuild app-entry-ext.tsx --bundle --minify --format=iife --target=es2019 --alias:react=./shim-react.js --alias:react-dom/client=./shim-rdc.js --outfile=app-ext.js
npx esbuild d3-entry.js --bundle --minify --format=iife --target=es2019 --outfile=d3lite.js
cd .. && python3 src/build_cf.py public/index.html   # arma la página final
python3 src/test_page.py                              # prueba con Playwright
git add -A && git commit -m "..." && git push         # se publica solo
```

Datos en `page.html`: `CATS` (carpetas: id, name, color, line, art), `ORDER`, `SKILLS` vía `S(id, cat, autor, dónde, repo, ruta, comando, descripción)`, `MODES` (lee/parcial/codigo), `CAT_ICON` (iconos animados de Lucide), `EX` (ejemplo de cada hoja), `INIT` (interactividad). Máximo 5 skills por carpeta. Ejemplos con la marca ficticia "Lumbre".
Iconos nuevos: agregarlos al import de `icons-entry.js` y recompilar.
`urls.txt`: enlaces raw de cada SKILL.md (verificar 200 al agregar skills).
