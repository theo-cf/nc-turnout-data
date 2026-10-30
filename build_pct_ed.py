"""Past Election Day turnout on TODAY's precincts, for the tracker's "Election Day in past years" precinct view
(docs/pct_ed/<year>.json).

Usage (one year per run; the past elections don't change):
    python -I build_pct_ed.py <year> <history_stats_<date>.zip> <VR_Snapshot_<Election Day>.zip> \
                              <current registration: ncvoter_Statewide.zip or a folder of ncvoter<N>.zip>

Votes come from the State Board's history_stats file for that election: final counts by county, precinct, party and voting
method, for everyone who voted (including voters since removed from the rolls). Methods are grouped as in build_ed_history.py:
  * Election Day: in person (V), curbside (C), provisional (P) and transfer (T);
  * early and mail: one-stop (O, EV), one-stop curbside (U, EC), absentee by mail (M) and the odd absentee (A).

Precinct lines move between elections, so each past precinct is spread over today's precincts the way
build_precinct_baselines.py spreads voters who have since moved: in the same proportions as its registered voters at that
election who still live at the same address today (same voter ID, house number, first word of the street name and ZIP code).
A past precinct with fewer than 10 such voters goes to today's precinct with the same code, if there is one. Registered voters
at that election (active and inactive, from the VR snapshot) are placed the same way as in build_precinct_baselines.py
(same-address voters where they live now, everyone else spread), so turnout can be measured on today's lines.

Privacy: a precinct gets vote counts only with at least PRECINCT_MIN Election Day votes, and one more is hidden when a county
would otherwise have exactly one hidden precinct with votes (same rule as build_data.also_hide).

Output: {"y": year, "min": 10, "placed": share of votes placed, "c": {"<County>": {"<today's code>": [Election Day DEM, REP,
UNA, other, early and mail DEM, REP, UNA, other]}}, "reg": {"<County>": {"<today's code>": registered voters then}}}.
Counts only.
"""
import gc
import io
import json
import os
import sys
import zipfile

import numpy as np
import pandas as pd

from build_precinct_baselines import MIN_MATCH, current, place

PRECINCT_MIN = 10
METHOD = {'V': 0, 'C': 0, 'P': 0, 'T': 0, 'O': 1, 'EV': 1, 'U': 1, 'EC': 1, 'M': 1, 'A': 1}
PARTIES = ['DEM', 'REP', 'UNA']


def votes(path):
    """that election's votes by past precinct ("COUNTY|code"), method (0 Election Day, 1 early or mail) and party (0-3)"""
    with zipfile.ZipFile(path) as zf:
        d = pd.read_csv(zf.open(zf.namelist()[0]), sep='\t', dtype=str, encoding='latin-1', keep_default_na=False,
                        usecols=['county_desc', 'precinct_abbrv', 'party_cd', 'voting_method', 'total_voters'])
    d = d.apply(lambda c: c.str.strip())
    m = d.voting_method.map(METHOD)
    if m.isna().any():
        raise SystemExit(f'STOPPING: unknown voting methods in {path}: {sorted(set(d.voting_method[m.isna()]))}')
    out = pd.DataFrame({'old': d.county_desc.str.upper() + '|' + d.precinct_abbrv, 'm': m.astype(int),
                        'p': d.party_cd.map({p: i for i, p in enumerate(PARTIES)}).fillna(3).astype(int),
                        'n': pd.to_numeric(d.total_voters, errors='coerce').fillna(0).astype(int)})
    return out.groupby(['old', 'm', 'p']).n.sum().reset_index()


def also_hide(counts):
    voted = {p: n for p, n in counts.items() if n > 0}
    small = [p for p, n in voted.items() if n < PRECINCT_MIN]
    if len(small) != 1 or len(voted) < 2:
        return None
    shown = sorted((n, p) for p, n in voted.items() if n >= PRECINCT_MIN)
    return shown[0][1] if shown else None


