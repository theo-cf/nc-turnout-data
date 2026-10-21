"""Add party by race to a past year in docs/baseline.json, for the county map's race views. Run once per year.

Usage:
    python add_race_party_baseline.py 2022 <absentee_20221108.csv>
    python add_race_party_baseline.py 2018 <absentee_20181106_w_ethnicity.csv>     (and 2020, 2024)

Adds, statewide and for each county:
  * gp: accepted early and mail voters so far, by group and party, on each day from K0 to K1 (the same days as the other
        series in baseline.json; build_baselines.py): gp[group][party][day]. Groups: Black, White, Asian and American
        Indian (race), then Hispanic or Latino (ethnicity). Parties: DEM, REP, UNA.
Counts only. Ballots are counted the same way as build_baselines.py (accepted, one per voter, early voting first).
"""
import json
import sys

import pandas as pd

from build_baselines import K0, K1, YEARS, place
from ncsbe import eth_code, race_code

GROUPS = ['B', 'W', 'A', 'I', 'HL']
PARTIES = ['DEM', 'REP', 'UNA']


def main():
    label, absentee = sys.argv[1], sys.argv[2]
    start = pd.Timestamp(YEARS[label])
    a = pd.read_csv(absentee, encoding='iso-8859-1', dtype=str, keep_default_na=False,
                    usecols=['ncid', 'county_desc', 'voter_party_code', 'ballot_req_type', 'ballot_rtn_dt', 'ballot_rtn_status', 'race', 'ethnicity'])
    a = a[a.ballot_rtn_status.str.upper().str.startswith('ACCEPTED')].copy()
    a['ev'] = a.ballot_req_type.str.upper().isin(['ONE-STOP', 'EARLY VOTING']).astype(int)
    a['when'] = pd.to_datetime(a.ballot_rtn_dt, format='%m/%d/%Y', errors='coerce')
    a = a.sort_values(['ev', 'when'], ascending=[False, False]).drop_duplicates('ncid')
    a['k'] = (a.when - start).dt.days
    a['rc'] = a.race.map({x: race_code(x) for x in a.race.unique()})
    a['g'] = a.rc.where(a.rc.isin(GROUPS[:4]))
    hl = a.ethnicity.map({x: eth_code(x) for x in a.ethnicity.unique()}) == 'HL'
    a['pp'] = a.voter_party_code.str.strip()
    ks = list(range(K0, K1 + 1))

    def cum(s):
        byk = s.k.value_counts()
        return [int(byk[byk.index <= k].sum()) for k in ks]

    def block(s, h):
        out = [[cum(s[(s.g == g) & (s.pp == p)]) for p in PARTIES] for g in GROUPS[:4]]
        return out + [[cum(s[h & (s.pp == p)]) for p in PARTIES]]

    base = json.load(open('docs/baseline.json'))
    Y = base[label]['places']
    Y['North Carolina']['gp'] = block(a, hl)
    n = 0
    for c, s in a.groupby('county_desc'):
        nm = place(c)
        if nm in Y:
            Y[nm]['gp'] = block(s, hl[s.index]); n += 1
    st = Y['North Carolina']['gp']
    print(f"{label}: party by race added for {n} counties; statewide by Election Day, Black D/R/U "
          f"{st[0][0][-1]:,}/{st[0][1][-1]:,}/{st[0][2][-1]:,}, Hispanic {st[4][0][-1]:,}/{st[4][1][-1]:,}/{st[4][2][-1]:,}")
    with open('docs/baseline.json', 'w') as f:
        json.dump(base, f, separators=(',', ':'))


if __name__ == '__main__':
    main()
