"""Past turnout by voting method, for the tracker's "Election Day in past years" section (docs/edhist.json).

Run once (the past elections don't change):
    python -I build_ed_history.py 2018 <history_stats_20181106.zip> 2020 <history_stats_20201103.zip> \
                                  2022 <history_stats_20221108.zip> 2024 <history_stats_20241105.zip>

The history_stats files are the State Board's final turnout counts by county, precinct, party and voting method:
https://s3.amazonaws.com/dl.ncsbe.gov/ENRS/<yyyy_mm_dd>/history_stats_<yyyymmdd>.zip

Methods:
  * Election Day: in person (V), curbside (C), provisional (P) and transfer (T), the tracker's definition.
  * Early in person: one-stop (O, EV) and one-stop curbside (U, EC).
  * Mail: absentee by mail (M), and the odd absentee (A).

Output: {"years": {"2022": {"state": [[ED D, R, U, other], [early ...], [mail ...]],
                            "county": {"Wake": [...]}, "cd": {"CD 1": [...]}, "hd": {...}, "sd": {...}}}}
Districts are today's lines: each precinct of that year is placed in the district that holds most of its voters,
using docs/precinct_xwalk.json (build_district_xwalk.py). Counts only.
"""
import json
import sys
import zipfile

import pandas as pd

from ncsbe import COUNTY_NAME

METHOD = {'V': 0, 'C': 0, 'P': 0, 'T': 0, 'O': 1, 'EV': 1, 'U': 1, 'EC': 1, 'M': 2, 'A': 2}
PARTIES = ['DEM', 'REP', 'UNA']
KINDS = (('cd', 'CD'), ('hd', 'HD'), ('sd', 'SD'))


def read(path):
    with zipfile.ZipFile(path) as zf:
        d = pd.read_csv(zf.open(zf.namelist()[0]), sep='\t', dtype=str, encoding='latin-1', keep_default_na=False,
                        usecols=['county_desc', 'precinct_abbrv', 'party_cd', 'voting_method', 'total_voters'])
    d['n'] = pd.to_numeric(d.total_voters, errors='coerce').fillna(0).astype(int)
    m = d.voting_method.str.strip().map(METHOD)
    if m.isna().any():
        raise SystemExit(f'STOPPING: unknown voting methods in {path}: {sorted(set(d.voting_method[m.isna()]))}')
    d['m'] = m.astype(int)
    d['p'] = d.party_cd.str.strip().map({p: i for i, p in enumerate(PARTIES)}).fillna(3).astype(int)
    d['key'] = d.county_desc.str.strip().str.upper() + '|' + d.precinct_abbrv.str.strip()
    return d[['county_desc', 'key', 'm', 'p', 'n']]


def block(s):
    t = s.groupby(['m', 'p']).n.sum()
    return [[int(t.get((m, p), 0)) for p in range(4)] for m in range(3)]


def main():
    a = sys.argv[1:]
    xw = json.load(open('docs/precinct_xwalk.json'))
    out = {'years': {}}
    for label, path in zip(a[::2], a[1::2]):
        d = read(path)
        pct = {k: v[:3] for k, v in xw[label].items()}
        y = {'state': block(d), 'county': {COUNTY_NAME.get(c, c.title()): block(s) for c, s in d.groupby('county_desc')}}
        placed = d.key.map(pct)
        for i, (kind, pre) in enumerate(KINDS):
            d[kind] = placed.map(lambda v, i=i: v[i] if isinstance(v, list) else None)
            y[kind] = {f'{pre} {int(n)}': block(s) for n, s in d.dropna(subset=[kind]).groupby(kind)}
        out['years'][label] = y
        st = y['state']
        print(f"{label}: {sum(map(sum, st)):,} votes; Election Day {sum(st[0]):,}; early {sum(st[1]):,}; mail {sum(st[2]):,}; "
              f"{len(y['county'])} counties; placed in today's districts {d.n[d.cd.notna()].sum() / d.n.sum():.2%}")
    with open('docs/edhist.json', 'w') as f:
        json.dump(out, f, separators=(',', ':'))


if __name__ == '__main__':
    main()
