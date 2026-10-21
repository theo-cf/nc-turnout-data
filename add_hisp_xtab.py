"""Add Hispanic or Latino voters by propensity to a past year's docs/xtab<year>.json, for the county map's race views.

Usage:
    HISTORY_FILE=<lookup with 2012-2024 history> python add_hisp_xtab.py 2022 <absentee_20221108.csv> <VR_Snapshot_20221108.zip>
    (and 2018 with absentee_20181106_w_ethnicity.csv, 2020, 2024)

Adds, statewide and for each county (the same places as build_xtab_baseline.py):
  * hv[k]: Hispanic or Latino early and mail voters so far at the end of day k of early voting: [low-propensity, regular].
  * hr:    Hispanic or Latino registered voters (active and inactive) on Election Day that year: [low-propensity, regular].
Hispanic or Latino is the ethnicity question on the registration form, not race. The propensity rule is build_baselines.py's.
Counts only.
"""
import io
import json
import os
import sys
import zipfile

import pandas as pd

from ncsbe import COUNTY_NAME, eth_code

_h = os.environ.pop('HISTORY_FILE', None)   # build_baselines would load the lookup a second time on import
from build_baselines import PRIOR, SKIP, YEARS as EV_STARTS  # noqa: E402
if _h:
    os.environ['HISTORY_FILE'] = _h
KS = list(range(0, 20))


def main():
    label, absentee, snap = sys.argv[1], sys.argv[2], sys.argv[3]
    start = pd.Timestamp(EV_STARTS[label])
    H = pd.read_pickle(os.environ['HISTORY_FILE']).b

    def low(ids):
        b = ids.map(H).fillna(0).astype(int)
        lo = sum(((b & x) > 0).astype(int) for x in PRIOR[label]) <= 1
        if SKIP[label]:
            lo |= (b & SKIP[label][0]) == SKIP[label][1]
        return lo

    a = pd.read_csv(absentee, encoding='iso-8859-1', dtype=str, keep_default_na=False,
                    usecols=['ncid', 'county_desc', 'ballot_req_type', 'ballot_rtn_dt', 'ballot_rtn_status', 'ethnicity'])
    a = a[a.ballot_rtn_status.str.upper().str.startswith('ACCEPTED')].copy()
    a['ev'] = a.ballot_req_type.str.upper().isin(['ONE-STOP', 'EARLY VOTING']).astype(int)
    a['when'] = pd.to_datetime(a.ballot_rtn_dt, format='%m/%d/%Y', errors='coerce')
    a = a.sort_values(['ev', 'when'], ascending=[False, False]).drop_duplicates('ncid')
    a = a[a.ethnicity.map({x: eth_code(x) for x in a.ethnicity.unique()}) == 'HL'].copy()
    a['k'] = (a.when - start).dt.days
    a['low'] = low(a.ncid)

    parts = []
    with zipfile.ZipFile(snap) as z, z.open(z.namelist()[0]) as fb:
        enc = 'utf-16' if fb.peek(2)[:2] in (b'\xff\xfe', b'\xfe\xff') else 'latin-1'
        for ch in pd.read_csv(io.TextIOWrapper(fb, encoding=enc), sep='\t', dtype=str, keep_default_na=False, chunksize=1_000_000,
                              usecols=['county_desc', 'ncid', 'status_cd', 'ethnic_code']):
            ch = ch.apply(lambda c: c.str.strip())
            parts.append(ch[ch.status_cd.isin(['A', 'I']) & (ch.ethnic_code.map(eth_code) == 'HL')])
    r = pd.concat(parts).drop_duplicates('ncid')
    r['low'] = low(r.ncid)

    def place(av, rv):
        return {'hv': [[int((av.low & (av.k <= k)).sum()), int((~av.low & (av.k <= k)).sum())] for k in KS],
                'hr': [int(rv.low.sum()), int((~rv.low).sum())]}

    path = f'docs/xtab{label}.json'
    X = json.load(open(path))
    X['places']['North Carolina'].update(place(a, r))
    rg = {c.upper(): g for c, g in r.groupby('county_desc')}
    ag = {c.upper(): g for c, g in a.groupby('county_desc')}
    n = 0
    for c, rv in rg.items():
        nm = COUNTY_NAME.get(c, c.title())
        if nm in X['places']:
            X['places'][nm].update(place(ag.get(c, a.iloc[0:0]), rv)); n += 1
    st = X['places']['North Carolina']
    print(f"{label}: Hispanic or Latino added for {n} counties; statewide registered low/regular {st['hr'][0]:,}/{st['hr'][1]:,}; "
          f"voted by day 4 {st['hv'][4][0]:,}/{st['hv'][4][1]:,}")
    with open(path, 'w') as f:
        json.dump(X, f, separators=(',', ':'))


if __name__ == '__main__':
    main()