def main():
    label, hs, snap, reg = sys.argv[1:5]
    V = votes(hs)
    print(f'{label}: {V.n.sum():,} votes, {V.n[V.m == 0].sum():,} on Election Day', flush=True)
    cur = current(reg)
    print(f'today: {len(cur):,} voters', flush=True)
    regs = []
    with zipfile.ZipFile(snap) as z, z.open(z.namelist()[0]) as fb:
        enc = 'utf-16' if fb.peek(2)[:2] in (b'\xff\xfe', b'\xfe\xff') else 'latin-1'
        for ch in pd.read_csv(io.TextIOWrapper(fb, encoding=enc), sep='\t', dtype=str, keep_default_na=False, chunksize=1_000_000,
                              usecols=['ncid', 'status_cd', 'county_desc', 'precinct_abbrv', 'house_num', 'street_name', 'zip_code']):
            ch = ch.apply(lambda c: c.str.strip())
            ch = ch[ch.status_cd.isin(['A', 'I']) & (ch.precinct_abbrv != '')].drop_duplicates('ncid')
            key = ch.county_desc.str.upper() + '|' + ch.house_num + '|' + ch.street_name.str.split().str[0].fillna('') + '|' + ch.zip_code.str[:5]
            m = cur.reindex(ch.ncid.values)
            same = m.key.values == key.values
            d = pd.DataFrame({'old': (ch.county_desc.str.upper() + '|' + ch.precinct_abbrv).values,
                              'new': np.where(same, m.pct.astype(object).values, None)})
            d['new'] = d.new.fillna('')
            regs.append(d.groupby(['old', 'new']).size().rename('n').reset_index())
            del d, m
            gc.collect()
    today = set(cur.pct.astype(str).unique())
    del cur
    gc.collect()
    R = pd.concat(regs).groupby(['old', 'new']).n.sum().reset_index()
    print(f"{label}: {R.n.sum():,} registered, {R.n[R.new != ''].sum() / R.n.sum():.1%} at the same address today", flush=True)

    # each past precinct's spread over today's precincts, from its same-address voters (as in build_precinct_baselines.py)
    mt = R[R.new != ''].groupby(['old', 'new']).n.sum().reset_index()
    tot = mt.groupby('old').n.sum()
    mt['w'] = mt.n / mt.old.map(tot)
    share = mt[mt.old.map(tot) >= MIN_MATCH][['old', 'new', 'w']]
    olds = set(R.old) | set(V.old)
    few = [o for o in olds if tot.get(o, 0) < MIN_MATCH and o in today]
    share = pd.concat([share, pd.DataFrame({'old': few, 'new': few, 'w': 1.0})])

    # registered voters then: same-address voters where they live now, everyone else spread
    direct = R[R.new != ''].assign(w=1.0)
    rest = R[R.new == ''].drop(columns='new').merge(share, on='old')
    rg = pd.concat([direct, rest]).assign(x=lambda t: t.n * t.w).groupby('new').x.sum()

    # votes: each past precinct spread over today's
    sp = V.merge(share, on='old')
    sp['x'] = sp.n * sp.w
    placed = sp.x.sum() / V.n.sum()
    lost = V[~V.old.isin(set(share.old))].groupby('old').n.sum().sort_values(ascending=False)
    print(f"{label}: {placed:.2%} of votes placed in today's precincts; not placed: {lost.sum():,} votes in {len(lost)} past precincts "
          f"{dict(lost.head(8))}", flush=True)
    vt = sp.groupby(['new', 'm', 'p']).x.sum().unstack(['m', 'p'], fill_value=0)

    out, regout = {}, {}
    for pid, x in rg.items():
        c, p = pid.split('|', 1)
        regout.setdefault(place(c), {})[p] = int(round(x))
    rows = {}
    for pid in vt.index:
        c, p = pid.split('|', 1)
        g = vt.loc[pid]
        rows.setdefault(place(c), {})[p] = [int(round(g.get((m, q), 0))) for m in (0, 1) for q in range(4)]
    hidden = 0
    for c, ps in rows.items():
        extra = also_hide({p: sum(v[:4]) for p, v in ps.items()})
        for p, v in ps.items():
            if sum(v[:4]) >= PRECINCT_MIN and p != extra:
                out.setdefault(c, {})[p] = v
            elif sum(v[:4]) > 0:
                hidden += 1
    os.makedirs(os.path.join('docs', 'pct_ed'), exist_ok=True)
    with open(os.path.join('docs', 'pct_ed', label + '.json'), 'w') as f:
        json.dump({'y': label, 'min': PRECINCT_MIN, 'placed': round(placed, 4), 'c': out, 'reg': regout}, f, separators=(',', ':'))
    ed = sum(sum(v[:4]) for ps in rows.values() for v in ps.values())
    shown = sum(sum(v[:4]) for ps in out.values() for v in ps.values())
    print(f"{label}: wrote {len(out)} counties, {sum(len(x) for x in out.values()):,} precincts with counts ({hidden} hidden); "
          f"Election Day {ed:,} placed, {shown:,} in shown precincts; {sum(len(x) for x in regout.values()):,} precincts with registered voters",
          flush=True)


if __name__ == '__main__':
    main()
