"""Turn the Turnout Tracker's data into final, official turnout from the State Board's voter history.

Usage:
    python final_data.py <voter history zip(s)> --voters <registration zip(s)> --data docs/data.json [--election 11/03/2026]

Run once, after counties have loaded Election Day voter history (usually a few weeks after the election;
check that the statewide count has stopped growing). It reads the State Board's voter history files
(ncvhis_Statewide.zip, or county files) and voter registration files (ncvoter_Statewide.zip, or county
files) for age, and rewrites data.json so every number covers ALL voters: early in person, by mail and on
Election Day, with party and age for each, and final turnout by precinct.

Kept from the existing data.json: the early-voting day-by-day series and early voting sites (voter
history has no dates or sites). Only totals are written. No voter-level information is saved.

Counting rules:
  * One row per voter in the history file for this election.
  * Early in person: EARLY VOTING IN-PERSON / CURBSIDE (older files: ABSENTEE ONESTOP / CURBSIDE).
  * By mail: ABSENTEE BY MAIL.
  * Election Day: ELECTION DAY IN-PERSON / CURBSIDE, PROVISIONAL and TRANSFER (older files: IN-PERSON, CURBSIDE).
  * Party: the party the voter was registered with when they voted. Age: from the registration file.
  * District: the district of the precinct the voter voted in (precincts.csv), else their registration.
"""
import argparse
import json
import os
import sys
import zipfile
from datetime import datetime
from zoneinfo import ZoneInfo

import pandas as pd

from election_day import PRECINCT_MIN, finish_table, load_lookup, tidy
from ncsbe import COUNTY_NAME, DISTRICTS, NC_COUNTIES, num

METHOD = {
    'EARLY VOTING IN-PERSON': 'ev', 'EARLY VOTING CURBSIDE': 'ev', 'ABSENTEE ONESTOP': 'ev', 'ABSENTEE CURBSIDE': 'ev',
    'ABSENTEE BY MAIL': 'ml',
    'ELECTION DAY IN-PERSON': 'ed', 'ELECTION DAY CURBSIDE': 'ed', 'IN-PERSON': 'ed', 'CURBSIDE': 'ed',
    'PROVISIONAL': 'ed', 'TRANSFER': 'ed',
}
AGE_EDGES = [17, 29, 44, 64, 200]   # 18-29, 30-44, 45-64, 65 and older
PARTIES = ['DEM', 'REP', 'UNA', 'OTH']


def fail(msg):
    print('STOPPING: ' + msg, file=sys.stderr)
    sys.exit(1)


