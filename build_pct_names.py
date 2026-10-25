"""Precinct names for the tracker's search box (docs/pct_names.json): {County: {precinct code: State Board name, or "" when the
name is just the code}}, from the precinct shapes (docs/precincts/, build_precinct_shapes.py) and the precincts with registered
voters in docs/pct.json. Precinct lines and names change rarely, so this is run by hand after the shapes are rebuilt."""
import json
import os

P = json.load(open('docs/pct.json'))['reg']
out = {}
for f in sorted(os.listdir('docs/precincts')):
    c, names = f[:-5], json.load(open(os.path.join('docs/precincts', f)))['n']
    out[c] = {k: ('' if v == k else v) for k, v in names.items() if k in P.get(c, {})}
with open('docs/pct_names.json', 'w') as fh:
    json.dump(out, fh, separators=(',', ':'), sort_keys=True)
print(sum(len(v) for v in out.values()), 'precincts')
