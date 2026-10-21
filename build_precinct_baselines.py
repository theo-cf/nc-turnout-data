"""Past-year comparisons for TODAY's precincts, for the tracker's precinct map (docs/pct_base/<year>/<County>.json).

Usage (one year per run):
    HISTORY_FILE=<lookup.pkl.gz> python build_precinct_baselines.py <year> <absentee file> <VR_Snapshot_<Election Day>.zip> \
                                                                     <current registration: ncvoter_Statewide.zip or a folder of ncvoter<N>.zip>

Precinct lines move between elections, so each past voter is placed in one of today's precincts:
  * voters registered at that election who still live at the same address today (same voter ID, house number, first word
    of the street name and ZIP code, as in build_district_xwalk.py) go to their current precinct;
  * everyone else (since moved, removed or died) is spread over today's precincts in the same proportions as the
    same-address voters from their precinct at the time. A past precinct with fewer than 10 same-address voters goes to
    today's precinct with the same code, if there is one.
Registered voters at that election (active and inactive, from the VR snapshot) and that year's accepted early and mail
ballots (one per voter, counted as in build_baselines.py) are placed the same way, so the counts are fractional and are
rounded at the end.

Each county file: {"y": year, "k0": first day, "p": {"<today's precinct code>": [[reg all, DEM, REP, low-propensity DEM,
low-propensity REP], c, D, R, lpD, lpR]}}, where c, D, R, lpD and lpR are votes so far (all, DEM, REP, low-propensity DEM
and REP) at the end of each day from k0 (14 days before early voting began) through Election Day, as in baseline.json.
Low-propensity uses the same rule as build_baselines.py (needs HISTORY_FILE). Counts only.
"""
import gc
import io
import json
import os
import sys
import zipfile

import numpy as np
import pandas as pd

import build_baselines as bb
from build_district_xwalk import DIRS
from ncsbe import COUNTY_NAME

MIN_MATCH = 10
KS = list(range(bb.K0, bb.K1 + 1))


def place(c):
    return COUNTY_NAME.get(c, c.title())


def current(path):
    """today's precinct ("COUNTY|code") and address key for every active or inactive voter, indexed by voter ID"""
    import glob
    files = sorted(glob.glob(os.path.join(path, 'ncvoter*.zip'))) if os.path.isdir(path) else [path]
    parts = []
    for f in files:
        with zipfile.ZipFile(f) as z:
            for ch in pd.read_csv(z.open(z.namelist()[0]), sep='\t', dtype=str, encoding='latin-1', keep_default_na=False, chunksize=1_000_000,
                                  usecols=['ncid', 'county_desc', 'status_cd', 'res_street_address', 'zip_code', 'precinct_abbrv']):
                ch = ch[ch.status_cd.isin(['A', 'I'])].apply(lambda c: c.str.strip())
                tok = ch.res_street_address.str.split()
                st = tok.str[1].where(~tok.str[1].isin(DIRS) | (tok.str.len() < 4), tok.str[2])
                key = ch.county_desc.str.upper() + '|' + tok.str[0].fillna('') + '|' + st.fillna('') + '|' + ch.zip_code.str[:5]
                parts.append(pd.DataFrame({'key': key.values, 'pct': (ch.county_desc.str.upper() + '|' + ch.precinct_abbrv).values}, index=ch.ncid.values))
    cur = pd.concat(parts)
    cur = cur[~cur.index.duplicated()]
    cur['pct'] = cur.pct.astype('category')
    return cur


def ballots(label, path):
    """that year's accepted early and mail ballots, one per voter: day k, party (0 DEM, 1 REP, 2 other), low-propensity"""
    a = pd.read_csv(path, encoding='iso-8859-1', dtype=str, keep_default_na=False,
                    usecols=['ncid', 'voter_party_code', 'ballot_req_type', 'ballot_rtn_dt', 'ballot_rtn_status'])
    a = a[a.ballot_rtn_status.str.upper().str.startswith('ACCEPTED')].copy()
    a['ev'] = a.ballot_req_type.str.upper().isin(['ONE-STOP', 'EARLY VOTING']).astype(int)
    a['when'] = pd.to_datetime(a.ballot_rtn_dt, format='%m/%d/%Y', errors='coerce')
    a = a.sort_values(['ev', 'when'], ascending=[False, False]).drop_duplicates('ncid')
    k = (a.when - pd.Timestamp(bb.YEARS[label])).dt.days.clip(lower=bb.K0)
    out = pd.DataFrame({'k': k.fillna(bb.K1).astype(int).values,
                        'pp': a.voter_party_code.str.strip().map({'DEM': 0, 'REP': 1}).fillna(2).astype('int8').values,
                        'low': low_flags(label, a.ncid).values}, index=a.ncid.str.strip().values)
    return out[out.k <= bb.K1]


def low_flags(label, ncid):
    if bb.HIST is None or not bb.PRIOR[label]:
        return pd.Series(False, index=ncid.index)
    bits = ncid.str.strip().map(bb.HIST.b).fillna(0).astype(int)
    low = sum(((bits & b) > 0).astype(int) for b in bb.PRIOR[label]) <= 1
    if bb.SKIP[label]:
        low |= (bits & bb.SKIP[label][0]) == bb.SKIP[label][1]
    return low


