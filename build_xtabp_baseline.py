"""Past-year comparison for the Turnout Tracker's crosstabs, split by party (docs/xtabp<year>.json). Run once per year.

Usage:
    HISTORY_FILE=<extended lookup.pkl.gz> python build_xtabp_baseline.py 2022 <absentee_20221108.csv> <VR_Snapshot_20221108.zip>
    (and the same for 2018, 2020 and 2024; the extended lookup adds 2012 and 2014, see build_tier_baseline.py)

The same cells as build_xtab_baseline.py (race x age x propensity, 32 cells), once for each party: index
party * 32 + ((race * 4) + age) * 2 + (0 low, 1 regular), parties DEM, REP, UNA (registration at the time).
Statewide and for each county ('places'), and for today's districts ('districts'), placed through each voter's precinct
at the time with docs/precinct_xwalk.json, as in build_xtab_baseline.py. Days 0 to 16 of early voting only (the crosstabs
aren't shown after that). Counts only:
  * v[k]: accepted early and mail voters so far at the end of day k of early voting, in the 96 cells
  * r:    registered voters (active and inactive) on that Election Day, from the State Board's snapshot
"""
import io
import json
import os
import sys
import zipfile

import pandas as pd

from ncsbe import COUNTY_NAME, race_code

XT_RACES = ['B', 'O', 'A', 'W']
PARTIES = {'DEM': 0, 'REP': 1, 'UNA': 2}
_h = os.environ.pop('HISTORY_FILE', None)   # build_baselines would load the lookup a second time on import
from build_baselines import PRIOR, SKIP, YEARS as EV_STARTS  # noqa: E402
if _h:
    os.environ['HISTORY_FILE'] = _h
KS = list(range(0, 17))


def counts(series, n):
    c = series.dropna().astype(int).value_counts()
    return [int(c.get(i, 0)) for i in range(n)]


def main():
    label, absentee, snap = sys.argv[1], sys.argv[2], sys.argv[3]
    EV_START = pd.Timestamp(EV_STARTS[label])
    H = pd.read_pickle(os.environ['HISTORY_FILE']).b

    def low(ids):   # the same rule as build_baselines.py
        b = ids.map(H).fillna(0).astype(int)
        lo = sum(((b & x) > 0).astype(int) for x in PRIOR[label]) <= 1
        if SKIP[label]:
            lo |= (b & SKIP[label][0]) == SKIP[label][1]
        return lo

    def cell(df):
        ri = df.race.map({x: i for i, x in enumerate(XT_RACES)})
        ai = pd.cut(pd.to_numeric(df.age, errors='coerce'), [17, 25, 40, 65, 200], labels=False)
        return df.party.map(PARTIES) * 32 + (ri * 4 + ai) * 2 + (~df.low).astype(int)

    a = pd.read_csv(absentee, encoding='iso-8859-1', dtype=str, keep_default_na=False,
                    usecols=['ncid', 'county_desc', 'voter_party_code', 'race', 'age', 'ballot_req_type', 'ballot_rtn_dt', 'ballot_rtn_status'])
    a = a[a.ballot_rtn_status.str.upper().str.startswith('ACCEPTED')].copy()
    a['ev'] = a.ballot_req_type.str.upper().isin(['ONE-STOP', 'EARLY VOTING']).astype(int)
    a['when'] = pd.to_datetime(a.ballot_rtn_dt, format='%m/%d/%Y', errors='coerce')
    a = a.sort_values(['ev', 'when'], ascending=[False, False]).drop_duplicates('ncid')
    a['k'] = (a.when - EV_START).dt.days
    a = a[a.k <= KS[-1]]
    a['race'] = a.race.map({x: race_code(x) for x in a.race.unique()})
    a['party'] = a.voter_party_code.str.strip()
    a['low'] = low(a.ncid)
    a['x'] = cell(a)
    a = a[['ncid', 'county_desc', 'k', 'x']]

    parts = []
    with zipfile.ZipFile(snap) as z, z.open(z.namelist()[0]) as fb:
        enc = 'utf-16' if fb.peek(2)[:2] in (b'\xff\xfe', b'\xfe\xff') else 'latin-1'
        for ch in pd.read_csv(io.TextIOWrapper(fb, encoding=enc), sep='\t', dtype=str, keep_default_na=False, chunksize=1_000_000,
                              usecols=['county_desc', 'ncid', 'status_cd', 'party_cd', 'race_code', 'age', 'precinct_abbrv']):
            ch = ch.apply(lambda c: c.str.strip())
            parts.append(ch[ch.status_cd.isin(['A', 'I'])])
    r = pd.concat(parts).drop_duplicates('ncid')
    del parts
    r['race'] = r.race_code.map({x: race_code(x) for x in r.race_code.unique()})
    r['party'] = r.party_cd
    r['low'] = low(r.ncid)
    r['x'] = cell(r).astype('float32')
    r = r[['ncid', 'county_desc', 'precinct_abbrv', 'x']].astype({'county_desc': 'category', 'precinct_abbrv': 'category'})   # keeps memory down

    def place(av, rv):
        return {'v': [counts(av.x[av.k <= k], 96) for k in KS], 'r': counts(rv.x, 96)}

    out = {'ev_start': EV_STARTS[label], 'places': {'North Carolina': place(a, r)}, 'districts': {}}
    rg = dict(tuple(r.groupby('county_desc', observed=True)))
    for c, g in a.groupby('county_desc'):
        rv = rg.get(c, rg.get(c.upper()))
        if rv is not None:
            out['places'][COUNTY_NAME.get(c.upper(), c.title())] = place(g, rv)
    del rg

    # Today's districts, through each voter's precinct at the time; ballots follow their voter
    xw = json.load(open('docs/precinct_xwalk.json'))[label]
    key = (r.county_desc.astype(str).str.upper() + '|' + r.precinct_abbrv.astype(str)).astype('category')
    rd = pd.DataFrame({'x': r.x.values}, index=r.ncid.values)
    for i, kind in enumerate(('cd', 'hd', 'sd')):
        rd[kind] = key.map({k: v[i] for k, v in xw.items()}).astype('float32').values
    del key, r
    ad = a[['ncid', 'k', 'x']].join(rd[['cd', 'hd', 'sd']], on='ncid')
    for kind, pre in (('cd', 'CD'), ('hd', 'HD'), ('sd', 'SD')):
        rgd = dict(tuple(rd.dropna(subset=[kind]).groupby(kind)))
        out['districts'][kind] = {f'{pre} {int(n)}': place(g, rgd[n]) for n, g in ad.dropna(subset=[kind]).groupby(kind) if n in rgd}

    st = out['places']['North Carolina']
    print(f"{label}: day 10 voters in cells {sum(st['v'][10]):,}; registered {sum(st['r']):,}; counties {len(out['places']) - 1}; "
          + ', '.join(k + ' ' + str(len(v)) for k, v in out['districts'].items()))
    with open(f'docs/xtabp{label}.json', 'w') as f:
        json.dump(out, f, separators=(',', ':'))


if __name__ == '__main__':
    main()
