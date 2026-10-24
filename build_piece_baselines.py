"""Past-year comparisons for the pieces where a county and a district, or two kinds of district, overlap, on TODAY's lines
(docs/pieces_base/<year>/<county|cd|hd|sd>/<name>.json).

Usage (one year per run):
    HISTORY_FILE=<lookup.pkl.gz> python build_piece_baselines.py <year> <absentee file> <voter_stats zip> <history_stats zip> \
                                                                  <VR_Snapshot_<Election Day>.zip>

Voters are placed in today's districts through their precinct at the time (docs/precinct_xwalk.json), as in
build_district_baselines.py, and in their county. Each piece gets the same series as the county baselines in
docs/baseline.json (c, p, reg, rp, fin, fp, lp, dd, r, e, rr, re, fr, fe, ddr), plus gp (party by race on each day) and lpr
(registered low-propensity voters by party). The age series are left out, and every series starts on the first day of early
voting (k0 = 0) to keep the files small. Each place's file lists its pieces in each other layer:
    {"y": year, "k0": 0, "p": {"<other layer>": {"<other place>": {...}}}}
Counts only.
"""
import gc
import json
import os
import shutil
import sys

import pandas as pd

import build_baselines as bb
from build_district_baselines import KINDS, snapshot

PAIRS = (('county', 'cd'), ('county', 'hd'), ('county', 'sd'), ('cd', 'hd'), ('cd', 'sd'), ('hd', 'sd'))
DROP = ('a', 'ra', 'fa')


def trim(b):
    i0 = -bb.K0   # index of k = 0
    out = {}
    for k, x in b.items():
        if k in DROP:
            continue
        if k in ('c',):
            out[k] = x[i0:]
        elif k in ('p', 'lp', 'r', 'e'):
            out[k] = [y[i0:] for y in x]
        elif k == 'gp':
            out[k] = [[z[i0:] for z in y] for y in x]
        else:
            out[k] = x
    return out


def write_files(label, pieces):
    files = {}
    for pair, rows in pieces.items():
        k1, k2 = pair.split('|')
        for kk, tb in rows.items():
            if not tb.get('reg'):   # a stray ballot whose county and district don't overlap in that year's registration: skip
                continue
            n1, n2 = kk.split('|')
            files.setdefault((k1, n1), {}).setdefault(k2, {})[n2] = tb
            files.setdefault((k2, n2), {}).setdefault(k1, {})[n1] = tb
    root = os.path.join('docs', 'pieces_base', label)
    shutil.rmtree(root, ignore_errors=True)
    for (k, n), inner in files.items():
        os.makedirs(os.path.join(root, k), exist_ok=True)
        with open(os.path.join(root, k, n + '.json'), 'w') as f:
            json.dump({'y': label, 'k0': 0, 'ev_start': bb.YEARS[label], 'p': inner}, f, separators=(',', ':'))
    print(f'{label}: wrote {len(files)} place files', flush=True)


def main():
    if sys.argv[1] == '--merge':   # python build_piece_baselines.py --merge <year> <part.json> ...: combine runs made with PIECE_PAIRS
        label, pieces = sys.argv[2], {}
        for f in sys.argv[3:]:
            pieces.update(json.load(open(f)))
        return write_files(label, pieces)
    label, absentee, vstats, hstats, snap = sys.argv[1:6]
    pairs = tuple(tuple(x.split('|')) for x in os.environ['PIECE_PAIRS'].split(',')) if os.environ.get('PIECE_PAIRS') else PAIRS
    xw = json.load(open('docs/precinct_xwalk.json'))[label]
    pct = {k: v[:3] for k, v in xw.items()}
    r = snapshot(snap)
    for i, (kind, _) in enumerate(KINDS):
        r[kind] = r.k.map({k: v[i] for k, v in pct.items()}).astype('float32')
    r['county'] = r.k.astype(str).str.split('|').str[0].map(bb.place).astype('category')
    r = r.drop(columns=['k', 'first'])
    gc.collect()
    lpr = {}   # registered low-propensity voters by party in each piece, first, so the snapshot can be let go
    if bb.HIST is not None and bb.PRIOR[label]:
        bits = r.index.to_series().map(bb.HIST.b).fillna(0).astype(int).values
        low = sum(((bits & x) > 0).astype(int) for x in bb.PRIOR[label]) <= 1
        if bb.SKIP[label]:
            low |= (bits & bb.SKIP[label][0]) == bb.SKIP[label][1]
        lp = r[low]
        for k1, k2 in pairs:
            def lab(k):
                x = lp[k]
                return x.astype(str) if k == 'county' else x.map(lambda n: None if pd.isna(n) else str(int(n)))
            l1, l2 = lab(k1), lab(k2)
            ok = l1.notna() & l2.notna() & (l1 != 'nan')
            t = pd.crosstab((l1[ok] + '|' + l2[ok]).values, lp.party[ok].values)
            lpr[k1 + '|' + k2] = {kk: [int(t.at[kk, x]) if x in t.columns else 0 for x in ('DEM', 'REP', 'UNA')] for kk in t.index}
        del lp, bits, low
    ga = r[['cd', 'hd', 'sd']].copy()
    del r
    gc.collect()
    res = bb.year(label, absentee, vstats, hstats, geo={'a': ga, 'pct': pct, 'pairs': pairs, 'free_hist': True})
    for pair, rows in res['pieces'].items():
        for kk, d in rows.items():
            if kk in lpr.get(pair, {}):
                d['lpr'] = lpr[pair][kk]
    pieces = {pair: {kk: trim(b) for kk, b in rows.items()} for pair, rows in res['pieces'].items()}
    if os.environ.get('PART_OUT'):   # one part of a year built in several runs (to stay within memory); see --merge
        with open(os.environ['PART_OUT'], 'w') as f:
            json.dump(pieces, f, separators=(',', ':'))
        print(f"{label}: wrote part {os.environ['PART_OUT']}", flush=True)
        return
    write_files(label, pieces)

if __name__ == '__main__':
    main()
