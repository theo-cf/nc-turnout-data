"""Count registered voters for the Turnout Tracker's "% of registered voters".

Usage:
    python build_registration.py <ncvoter zip(s)> [--modified "<Last-Modified header>"]

Reads the State Board's voter registration file (ncvoter_Statewide.zip, or the 100 county files) and
writes registration.json: the number of registered voters statewide and by county, congressional
district, NC House district, NC Senate district and precinct, with party and age breakdowns.

Registered voters = ACTIVE + INACTIVE. Inactive voters are still registered and can vote, and counting
them gives the larger denominator, so turnout percentages are never overstated. Removed, denied and
temporary registrations are not counted. Counts only; no voter-level information is written.
"""
import argparse
import json
import zipfile
from email.utils import parsedate_to_datetime
from zoneinfo import ZoneInfo

import pandas as pd

from ncsbe import COUNTY_NAME

COLS = ['county_desc', 'status_cd', 'party_cd', 'age_at_year_end', 'precinct_desc',
        'cong_dist_abbrv', 'nc_house_abbrv', 'nc_senate_abbrv']
PARTIES = ['DEM', 'REP', 'UNA', 'OTH']
AGE_EDGES = [17, 29, 44, 64, 200]   # 18-29, 30-44, 45-64, 65 and older


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('zips', nargs='+')
    ap.add_argument('--modified', default='')
    ap.add_argument('--out', default='registration.json')
    a = ap.parse_args()

    parts = []
    for p in a.zips:
        with zipfile.ZipFile(p) as zf:
            for name in zf.namelist():
                for ch in pd.read_csv(zf.open(name), sep='\t', dtype=str, encoding='latin-1', usecols=COLS,
                                      keep_default_na=False, chunksize=1_000_000):
                    ch = ch[ch.status_cd.isin(['A', 'I'])].copy()
                    ch['party'] = ch.party_cd.where(ch.party_cd.isin(PARTIES[:3]), 'OTH')
                    ch['ab'] = pd.cut(pd.to_numeric(ch.age_at_year_end, errors='coerce'), AGE_EDGES, labels=False)
                    ch['active'] = ch.status_cd == 'A'
                    parts.append(ch.drop(columns=['status_cd', 'party_cd', 'age_at_year_end']))
    v = pd.concat(parts)
    if len(v) < 1_000_000 and len(a.zips) == 1:
        raise SystemExit(f'STOPPING: only {len(v):,} registered voters; the file looks incomplete')

    def counts(s):
        p, g = s.party.value_counts(), s.ab.value_counts()
        return {'n': int(len(s)), 'active': int(s.active.sum()),
                'pty': [int(p.get(x, 0)) for x in PARTIES], 'age': [int(g.get(i, 0)) for i in range(4)]}

    out = {'state': counts(v), 'county': {}, 'cd': {}, 'hd': {}, 'sd': {}, 'precinct': {}}
    if a.modified.strip():
        out['as_of'] = parsedate_to_datetime(a.modified.strip()).astimezone(ZoneInfo('America/New_York')).strftime('%Y-%m-%d')
    for c, s in v.groupby('county_desc'):
        out['county'][COUNTY_NAME.get(c, c.title())] = counts(s)
    for k, col in (('cd', 'cong_dist_abbrv'), ('hd', 'nc_house_abbrv'), ('sd', 'nc_senate_abbrv')):
        d = pd.to_numeric(v[col], errors='coerce')
        for n, s in v[d.notna()].groupby(d.dropna().astype(int)):
            out[k][str(n)] = counts(s)
    for (c, pct), s in v[v.precinct_desc != ''].groupby(['county_desc', 'precinct_desc']):
        out['precinct'].setdefault(c, {})[pct] = int(len(s))

    if sum(x['n'] for x in out['county'].values()) != out['state']['n']:
        raise SystemExit('STOPPING: county counts do not add up')
    with open(a.out, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    print(f"{out['state']['n']:,} registered voters ({out['state']['active']:,} active), {len(out['county'])} counties, "
          f"{sum(len(x) for x in out['precinct'].values()):,} precincts")


if __name__ == '__main__':
    main()
