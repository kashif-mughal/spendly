import json, os
D = '/Users/avanza/Documents/Kashif/house-expense-manager/data'
names = ['settings','lists','categories','accounts','templates','budget','transactions']
out = ["/* AUTO-GENERATED from data/*.json - do not edit by hand.",
       "   Lets the app run straight from the file system (file://), where fetch()",
       "   of local JSON is blocked. Regenerate with: python3 tools/build-seed.py */",
       "window.HEM_SEED = (function () {",
       "  'use strict';",
       "  return {"]
for i, n in enumerate(names):
    with open(os.path.join(D, n + '.json'), encoding='utf-8') as fh:
        data = json.load(fh)
    body = json.dumps(data, ensure_ascii=False, indent=2)
    body = '\n'.join(('    ' + line) if idx else line for idx, line in enumerate(body.split('\n')))
    out.append('    %s: %s%s' % (n, body, ',' if i < len(names) - 1 else ''))
out += ["  };", "}());", ""]
with open(os.path.join(D, 'seed.js'), 'w', encoding='utf-8') as fh:
    fh.write('\n'.join(out))
print('wrote data/seed.js', os.path.getsize(os.path.join(D,'seed.js')), 'bytes')
