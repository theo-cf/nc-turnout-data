"""Build a past-year comparison for the Turnout Tracker's shareable graphics (docs/xtab<year>.json). Run once per year.

Usage:
    HISTORY_FILE=<lookup.pkl.gz> python build_xtab_baseline.py 2022 <absentee_20221108.csv> <VR_Snapshot_20221108.zip>
    HISTORY_FILE=<lookup.pkl.gz> python build_xtab_baseline.py 2024 <absentee_20241105.csv> <VR_Snapshot_20241105.zip>
    python build_xtab_baseline.py 2018 <absentee_20181106_w_ethnicity.csv> <VR_Snapshot_20181106.zip>   (and 2020)

2018 and 2020 use the same propensity rule with longer lookbacks (2012 and 2014 history from an archived State Board
file). 2018's days are lined up by days before Election Day, as in build_baselines.py (day 0 is Thursday, Oct. 18, 2018).

Statewide and for each county, writes:
  * v[k]:  accepted early and mail voters so far at the end of day k of early voting (k = 0 is Oct. 20, 2022, the first
           day; k = 19 is Election Day), by race x age x propensity: index ((race * 4) + age) * 2 + (0 low, 1 regular),
           races Black, Other, Asian, White; ages 18-25, 26-40, 41-65, 66+.
  * pv[k]: the same voters by party x propensity: DEM low, DEM regular, REP low, REP regular, UNA low, UNA regular.
  * r, pr: registered voters (active and inactive) on Election Day 2022 in the same cells, from the State Board's
           registration snapshot.
Low-propensity in 2022: voted in 0 or 1 of the November 2016, 2018 and 2020 elections, or in 2016 and 2020 but not 2018.
Counts only.
"""
import io
import json
import os
import sys
import zipfile

import pandas as pd

from ncsbe import COUNTY_NAME, race_code

XT_RACES = ['B', 'O', 'A', 'W']
_h = os.environ.pop('HISTORY_FILE', None)   # build_baselines would load the lookup a second time on import
from build_baselines import PRIOR, SKIP, YEARS as EV_STARTS  # noqa: E402
if _h:
    os.environ['HISTORY_FILE'] = _h
KS = list(range(0, 20))


def low22(b):
    n3 = ((b & 1) > 0).astype(int) + ((b & 2) > 0) + ((b & 4) > 0)
    return (n3 <= 1) | ((b & 7) == 5)


def cells(df, age_col):
    reg = (~df.low).astype(int)
    ri = df.race.map({x: i for i, x in enumerate(XT_RACES)})
    ai = pd.cut(pd.to_numeric(df[age_col], errors='coerce'), [17, 25, 40, 65, 200], labels=False)
    df = df.assign(cell=(ri * 4 + ai) * 2 + reg, pc=df.party.map({'DEM': 0, 'REP': 2, 'UNA': 4}) + reg)
    return df


def counts(series, n):
    c = series.dropna().astype(int).value_counts()
    return [int(c.get(i, 0)) for i in range(n)]


