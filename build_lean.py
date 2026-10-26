"""Static inputs for the district lean widget (docs/lean.json): each district's predicted lean (COS-No-Gov), its
candidates, its main counties, and its 2022 early and mail votes on today's lines, for comparing with the same point in 2022.

Usage:
    python build_lean.py

Inputs: district_lean/cos_no_gov.csv (Chamber, District, cos_no_gov: the average Democratic two-party share in the nine 2024
Council of State races other than governor, minus the statewide average; positive = Democratic), district_lean/candidates.csv
(Chamber, District, First, Last, Incumbent I/N, Party), docs/baseline_districts.json and docs/baseline.json (2022 on today's
lines), docs/pct.json (counties in each district). The 2026 numbers come from docs/data.json, read by the widget each day.

Output: {"k0": -14, "ev": {"2026": "2026-10-15"}, "st22": {"p": [[DEM by day], [REP], [all]], "lp": [[...], [...], [...]], "rp": [...]},
 "ch": {"hd": {"1": {"lean": -13.9, "cty": [...], "cand": [["Name", "R", 1], ...], "p": ..., "lp": ..., "rp": [...]}}}}
where the day arrays run from k0 (14 days before early voting) as in baseline.json, and rp is registration [DEM, REP, all].
Counts only.
"""
import json

import pandas as pd

CH = {'NC House': 'hd', 'NC Senate': 'sd', 'Congress': 'cd', 'House': 'hd', 'Senate': 'sd'}


def series(p):   # [[DEM], [REP], [all]] by day
    n = len(p['p'][0])
    return [p['p'][0], p['p'][1], [sum(x[i] for x in p['p']) for i in range(n)]]


def lpser(p):
    n = len(p['lp'][0])
    return [p['lp'][0], p['lp'][1], [p['lp'][0][i] + p['lp'][1][i] + p['lp'][2][i] for i in range(n)]]


def main():
    B = json.load(open('docs/baseline_districts.json'))['2022']
    S = json.load(open('docs/baseline.json'))['2022']['places']['North Carolina']
    P = json.load(open('docs/pct.json'))['reg']
    lean = pd.read_csv('district_lean/cos_no_gov.csv')
    cand = pd.read_csv('district_lean/candidates.csv')
    cnt = {g: {} for g in ('cd', 'hd', 'sd')}
    for cty, ps in P.items():
        for v in ps.values():
            if not v[7]:
                continue
            for j, g in enumerate(('cd', 'hd', 'sd')):
                if v[7][j] is not None:
                    d = cnt[g].setdefault(str(v[7][j]), {})
                    d[cty] = d.get(cty, 0) + v[0]
    out = {'k0': B['k0'], 'ev': {'2022': B['ev_start'], '2026': '2026-10-15'},
           'st22': {'p': series(S), 'lp': lpser(S), 'rp': [S['rp'][0], S['rp'][1], sum(S['rp'])]}, 'ch': {'hd': {}, 'sd': {}, 'cd': {}}}
    for _, r in lean.iterrows():
        g, d = CH[r.Chamber], int(r.District)
        b = B['districts'][g][g.upper() + ' ' + str(d)]
        cs = cnt[g].get(str(d), {})
        cc = cand[(cand.Chamber.map(CH) == g) & (cand.District == d)]
        out['ch'][g][str(d)] = {
            'lean': round(float(r.cos_no_gov), 2),
            'cty': sorted(cs, key=lambda k: -cs[k])[:3],
            'cand': [[(x.First + ' ' + x.Last).strip(), x.Party, 1 if x.Incumbent == 'I' else 0] for x in cc.itertuples()],
            'p': series(b), 'lp': lpser(b), 'rp': [b['rp'][0], b['rp'][1], sum(b['rp'])]}
    with open('docs/lean.json', 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    print({g: len(v) for g, v in out['ch'].items()})


if __name__ == '__main__':
    main()
