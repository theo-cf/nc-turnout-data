"""Build the private voting-history lookup used for the Turnout Tracker's "Voter Propensity" view.

Usage:
    python build_history.py --history ncvhis_Statewide.zip --voters ncvoter_Statewide.zip --out <lookup.pkl.gz>

Reads the State Board's statewide voter history and registration files and writes one row per voter ID
(NCID) with:
  * b:   which November general elections the voter cast a ballot in, as bits
         (2016 = 1, 2018 = 2, 2020 = 4, 2022 = 8, 2024 = 16)
  * reg: registration date as YYYYMMDD (0 if unknown)
  * by:  birth year (0 if unknown)

The lookup is voter-level, so it is NEVER committed to this public repository. In GitHub Actions it lives
only in the workflow's private build cache (see update.yml) and is rebuilt when the State Board posts new
weekly files. The tracker publishes totals only.
"""
import argparse
import zipfile

import pandas as pd

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
    a = ap.parse_args()

    h = read(a.history, ['ncid', 'election_lbl'], lambda c: c[c.election_lbl.isin(ELECTIONS)])
    h = h.drop_duplicates()
    bits = h.election_lbl.map(ELECTIONS).groupby(h.ncid).sum().astype('uint8')

    v = read(a.voters, ['ncid', 'status_cd', 'registr_dt', 'birth_year'])
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
    print(f'history lookup: {len(out):,} voters; ' + ', '.join(f"{l[-4:]} {int(((out.b & b) > 0).sum()):,}" for l, b in ELECTIONS.items()))


if __name__ == '__main__':
    main()