def main():
    label, absentee, snap = sys.argv[1], sys.argv[2], sys.argv[3]
    EV_START = pd.Timestamp(EV_STARTS[label])
    H = pd.read_pickle(os.environ['HISTORY_FILE']).b if PRIOR[label] else None

    def low(ids):   # the same rule as build_baselines.py; years without enough history count everyone as regular
        if H is None:
            return pd.Series(False, index=ids.index)
        b = ids.map(H).fillna(0).astype(int)
        lo = sum(((b & x) > 0).astype(int) for x in PRIOR[label]) <= 1
        if SKIP[label]:
            lo |= (b & SKIP[label][0]) == SKIP[label][1]
        return lo
    a = pd.read_csv(absentee, encoding='iso-8859-1', dtype=str, keep_default_na=False,
                    usecols=['ncid', 'county_desc', 'voter_party_code', 'race', 'age', 'ballot_req_type', 'ballot_rtn_dt', 'ballot_rtn_status'])
    a = a[a.ballot_rtn_status.str.upper().str.startswith('ACCEPTED')].copy()
    a['ev'] = a.ballot_req_type.str.upper().isin(['ONE-STOP', 'EARLY VOTING']).astype(int)
    a['when'] = pd.to_datetime(a.ballot_rtn_dt, format='%m/%d/%Y', errors='coerce')
    a = a.sort_values(['ev', 'when'], ascending=[False, False]).drop_duplicates('ncid')
    a['k'] = (a.when - EV_START).dt.days
    a['race'] = a.race.map({x: race_code(x) for x in a.race.unique()})
    a['party'] = a.voter_party_code.str.strip()
    a['low'] = low(a.ncid)
    a = cells(a, 'age')

    parts = []
    with zipfile.ZipFile(snap) as z, z.open(z.namelist()[0]) as fb:
        enc = 'utf-16' if fb.peek(2)[:2] in (b'\xff\xfe', b'\xfe\xff') else 'latin-1'
        for ch in pd.read_csv(io.TextIOWrapper(fb, encoding=enc), sep='\t', dtype=str, keep_default_na=False, chunksize=1_000_000,
                              usecols=['county_desc', 'ncid', 'status_cd', 'party_cd', 'race_code', 'age', 'precinct_abbrv']):
            ch = ch.apply(lambda c: c.str.strip())
            parts.append(ch[ch.status_cd.isin(['A', 'I'])])
    r = pd.concat(parts).drop_duplicates('ncid')
    r['race'] = r.race_code.map({x: race_code(x) for x in r.race_code.unique()})
    r['party'] = r.party_cd
    r['low'] = low(r.ncid)
    r = cells(r, 'age')

    def place(av, rv):
        return {'v': [counts(av.cell[av.k <= k], 32) for k in KS], 'pv': [counts(av.pc[av.k <= k], 6) for k in KS],
                'r': counts(rv.cell, 32), 'pr': counts(rv.pc, 6)}

    out = {'ev_start': EV_STARTS[label], 'places': {'North Carolina': place(a, r)}}
    rg = dict(tuple(r.groupby('county_desc')))
    for c, g in a.groupby('county_desc'):
        rv = rg.get(c, rg.get(c.upper()))
        if rv is not None:
            out['places'][COUNTY_NAME.get(c.upper(), c.title())] = place(g, rv)
    st = out['places']['North Carolina']
    print(f"{label} statewide through day 2: {sum(st['v'][2]):,} voters in graphic cells; registered {sum(st['r']):,}; counties {len(out['places']) - 1}")
    with open(f'docs/xtab{label}.json', 'w') as f:
        json.dump(out, f, separators=(',', ':'))

    # The same for today's districts (docs/xtab_districts<year>.json): voters are placed through their precinct at the
    # time, using docs/precinct_xwalk.json (build_district_xwalk.py), and ballots follow their voter.
    import gc
    xw = json.load(open('docs/precinct_xwalk.json'))[label]
    key = (r.county_desc.str.upper() + '|' + r.precinct_abbrv).astype('category')
    r = pd.DataFrame({'cell': r.cell.astype('float32').values, 'pc': r.pc.astype('float32').values}, index=r.ncid.values)
    for i, kind in enumerate(('cd', 'hd', 'sd')):
        r[kind] = key.map({k: v[i] for k, v in xw.items()}).astype('float32').values
    del key
    a = a[['ncid', 'k', 'cell', 'pc']].join(r[['cd', 'hd', 'sd']], on='ncid')
    gc.collect()
    od = {'ev_start': EV_STARTS[label], 'districts': {}}
    for kind, pre in (('cd', 'CD'), ('hd', 'HD'), ('sd', 'SD')):
        rgd = dict(tuple(r.dropna(subset=[kind]).groupby(kind)))
        od['districts'][kind] = {f'{pre} {int(n)}': place(g, rgd[n]) for n, g in a.dropna(subset=[kind]).groupby(kind) if n in rgd}
    with open(f'docs/xtab_districts{label}.json', 'w') as f:
        json.dump(od, f, separators=(',', ':'))
    print(f"{label} districts: {', '.join(k + ' ' + str(len(v)) for k, v in od['districts'].items())}")


if __name__ == '__main__':
    main()
