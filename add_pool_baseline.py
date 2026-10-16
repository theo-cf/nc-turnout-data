"""Add low-propensity registered-voter counts for 2022 and 2024 to docs/baseline.json (run once).

Usage:
    HISTORY_FILE=<lookup.pkl.gz> python add_pool_baseline.py 2022 VR_Snapshot_20221108.zip 2024 VR_Snapshot_20241105.zip

The State Board's registration snapshots (https://s3.amazonaws.com/dl.ncsbe.gov/data/Snapshots/) show every
registered voter on Election Day. For each year, statewide and for each county, this counts registered voters
(active and inactive) by party who were low-propensity going into that election: voted in 0 or 1 of the three
previous November elections in North Carolina, and for 2022 also voters who voted in 2016 and 2020 but not
2018. Adds 'lpr': [DEM, REP, UNA] to each place. Counts only.
"""
import io
import json
import os
import sys
import zipfile

import pandas as pd

from ncsbe import COUNTY_NAME

PRIOR = {'2022': (1, 2, 4), '2024': (2, 4, 8)}
# Also low-propensity: voted in both presidential elections but skipped the midterm between them (2022 only, the
# year that lines up with 2026; 2024 has no midterm-skipper equivalent): (bits to check, pattern).
SKIP = {'2022': (7, 5), '2024': None}
PARTIES = ['DEM', 'REP', 'UNA']


def pool(label, snap, H):
    parts = []
    with zipfile.ZipFile(snap) as z, z.open(z.namelist()[0]) as fb:
        head = fb.peek(2)[:2] if hasattr(fb, 'peek') else b''
        enc = 'utf-16' if head in (b'\xff\xfe', b'\xfe\xff') else 'latin-1'
        f = io.TextIOWrapper(fb, encoding=enc)
        for ch in pd.read_csv(f, sep='\t', dtype=str, usecols=['county_desc', 'ncid', 'status_cd', 'party_cd'],
                              keep_default_na=False, chunksize=1_000_000):
            ch = ch[ch.status_cd.str.strip().isin(['A', 'I'])]
            parts.append(ch.apply(lambda c: c.str.strip()))
    s = pd.concat(parts).drop_duplicates('ncid')
    b = s.ncid.map(H.b).fillna(0).astype(int)
    low = sum(((b & x) > 0).astype(int) for x in PRIOR[label]) <= 1
    if SKIP[label]:
        low |= (b & SKIP[label][0]) == SKIP[label][1]
    s = s.assign(low=low, party=s.party_cd)
    lp = s[s.low & s.party.isin(PARTIES)]
    res = {'North Carolina': [int((lp.party == p).sum()) for p in PARTIES]}
    for c, g in lp.groupby('county_desc'):
        res[COUNTY_NAME.get(c.upper(), c.title())] = [int((g.party == p).sum()) for p in PARTIES]
    print(f"{label}: {len(s):,} registered; low-propensity DEM/REP/UNA {res['North Carolina']}")
    return res


def main():
    H = pd.read_pickle(os.environ['HISTORY_FILE'])
    B = json.load(open('docs/baseline.json'))
    a = sys.argv[1:]
    for i in range(0, len(a), 2):
        label, snap = a[i], a[i + 1]
        res = pool(label, snap, H)
        for name, p in B[label]['places'].items():
            p['lpr'] = res.get(name, [0, 0, 0])
    with open('docs/baseline.json', 'w') as f:
        json.dump(B, f, separators=(',', ':'))


if __name__ == '__main__':
    main()
