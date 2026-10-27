"""Past-year counts for the Turnout Tracker's voting-history pyramid (docs/tiers<year>.json). Run once per year.

Usage:
    HISTORY_FILE=<extended lookup.pkl.gz> python build_tier_baseline.py 2022 <absentee_20221108.csv> <VR_Snapshot_20221108.zip>
    (and the same for 2018, 2020 and 2024)

The extended lookup is build_history.py's, plus 2012 and 2014 from the archived history file (see build_baselines.py).
Statewide and for each county, writes:
  * v[k]: accepted early and mail voters so far at the end of day k of early voting (k = 0 is its first day, k = 19 is
          Election Day; 2018 is lined up by days before Election Day, as in build_baselines.py), by party x voting-history
          group (ncsbe.tier_counts: DEM all 3, 2 of 3, 1 of 3, 0 of 3, new, then REP, then UNA).
  * r:    registered voters (active and inactive) on that Election Day in the same 15 cells, from the State Board's snapshot.
Groups follow ncsbe.history_tier; registration date and age come from the snapshot. Voters missing from the snapshot are new.
Counts only.
"""
import io
import json
import os
import sys
import zipfile

import pandas as pd

from ncsbe import COUNTY_NAME, TIER_RULES, history_tier, tier_counts

EV_STARTS = {'2018': '2018-10-18', '2020': '2020-10-15', '2022': '2022-10-20', '2024': '2024-10-17'}
KS = list(range(0, 20))
ELECTION = {'2018': 20181106, '2020': 20201103, '2022': 20221108, '2024': 20241105}


def main():
    label, absentee, snap = sys.argv[1], sys.argv[2], sys.argv[3]
    year = int(label)
    first_year = TIER_RULES[year][1] // 10000
    H = pd.read_pickle(os.environ['HISTORY_FILE']).b

    parts = []
    with zipfile.ZipFile(snap) as z, z.open(z.namelist()[0]) as fb:
        enc = 'utf-16' if fb.peek(2)[:2] in (b'\xff\xfe', b'\xfe\xff') else 'latin-1'
        for ch in pd.read_csv(io.TextIOWrapper(fb, encoding=enc), sep='\t', dtype=str, keep_default_na=False, chunksize=1_000_000,
                              usecols=['county_desc', 'ncid', 'status_cd', 'party_cd', 'age', 'registr_dt']):
            ch = ch.apply(lambda c: c.str.strip())
            parts.append(ch[ch.status_cd.isin(['A', 'I'])])
    r = pd.concat(parts).drop_duplicates('ncid').set_index('ncid')
    del parts
    reg = pd.to_numeric(r.registr_dt.str.replace('-', '').str[:8], errors='coerce').fillna(0).astype(int)
    age = pd.to_numeric(r.age, errors='coerce')
    young = (age - (year - first_year)) < 18          # too young to vote in the first of the three elections
    bits = r.index.to_series().map(H).fillna(0).astype(int)
    r['tier'] = history_tier(bits, reg, young.fillna(False), year)
    r['party'] = r.party_cd

    a = pd.read_csv(absentee, encoding='iso-8859-1', dtype=str, keep_default_na=False,
                    usecols=['ncid', 'county_desc', 'voter_party_code', 'ballot_req_type', 'ballot_rtn_dt', 'ballot_rtn_status'])
    a = a[a.ballot_rtn_status.str.upper().str.startswith('ACCEPTED')].copy()
    a['ev'] = a.ballot_req_type.str.upper().isin(['ONE-STOP', 'EARLY VOTING']).astype(int)
    a['when'] = pd.to_datetime(a.ballot_rtn_dt, format='%m/%d/%Y', errors='coerce')
    a = a.sort_values(['ev', 'when'], ascending=[False, False]).drop_duplicates('ncid')
    a['k'] = (a.when - pd.Timestamp(EV_STARTS[label])).dt.days
    a['party'] = a.voter_party_code.str.strip()
    a['tier'] = a.ncid.map(r.tier).fillna(4).astype(int)   # not in the Election Day snapshot: registered too late to be in it

    def place(av, rv):
        return {'v': [tier_counts(av.party[av.k <= k], av.tier[av.k <= k]) for k in KS], 'r': tier_counts(rv.party, rv.tier)}

    out = {'ev_start': EV_STARTS[label], 'places': {'North Carolina': place(a, r)}}
    rg = dict(tuple(r.groupby('county_desc')))
    for c, g in a.groupby('county_desc'):
        rv = rg.get(c, rg.get(c.upper()))
        if rv is not None:
            out['places'][COUNTY_NAME.get(c.upper(), c.title())] = place(g, rv)
    st = out['places']['North Carolina']
    print(f"{label}: registered {sum(st['r']):,} in groups {st['r']}; voters by day 10 {sum(st['v'][10]):,}; counties {len(out['places']) - 1}")
    with open(f'docs/tiers{label}.json', 'w') as f:
        json.dump(out, f, separators=(',', ':'))


if __name__ == '__main__':
    main()
