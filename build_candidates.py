"""2026 candidates for the tracker's district views (docs/candidates.json), from district_lean/candidates.csv
(Chamber, District, First, Last, Incumbent I/N, Party), the same list the district lean widget uses.

Usage:
    python build_candidates.py

Output: {"cd": {"CD 1": [["Don Davis", "D", 1], ["Laurie Buckhout", "R", 0], ...]}, "hd": {...}, "sd": {...}}
with 1 marking the incumbent, Democrats then Republicans then others.
"""
import json

import pandas as pd

CH = {'Congress': ('cd', 'CD'), 'NC House': ('hd', 'HD'), 'House': ('hd', 'HD'), 'NC Senate': ('sd', 'SD'), 'Senate': ('sd', 'SD')}
ORDER = 'DRLGI'


def main():
    c = pd.read_csv('district_lean/candidates.csv', dtype=str, keep_default_na=False)
    out = {'cd': {}, 'hd': {}, 'sd': {}}
    for x in c.itertuples():
        g, pre = CH[x.Chamber]
        out[g].setdefault(f'{pre} {int(x.District)}', []).append([(x.First + ' ' + x.Last).strip(), x.Party, 1 if x.Incumbent == 'I' else 0])
    for g in out:
        for v in out[g].values():
            v.sort(key=lambda q: (ORDER.index(q[1]) if q[1] in ORDER else 9, q[0]))
    with open('docs/candidates.json', 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    print({g: len(v) for g, v in out.items()})


if __name__ == '__main__':
    main()
