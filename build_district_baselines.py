"""Past-year comparisons for TODAY's congressional, NC House and NC Senate districts (docs/baseline_districts.json).

Usage (one year per run; results are merged into the file):
    [HISTORY_FILE=<lookup.pkl.gz>] python build_district_baselines.py <year> <absentee file> <voter_stats zip> <history_stats zip> \
                                                                       <VR_Snapshot_<Election Day>.zip>

District lines change; the tracker compares today's districts with the same ground in past elections. Each voter
registered at that election is placed in today's district through their precinct at the time, using
docs/precinct_xwalk.json (build_district_xwalk.py); the State Board's precinct-level voter_stats and history_stats files
are placed the same way. For each district this writes the same fields as the county baselines in docs/baseline.json
(c, p, a, reg, rp, ra, fin, fp, fa, r, e, rr, re, fr, fe, dd, ddr, and with HISTORY_FILE lp and lpr), plus first-time
registrants (nwr, nv; see build_newreg_baseline.py). Counts only.
"""
import gc
import io
import json
import os
import sys
import zipfile

import pandas as pd

import build_baselines as bb
from build_newreg_baseline import PRIOR_BITS

KINDS = (('cd', 'CD'), ('hd', 'HD'), ('sd', 'SD'))


def snapshot(path):
    firsts, acts = [], []
    with zipfile.ZipFile(path) as z, z.open(z.namelist()[0]) as fb:
        enc = 'utf-16' if fb.peek(2)[:2] in (b'\xff\xfe', b'\xfe\xff') else 'latin-1'
        for ch in pd.read_csv(io.TextIOWrapper(fb, encoding=enc), sep='\t', dtype=str, keep_default_na=False, chunksize=1_000_000,
                              usecols=['ncid', 'status_cd', 'county_desc', 'precinct_abbrv', 'party_cd', 'registr_dt']):
            ch = ch.apply(lambda c: c.str.strip())
            rd = ch.registr_dt.str[:10]
            rd = rd.where(~rd.str.contains('/'), rd.str[6:10] + rd.str[0:2] + rd.str[3:5])
            firsts.append(pd.to_numeric(rd.str.replace('-', ''), errors='coerce').groupby(ch.ncid).min())
            a = ch[ch.status_cd.isin(['A', 'I'])]
            acts.append(pd.DataFrame({'k': (a.county_desc.str.upper() + '|' + a.precinct_abbrv).values, 'party': a.party_cd.values}, index=a.ncid.values))
    first = pd.concat(firsts).groupby(level=0).min()
    r = pd.concat(acts)
    del acts
    r = r[~r.index.duplicated()]
    r['first'] = first.reindex(r.index).values
    del first, firsts
    r['k'] = r.k.astype('category')
    r['party'] = r.party.astype('category')
    gc.collect()
    return r


def main():
    label, absentee, vstats, hstats, snap = sys.argv[1:6]
    xw = json.load(open('docs/precinct_xwalk.json'))[label]
    pct = {k: v[:3] for k, v in xw.items()}
    r = snapshot(snap)
    for i, (kind, _) in enumerate(KINDS):   # map each precinct once, then spread to voters
        r[kind] = r.k.map({k: v[i] for k, v in pct.items()}).astype('float32')
    r = r.drop(columns='k')
    gc.collect()
    print(f"{label}: {len(r):,} registered; placed in today's districts {r.cd.notna().mean():.2%}", flush=True)
    res = bb.year(label, absentee, vstats, hstats, geo={'a': r[['cd', 'hd', 'sd']], 'pct': pct})
    # registered low-propensity voters by party (lpr), and first-time registrants (nwr, nv)
    H = bb.HIST.b if bb.HIST is not None else None
    bits = r.index.to_series().map(H).fillna(0).astype(int).values if H is not None else None
    if H is not None and bb.PRIOR[label]:
        low = sum(((bits & x) > 0).astype(int) for x in bb.PRIOR[label]) <= 1
        if bb.SKIP[label]:
            low |= (bits & bb.SKIP[label][0]) == bb.SKIP[label][1]
        r['low'] = low
    new = (r['first'] // 10000 == int(label))
    if bits is not None and PRIOR_BITS[label]:
        new &= (bits & PRIOR_BITS[label]) == 0
    r['nw'] = new
    a = pd.read_csv(absentee, encoding='iso-8859-1', dtype=str, keep_default_na=False,
                    usecols=['ncid', 'ballot_req_type', 'ballot_rtn_dt', 'ballot_rtn_status', 'sdr'])
    a = a[a.ballot_rtn_status.str.upper().str.startswith('ACCEPTED')].copy()
    a['ev'] = a.ballot_req_type.str.upper().isin(['ONE-STOP', 'EARLY VOTING']).astype(int)
    a['when'] = pd.to_datetime(a.ballot_rtn_dt, format='%m/%d/%Y', errors='coerce')
    a = a.sort_values(['ev', 'when'], ascending=[False, False]).drop_duplicates('ncid').set_index('ncid')
    a['k'] = (a.when - pd.Timestamp(bb.YEARS[label])).dt.days
    a['sdr'] = a.sdr.str.strip().str.upper().eq('Y')
    a = a.join(r[['cd', 'hd', 'sd', 'nw']])
    a['nw'] = a.nw.fillna(False).astype(bool)
    ks = list(range(bb.K0, bb.K1 + 1))

    def cum(s):
        cols = []
        for col in (s.nw, s.sdr, s.nw & s.sdr):
            byk = s.k[col].value_counts()
            cols.append([int(byk[byk.index <= k].sum()) for k in ks])
        return [list(x) for x in zip(*cols)]

    for kind, pre in KINDS:
        for n, g in r.dropna(subset=[kind]).groupby(kind):
            name = f'{pre} {int(n)}'
            d = res['districts'][kind].setdefault(name, {})
            if 'low' in r:
                lp = g[g.low]
                d['lpr'] = [int((lp.party == p).sum()) for p in ('DEM', 'REP', 'UNA')]
            d['nwr'] = int(g.nw.sum())
            d['nv'] = cum(a[a[kind] == n])
    try:
        out = json.load(open('docs/baseline_districts.json'))
    except FileNotFoundError:
        out = {}
    out[label] = res
    out = {y: out[y] for y in sorted(out)}
    with open('docs/baseline_districts.json', 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    tot = sum(d['c'][-1] for d in res['districts']['cd'].values())
    print(f"{label}: written; congressional districts sum to {tot:,} early and mail votes by Election Day")


if __name__ == '__main__':
    main()
