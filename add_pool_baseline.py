"""Add low-propensity registered-voter counts for 2022 and 2024 to docs/baseline.json (run once).

Usage:
    HISTORY_FILE=<lookup.pkl.gz> python add_pool_baseline.py 2022 VR_Snapshot_20221108.zip 2024 VR_Snapshot_20241105.zip

The State Board's registration snapshots (https://s3.amazonaws.com/dl.ncsbe.gov/data/Snapshots/) show every
registered voter on Election Day. For each year, statewide and for each county, this counts registered voters
(active and inactive) by party who were low-propensity going into that election: voted in 0 or 1 of the three
previous November elections, or New Voters (no NC vote on or before the first of those elections, and registered
after it or too young for it). Adds 'lpr': [DEM, REP, UNA] to each place. Counts only.
"""
import io
import json
import os
import sys
import zipfile

import pandas as pd

from ncsbe import COUNTY_NAME

PRIOR = {'2022': (1, 2, 4), '2024': (2, 4, 8)}
NEWV = {'2022': (1, 20161108, 1999), '2024': (3, 20181106, 2001)}
PARTIES = ['DEM', 'REP', 'UNA']


def pool(label, snap, H):
    parts = []
    with zipfile.ZipFile(snap) as z, z.open(z.namelist()[0]) as fb:
        head = fb.peek(2)[:2] if hasattr(fb, 'peek') else b''
        enc = 'utf-16' if head in (b'\xff\xfe', b'\xfe\xff') else 'latin-1'
        f = io.TextIOWrapper(fb, encoding=enc)
        for ch in pd.read_csv(f, sep='\t', dtype=str, usecols=['county_desc', 'ncid', 'status_cd', 'party_cd', 'registr_dt', 'age'],
                              keep_default_na=False, chunksize=1_000_000):
            ch = ch[ch.status_cd.str.strip().isin(['A', 'I'])]
            parts.append(ch.apply(lambda c: c.str.strip()))
    s = pd.concat(parts).drop_duplicates('ncid')
    b = s.ncid.map(H.b).fillna(0).astype(int)
    reg = pd.to_numeric(pd.to_datetime(s.registr_dt.str[:10], errors='coerce').dt.strftime('%Y%m%d'), errors='coerce').fillna(0)
    by = int(label) - pd.to_numeric(s.age, errors='coerce').fillna(200)
    nb, nd, ny = NEWV[label]
    new = ((b & nb) == 0) & ((reg > nd) | (by >= ny))
    low = (sum(((b & x) > 0).astype(int) for x in PRIOR[label]) <= 1) | new
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