def read_zips(paths, usecols, keep=None, chunksize=1_000_000):
    """Read tab-separated State Board files inside zips, in chunks, keeping only the rows keep(chunk) selects."""
    parts = []
    for p in paths:
        with zipfile.ZipFile(p) as zf:
            for name in zf.namelist():
                for ch in pd.read_csv(zf.open(name), sep='\t', dtype=str, encoding='latin-1', usecols=usecols,
                                      keep_default_na=False, chunksize=chunksize):
                    parts.append(ch[keep(ch)] if keep else ch)
    return pd.concat(parts) if parts else pd.DataFrame(columns=usecols)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('history', nargs='+')
    ap.add_argument('--voters', nargs='+', required=True)
    ap.add_argument('--data', required=True)
    ap.add_argument('--election', default='11/03/2026')
    a = ap.parse_args()

    D = json.load(open(a.data))
    h = read_zips(a.history, ['county_desc', 'election_lbl', 'voting_method', 'voted_party_cd', 'pct_label', 'pct_description', 'ncid', 'voted_county_desc'],
                  keep=lambda c: c.election_lbl == a.election)
    if h.empty:
        fail(f'no voter history for {a.election} yet')
    h = h.drop_duplicates('ncid')
    unknown = set(h.voting_method) - set(METHOD)
    if unknown:
        fail(f'unrecognized voting method(s): {sorted(unknown)}')
    h['kind'] = h.voting_method.map(METHOD)
    h['party'] = h.voted_party_cd.where(h.voted_party_cd.isin(PARTIES[:3]), 'OTH')
    h['county'] = h.voted_county_desc.where(h.voted_county_desc != '', h.county_desc)

    ids = set(h.ncid)
    v = read_zips(a.voters, ['ncid', 'age_at_year_end', 'cong_dist_abbrv', 'nc_house_abbrv', 'nc_senate_abbrv'],
                  keep=lambda c: c.ncid.isin(ids)).drop_duplicates('ncid')
    h = h.merge(v, on='ncid', how='left')
    h['ab'] = pd.cut(pd.to_numeric(h.age_at_year_end, errors='coerce'), AGE_EDGES, labels=False)

    lookup = load_lookup()
    h = h.merge(lookup.rename(columns={'county': 'county', 'code': 'pct_label'})[['county', 'pct_label', 'name', 'cd', 'hd', 'sd']],
                on=['county', 'pct_label'], how='left')
    for k, reg in (('cd', 'cong_dist_abbrv'), ('hd', 'nc_house_abbrv'), ('sd', 'nc_senate_abbrv')):
        h[k] = pd.to_numeric(h[k].fillna('').where(h[k].fillna('') != '', h[reg].fillna('')), errors='coerce')

    def totals(s):
        k, p, g = s.kind.value_counts(), s.party.value_counts(), s.ab.value_counts()
        return {'ev': int(k.get('ev', 0)), 'ml': int(k.get('ml', 0)), 'ed': int(k.get('ed', 0)),
                'vc': int(k.get('ev', 0) + k.get('ml', 0)),
                'pty': [int(p.get(x, 0)) for x in PARTIES], 'age': [int(g.get(i, 0)) for i in range(4)]}

    D['state'].update(totals(h))
    groups = {'county': h.groupby(h.county.map(lambda c: COUNTY_NAME.get(c, c.title())))}
    for k in ('cd', 'hd', 'sd'):
        groups[k] = h.dropna(subset=[k]).groupby(h[k].dropna().astype(int))
    for key, g in groups.items():
        found = {name: totals(s) for name, s in g}
        for r in D['geo'][key]:
            nm = r['name'] if key == 'county' else num(r['name'])
            r.update(found.get(nm, {'ev': 0, 'ml': 0, 'ed': 0, 'vc': 0, 'pty': [0] * 4, 'age': [0] * 4}))
        if key != 'county':
            D['unassigned'][key] = int(h[key].isna().sum())

    # Final turnout by precinct, with the same privacy rule as election night.
    P = {}
    h['pname'] = h.name.where(h.name.notna(), h.pct_description)
    for county, s in h[h.pname.fillna('') != ''].groupby('county'):
        t = s.groupby(['pname', 'kind']).size().unstack(fill_value=0).reindex(columns=['ev', 'ml', 'ed'], fill_value=0).reset_index()
        t = t.rename(columns={'pname': 'name'})
        t['name'] = t.name.map(tidy)
        table = finish_table(t)
        if table:
            P[COUNTY_NAME.get(county, county.title())] = table
    D['precincts'], D['precinct_min'] = P, PRECINCT_MIN

    D.pop('ed_contest', None)
    D.pop('unassigned_ed', None)
    D['final'] = True
    D['final_note'] = f'Official voter history from the State Board of Elections, loaded {datetime.now(ZoneInfo("America/New_York")):%b. %-d, %Y}.'

    # Checks: everything adds up, and nothing is lost between geographies.
    st = D['state']
    if sum(r['vc'] + r['ed'] for r in D['geo']['county']) != st['vc'] + st['ed']:
        fail('county totals do not add up to the statewide total')
    if sum(st['pty']) != st['vc'] + st['ed']:
        fail('party totals do not add up')
    missing = set(h.county) - {c.upper() for c in NC_COUNTIES}
    if missing:
        fail(f'unknown counties in voter history: {sorted(missing)[:5]}')
    assert set(DISTRICTS) == {'cd', 'hd', 'sd'}

    with open(a.data, 'w') as f:
        json.dump(D, f, separators=(',', ':'))
    with open(os.path.join(os.path.dirname(os.path.abspath(a.data)), 'FINAL'), 'w') as f:
        f.write(D['final_note'] + '\n')
    print(f"final: {st['ev'] + st['ml'] + st['ed']:,} voters ({st['ev']:,} early in person, {st['ml']:,} by mail, "
          f"{st['ed']:,} on Election Day); precinct tables for {len(P)} counties")


if __name__ == '__main__':
    main()
