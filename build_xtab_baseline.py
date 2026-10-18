"""Build the 2022 comparison for the Turnout Tracker's shareable graphics (docs/xtab2022.json). Run once.

Usage:
    HISTORY_FILE=<lookup.pkl.gz> python build_xtab_baseline.py <absentee_20221108.csv> <VR_Snapshot_20221108.zip>

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
EV_START = pd.Timestamp('2022-10-20')
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
    H = pd.read_pickle(os.environ['HISTORY_FILE']).b
    absentee, snap = sys.argv[1], sys.argv[2]
    a = pd.read_csv(absentee, encoding='iso-8859-1', dtype=str, keep_default_na=False,
                    usecols=['ncid', 'county_desc', 'voter_party_code', 'race', 'age', 'ballot_req_type', 'ballot_rtn_dt', 'ballot_rtn_status'])
    a = a[a.ballot_rtn_status.str.upper().str.startswith('ACCEPTED')].copy()
    a['ev'] = a.ballot_req_type.str.upper().isin(['ONE-STOP', 'EARLY VOTING']).astype(int)
    a['when'] = pd.to_datetime(a.ballot_rtn_dt, format='%m/%d/%Y', errors='coerce')
    a = a.sort_values(['ev', 'when'], ascending=[False, False]).drop_duplicates('ncid')
    a['k'] = (a.when - EV_START).dt.days
    a['race'] = a.race.map({x: race_code(x) for x in a.race.unique()})
    a['party'] = a.voter_party_code.str.strip()
    a['low'] = low22(a.ncid.map(H).fillna(0).astype(int))
    a = cells(a, 'age')

    parts = []
    with zipfile.ZipFile(snap) as z, z.open(z.namelist()[0]) as fb:
        enc = 'utf-16' if fb.peek(2)[:2] in (b'\xff\xfe', b'\xfe\xff') else 'latin-1'
        for ch in pd.read_csv(io.TextIOWrapper(fb, encoding=enc), sep='\t', dtype=str, keep_default_na=False, chunksize=1_000_000,
                              usecols=['county_desc', 'ncid', 'status_cd', 'party_cd', 'race_code', 'age']):
            ch = ch.apply(lambda c: c.str.strip())
            parts.append(ch[ch.status_cd.isin(['A', 'I'])])
    r = pd.concat(parts).drop_duplicates('ncid')
    r['race'] = r.race_code.map({x: race_code(x) for x in r.race_code.unique()})
    r['party'] = r.party_cd
    r['low'] = low22(r.ncid.map(H).fillna(0).astype(int))
    r = cells(r, 'age')

    def place(av, rv):
        return {'v': [counts(av.cell[av.k <= k], 32) for k in KS], 'pv': [counts(av.pc[av.k <= k], 6) for k in KS],
                'r': counts(rv.cell, 32), 'pr': counts(rv.pc, 6)}

    out = {'ev_start': '2022-10-20', 'places': {'North Carolina': place(a, r)}}
    rg = dict(tuple(r.groupby('county_desc')))
    for c, g in a.groupby('county_desc'):
        rv = rg.get(c, rg.get(c.upper()))
        if rv is not None:
            out['places'][COUNTY_NAME.get(c.upper(), c.title())] = place(g, rv)
    st = out['places']['North Carolina']
    print(f"2022 statewide through day 2: {sum(st['v'][2]):,} voters in graphic cells; registered {sum(st['r']):,}; counties {len(out['places']) - 1}")
    with open('docs/xtab2022.json', 'w') as f:
        json.dump(out, f, separators=(',', ':'))


if __name__ == '__main__':
    main()
