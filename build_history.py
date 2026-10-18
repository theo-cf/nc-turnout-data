"""Build the private voting-history lookup used for the Turnout Tracker's "Voter Propensity" view.

Usage:
    python build_history.py --history ncvhis_Statewide.zip --voters ncvoter_Statewide.zip --out <lookup.pkl.gz>

Reads the State Board's statewide voter history and registration files and writes one row per voter ID
(NCID) with:
  * b:   which November general elections the voter cast a ballot in, as bits
         (2016 = 1, 2018 = 2, 2020 = 4, 2022 = 8, 2024 = 16)
  * reg: registration date as YYYYMMDD (0 if unknown)
  * by:  birth year (0 if unknown)

With --pool, also writes the number of registered voters (active and inactive) in each party who are
low-propensity going into 2026 (voted in 0 or 1 of 2020, 2022 and 2024, or in 2020 and 2024 but not 2022), statewide and by county
and district. Those are totals only.

The lookup is voter-level, so it is NEVER committed to this public repository. In GitHub Actions it lives
only in the workflow's private build cache (see update.yml) and is rebuilt when the State Board posts new
weekly files. The tracker publishes totals only.
"""
import argparse
import json
import zipfile

import pandas as pd

XT_RACES = ['B', 'O', 'A', 'W']   # Black, Other, Asian, White: the race rows on the shareable graphics
ELECTIONS = {'11/08/2016': 1, '11/06/2018': 2, '11/03/2020': 4, '11/08/2022': 8, '11/05/2024': 16}


def read(paths, cols, keep=None):
    parts = []
    for p in paths:
        with zipfile.ZipFile(p) as zf:
            for name in zf.namelist():
                for ch in pd.read_csv(zf.open(name), sep='\t', dtype=str, encoding='latin-1', usecols=cols,
                                      keep_default_na=False, chunksize=2_000_000):
                    parts.append(keep(ch) if keep else ch)
    return pd.concat(parts)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--history', nargs='+', required=True)
    ap.add_argument('--voters', nargs='+', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--pool', default='')
    a = ap.parse_args()

    h = read(a.history, ['ncid', 'election_lbl'], lambda c: c[c.election_lbl.isin(ELECTIONS)])
    h = h.drop_duplicates()
    bits = h.election_lbl.map(ELECTIONS).groupby(h.ncid).sum().astype('uint8')

    v = read(a.voters, ['ncid', 'status_cd', 'registr_dt', 'birth_year', 'party_cd', 'county_desc', 'cong_dist_abbrv', 'nc_house_abbrv', 'nc_senate_abbrv',
                                'race_code', 'age_at_year_end'])
    v['rank'] = v.status_cd.map({'A': 0, 'I': 1}).fillna(2)            # prefer the active/inactive registration
    v = v.sort_values('rank').drop_duplicates('ncid').set_index('ncid')
    reg = pd.to_datetime(v.registr_dt, format='%m/%d/%Y', errors='coerce')
    out = pd.DataFrame(index=bits.index.union(v.index))
    out['b'] = bits.reindex(out.index).fillna(0).astype('uint8')
    out['reg'] = reg.dt.strftime('%Y%m%d').reindex(out.index).fillna('0').astype('int32')
    out['by'] = pd.to_numeric(v.birth_year, errors='coerce').reindex(out.index).fillna(0).astype('int16')

    # Sanity checks: each November must have millions of voters, or the history file is incomplete.
    for lbl, bit in ELECTIONS.items():
        n = int(((out.b & bit) > 0).sum())
        if n < 2_500_000:
            raise SystemExit(f'STOPPING: only {n:,} voters in the {lbl} history; the file looks incomplete')
    out.to_pickle(a.out)

    if a.pool:
        # Registered low-propensity voters by party and place (the denominator for "what share have voted").
        from ncsbe import COUNTY_NAME
        r = v[v.status_cd.isin(['A', 'I'])]
        b = out.b.reindex(r.index).fillna(0).astype(int)
        n3 = sum(((b & x) > 0).astype(int) for x in (4, 8, 16))
        lp = r[(n3 <= 1) | ((b & 28) == 20)]   # or voted in 2020 and 2024 but skipped the 2022 midterm
        lp = lp[lp.party_cd.isin(['DEM', 'REP', 'UNA'])]
        cnt = lambda g: [int((g.party_cd == x).sum()) for x in ('DEM', 'REP', 'UNA')]
        P = {'state': cnt(lp), 'county': {COUNTY_NAME.get(c, c.title()): cnt(g) for c, g in lp.groupby('county_desc')}}
        for k, col in (('cd', 'cong_dist_abbrv'), ('hd', 'nc_house_abbrv'), ('sd', 'nc_senate_abbrv')):
            d = pd.to_numeric(lp[col], errors='coerce')
            P[k] = {str(int(n)): cnt(g) for n, g in lp[d.notna()].groupby(d.dropna().astype(int))}
        # For the shareable graphics, statewide and by county: registered voters by race x age x propensity ('xr', see XT_RACES)
        # and by party x propensity ('pr': DEM low, DEM regular, REP low, REP regular, UNA low, UNA regular).
        r = r.assign(low=((n3 <= 1) | ((b & 28) == 20)).values)
        ri = r.race_code.str.strip().map({x: i for i, x in enumerate(XT_RACES)})
        ai = pd.cut(pd.to_numeric(r.age_at_year_end, errors='coerce'), [17, 25, 40, 65, 200], labels=False)
        cell = (ri * 4 + ai) * 2 + (~r.low).astype(int)
        pc = r.party_cd.map({'DEM': 0, 'REP': 2, 'UNA': 4}) + (~r.low).astype(int)

        def xt(idx, n):
            c = idx.dropna().astype(int).value_counts()
            return [int(c.get(i, 0)) for i in range(n)]
        P['xr'] = {'state': xt(cell, 32), 'county': {COUNTY_NAME.get(c, c.title()): xt(cell[g.index], 32) for c, g in r.groupby('county_desc')}}
        P['pr'] = {'state': xt(pc, 6), 'county': {COUNTY_NAME.get(c, c.title()): xt(pc[g.index], 6) for c, g in r.groupby('county_desc')}}
        with open(a.pool, 'w') as f:
            json.dump(P, f, separators=(',', ':'))
        print(f"low-propensity registered voters (DEM, REP, UNA): {P['state']}")
    print(f'history lookup: {len(out):,} voters; ' + ', '.join(f"{l[-4:]} {int(((out.b & b) > 0).sum()):,}" for l, b in ELECTIONS.items()))


if __name__ == '__main__':
    main()