def main():
    label, absentee, snap, reg = sys.argv[1:5]
    B = ballots(label, absentee)
    print(f'{label}: {len(B):,} ballots', flush=True)
    cur = current(reg)
    print(f'today: {len(cur):,} voters', flush=True)
    regs, bal = [], []
    with zipfile.ZipFile(snap) as z, z.open(z.namelist()[0]) as fb:
        enc = 'utf-16' if fb.peek(2)[:2] in (b'\xff\xfe', b'\xfe\xff') else 'latin-1'
        for ch in pd.read_csv(io.TextIOWrapper(fb, encoding=enc), sep='\t', dtype=str, keep_default_na=False, chunksize=1_000_000,
                              usecols=['ncid', 'status_cd', 'county_desc', 'precinct_abbrv', 'house_num', 'street_name', 'zip_code', 'party_cd']):
            ch = ch.apply(lambda c: c.str.strip())
            ch = ch[ch.status_cd.isin(['A', 'I']) & (ch.precinct_abbrv != '')].drop_duplicates('ncid')
            key = ch.county_desc.str.upper() + '|' + ch.house_num + '|' + ch.street_name.str.split().str[0].fillna('') + '|' + ch.zip_code.str[:5]
            m = cur.reindex(ch.ncid.values)
            same = m.key.values == key.values
            d = pd.DataFrame({'old': (ch.county_desc.str.upper() + '|' + ch.precinct_abbrv).values,
                              'new': np.where(same, m.pct.astype(object).values, None),
                              'pp': ch.party_cd.map({'DEM': 0, 'REP': 1}).fillna(2).astype('int8').values,
                              'low': low_flags(label, ch.ncid).values}, index=ch.ncid.values)
            d['new'] = d.new.fillna('')
            regs.append(d.groupby(['old', 'new', 'pp', 'low']).size().rename('n').reset_index())
            hit = d.join(B, how='inner', rsuffix='_b')   # this year's voters: where they were placed, with their ballot's day
            bal.append(hit.groupby(['old', 'new', 'pp_b', 'low_b', 'k']).size().rename('n').reset_index().rename(columns={'pp_b': 'pp', 'low_b': 'low'}))
            del d, m, hit
            gc.collect()
    del cur
    gc.collect()
    R = pd.concat(regs).groupby(['old', 'new', 'pp', 'low']).n.sum().reset_index()
    V = pd.concat(bal).groupby(['old', 'new', 'pp', 'low', 'k']).n.sum().reset_index()
    print(f"{label}: {R.n.sum():,} registered, {R.n[R.new != ''].sum() / R.n.sum():.1%} at the same address today; "
          f"{V.n.sum():,} of {len(B):,} ballots matched to the snapshot", flush=True)

    # each past precinct's spread over today's precincts, from its same-address voters
    mt = R[R.new != ''].groupby(['old', 'new']).n.sum().reset_index()
    tot = mt.groupby('old').n.sum()
    mt['w'] = mt.n / mt.old.map(tot)
    share = mt[mt.old.map(tot) >= MIN_MATCH][['old', 'new', 'w']]
    today = set(R.new[R.new != ''].unique())
    few = [o for o in R.old.unique() if tot.get(o, 0) < MIN_MATCH and o in today]
    share = pd.concat([share, pd.DataFrame({'old': few, 'new': few, 'w': 1.0})])
    lost = set(R.old.unique()) - set(share.old)

    def spread(T, cols):
        direct = T[T.new != ''].assign(w=1.0)
        rest = T[T.new == ''].drop(columns='new').merge(share, on='old')
        both = pd.concat([direct, rest])
        both['x'] = both.n * both.w
        return both.groupby(['new'] + cols).x.sum()

    rg = spread(R, ['pp', 'low']).unstack(['pp', 'low'], fill_value=0)
    vt = spread(V, ['pp', 'low', 'k']).unstack(['pp', 'low', 'k'], fill_value=0)
    print(f"{label}: {len(lost)} past precincts not placed ({R.n[R.old.isin(lost)].sum():,} voters); "
          f"{rg.values.sum():,.0f} registered and {vt.values.sum():,.0f} ballots placed in {len(rg):,} of today's precincts", flush=True)

    out = {}
    for pid in rg.index:
        c, p = pid.split('|', 1)
        g = rg.loc[pid]
        r0 = [g.sum(), g.get((0, False), 0) + g.get((0, True), 0), g.get((1, False), 0) + g.get((1, True), 0), g.get((0, True), 0), g.get((1, True), 0)]
        row = [[int(round(x)) for x in r0]]
        v = vt.loc[pid] if pid in vt.index else None
        for pp, low in ((None, None), (0, None), (1, None), (0, True), (1, True)):
            if v is None:
                row.append([0] * len(KS)); continue
            s = v[[i for i in v.index if (pp is None or i[0] == pp) and (low is None or i[1] == low)]]
            byk = s.groupby(level=2).sum() if len(s) else pd.Series(dtype=float)
            cum = np.cumsum([byk.get(k, 0.0) for k in KS])
            row.append([int(round(x)) for x in cum])
        out.setdefault(place(c), {})[p] = row
    d = os.path.join('docs', 'pct_base', label)
    os.makedirs(d, exist_ok=True)
    for county, ps in out.items():
        with open(os.path.join(d, county + '.json'), 'w') as f:
            json.dump({'y': label, 'k0': bb.K0, 'p': ps}, f, separators=(',', ':'))
    st = sum(r[1][-1] for ps in out.values() for r in ps.values())
    print(f'{label}: wrote {len(out)} counties, {sum(len(x) for x in out.values()):,} precincts; {st:,} early and mail votes by Election Day', flush=True)


if __name__ == '__main__':
    main()
