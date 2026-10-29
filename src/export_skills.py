# Saca carpetas y skills de src/page.html a public/skills.json (lo lee el MCP del Worker).
import json, pathlib, re, sys
page = pathlib.Path('src/page.html').read_text()
Q = r"'((?:[^'\\]|\\.)*)'"
block = lambda name: page[page.index(f'const {name} = '):]

cats = {m[0]: {'id': m[0], 'nombre': m[1], 'descripcion': m[2]}
        for m in re.findall(r"\{ id: " + Q + r", name: " + Q + r", color: '[^']*', line: " + Q, block('CATS').split('];')[0])}
order = re.findall(Q, block('ORDER').split(';')[0])
modes_src = block('MODES').split('};')[0]
modes = dict(re.findall(Q + r":\s*" + Q, modes_src))
raw_over = dict(re.findall(Q + r":\s*" + Q, block('RAW').split('};')[0]))
MODE_TXT = {'lee': 'Funciona solo con leerla', 'parcial': 'Funciona a medias: usa scripts o archivos extra', 'codigo': 'Necesita ejecutar código'}

src = block('SKILLS').split('\n  ];')[0].replace("A, '", "'anthropics/skills', '")
skills = []
for f in re.findall(r"S\(" + r",\s*".join([Q] * 8) + r"\)", src):
    sid, cat, who, where, repo, path, cmd, desc = f
    skills.append({'id': sid, 'carpeta': cat, 'autor': who, 'donde': where, 'repo': f'https://github.com/{repo}',
                   'skill_md': raw_over.get(sid) or f"https://raw.githubusercontent.com/{repo}/main/{path + '/' if path else ''}SKILL.md",
                   'instalar': cmd, 'descripcion': desc, 'modo': MODE_TXT.get(modes.get(sid, ''), '')})

assert len(cats) == len(order), (len(cats), len(order))
assert all(s['carpeta'] in cats for s in skills)
assert len(skills) == len(re.findall(r"^\s*S\('", src, re.M)), 'alguna skill no se pudo leer'
data = {'carpetas': [dict(cats[c], skills=sum(s['carpeta'] == c for s in skills)) for c in order], 'skills': skills}
out = sys.argv[1] if len(sys.argv) > 1 else 'public/skills.json'
pathlib.Path(out).write_text(json.dumps(data, ensure_ascii=False, indent=1))
print('skills.json', len(data['carpetas']), 'carpetas,', len(skills), 'skills')
