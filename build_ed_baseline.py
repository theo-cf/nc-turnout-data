"""2022 benchmark for the Turnout Tracker's "2022 Election Day voters" chart (docs/edbase2022.json). Run once.

Usage:
    python build_ed_baseline.py <ncvhis_20221108.zip> <absentee_20221108.csv>

The 2026 chart shows what share of each party's early and mail votes so far came from people who voted on Election Day
in the previous midterm (2022). This file holds the same share for 2022 (votes from 2018 Election Day voters), at the
end of each day of early voting, so the tracker can compare at the same point.
Election Day = in person, curbside, provisional or transfer ballots on Nov. 6, 2018, from the history file as it stood
on Nov. 8, 2022 (so it covers the voters registered at the time). Statewide and for each county; counts only:
  * v[k]: accepted early and mail voters so far at the end of day k of early voting (k = 0 is Oct. 20, 2022), [DEM, REP, UNA]
  * e[k]: of those, how many voted on Election Day 2018
"""
import json
import sys
import zipfile

import pandas as pd

from ncsbe import COUNTY_NAME

ED18 = {'IN-PERSON', 'CURBSIDE', 'PROVISIONAL', 'TRANSFER'}
EV_START = '2022-10-20'
PARTIES = ['DEM', 'REP', 'UNA']


def main():
    hist, absentee = sys.argv[1], sys.argv[2]
    ed = set()
    with zipfile.ZipFile(hist) as z, z.open(z.namelist()[0]) as f:
        for ch in pd.read_csv(f, sep='\t', dtype=str, encoding='latin-1', usecols=['ncid', 'election_lbl', 'voting_method'],
                              chunksize=3_000_000, keep_default_na=False):
            ch = ch[(ch.election_lbl == '11/06/2018') & ch.voting_method.str.strip().isin(ED18)]
            ed.update(ch.ncid.str.strip())
    print(f'2018 Election Day voters in the history file: {len(ed):,}')

    a = pd.read_csv(absentee, encoding='iso-8859-1', dtype=str, keep_default_na=False,
                    usecols=['ncid', 'county_desc', 'voter_party_code', 'ballot_req_type', 'ballot_rtn_dt', 'ballot_rtn_status'])
    a = a[a.ballot_rtn_status.str.upper().str.startswith('ACCEPTED')].copy()
    a['ev'] = a.ballot_req_type.str.upper().isin(['ONE-STOP', 'EARLY VOTING']).astype(int)
    a['when'] = pd.to_datetime(a.ballot_rtn_dt, format='%m/%d/%Y', errors='coerce')
    a = a.sort_values(['ev', 'when'], ascending=[False, False]).drop_duplicates('ncid')   # same rules as build_tier_baseline.py
    a['k'] = (a.when - pd.Timestamp(EV_START)).dt.days
    a['party'] = a.voter_party_code.str.strip()
    a['e'] = a.ncid.str.strip().isin(ed)

    def place(g):
        v, e = [], []
        for k in range(20):
            s = g[g.k <= k]
            v.append([int((s.party == p).sum()) for p in PARTIES])
            e.append([int(((s.party == p) & s.e).sum()) for p in PARTIES])
        return {'v': v, 'e': e}

    out = {'ev_start': EV_START, 'places': {'North Carolina': place(a)}}
    for c, g in a.groupby('county_desc'):
        out['places'][COUNTY_NAME.get(c.upper(), c.title())] = place(g)
    st = out['places']['North Carolina']
    print('statewide by day 12:', st['v'][12], st['e'][12], [round(e / v * 100, 1) for e, v in zip(st['e'][12], st['v'][12])],
          '; counties', len(out['places']) - 1)
    with open('docs/edbase2022.json', 'w') as f:
        json.dump(out, f, separators=(',', ':'))


if __name__ == '__main__':
    main()
