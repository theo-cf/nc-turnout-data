"""Build the private voting-history lookup used for the Turnout Tracker's "Voter Propensity" view.

Usage:
    python build_history.py --history ncvhis_Statewide.zip --voters ncvoter_Statewide.zip --out <lookup.pkl.gz>

Reads the State Board's statewide voter history and registration files and writes one row per voter ID
(NCID) with:
  * b:   which November general elections the voter cast a ballot in, as bits
         (2016 = 1, 2018 = 2, 2020 = 4, 2022 = 8, 2024 = 16)
  * reg: registration date as YYYYMMDD (0 if unknown)
  * by:  birth year (0 if unknown)
  * nw:  (with --snap) 1 if the voter's current registration is their first in North Carolina and was made in 2026:
         registered in 2026, not in the State Board's November 2024 registration snapshot under any county, and no
         voting history. Voters in the 2024 snapshot but no longer registered are added with b = 0 and nw = 0, so that
         any voter ID missing from the lookup is a registration newer than these files.

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

import numpy as np
import pandas as pd

XT_RACES = ['B', 'O', 'A', 'W']   # Black, Other, Asian, White: the race rows on the shareable graphics
ED_METHODS = {'ELECTION DAY IN-PERSON', 'ELECTION DAY CURBSIDE', 'PROVISIONAL', 'TRANSFER'}   # the history file's Election Day methods
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


def snap_ids(path):
    """Every voter ID in a State Board registration snapshot (any county, any status)."""
    import io
    ids = []
    with zipfile.ZipFile(path) as z, z.open(z.namelist()[0]) as fb:
        enc = 'utf-16' if fb.peek(2)[:2] in (b'\xff\xfe', b'\xfe\xff') else 'latin-1'
        for ch in pd.read_csv(io.TextIOWrapper(fb, encoding=enc), sep='\t', dtype=str, keep_default_na=False, usecols=['ncid'], chunksize=2_000_000):
            ids.append(ch.ncid.str.strip().unique())
    import numpy as np
    return pd.Index(np.concatenate(ids)).unique()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--history', nargs='+', required=True)
    ap.add_argument('--voters', nargs='+', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--pool', default='')
    ap.add_argument('--snap', default='', help='VR_Snapshot_20241105.zip, for first-time registrants')
    a = ap.parse_args()

    # e: voted on Election Day in November 2022 (in person, curbside, provisional or transfer), for the pyramid's "already voted" bars
    h = read(a.history, ['ncid', 'election_lbl', 'voting_method'],
             lambda c: c[c.election_lbl.isin(ELECTIONS)].assign(e=lambda d: (d.election_lbl == '11/08/2022') & d.voting_method.str.strip().str.upper().isin(ED_METHODS)).drop(columns='voting_method'))
    e22 = pd.Index(h.ncid[h.e].unique())
    h = h.drop(columns='e').drop_duplicates()
    bits = h.election_lbl.map(ELECTIONS).groupby(h.ncid).sum().astype('uint8')

    v = read(a.voters, ['ncid', 'status_cd', 'registr_dt', 'birth_year', 'party_cd', 'county_desc', 'cong_dist_abbrv', 'nc_house_abbrv', 'nc_senate_abbrv',
                                'race_code', 'ethnic_code', 'age_at_year_end', 'precinct_abbrv', 'precinct_desc'])
    v['rank'] = v.status_cd.map({'A': 0, 'I': 1}).fillna(2)            # prefer the active/inactive registration
    v = v.sort_values('rank').drop_duplicates('ncid').set_index('ncid')
    reg = pd.to_datetime(v.registr_dt, format='%m/%d/%Y', errors='coerce')
    out = pd.DataFrame(index=bits.index.union(v.index))
    out['b'] = bits.reindex(out.index).fillna(0).astype('uint8')
    out['reg'] = reg.dt.strftime('%Y%m%d').reindex(out.index).fillna('0').astype('int32')
    out['by'] = pd.to_numeric(v.birth_year, errors='coerce').reindex(out.index).fillna(0).astype('int16')
    out['e22'] = out.index.isin(e22).astype('uint8')   # voted on Election Day 2022
    if a.snap:
        snap = snap_ids(a.snap)
        cur = v.status_cd.isin(['A', 'I']) & (reg.dt.year == 2026)
        nw = cur & ~v.index.isin(snap)
        nw &= (out.b.reindex(v.index).fillna(0) == 0).values
        out['nw'] = 0
        out.loc[v.index[nw], 'nw'] = 1
        out['nw'] = out.nw.astype('uint8')
        extra = snap.difference(out.index)
        out = pd.concat([out, pd.DataFrame({c: 0 for c in out.columns}, index=extra).astype(out.dtypes.to_dict())])
        print(f'first-time 2026 registrants: {int(nw.sum()):,}; 2024 snapshot voters added: {len(extra):,}')

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
        # The same cells once per party ('xpr': party * 32 + cell; DEM, REP, UNA), for the crosstabs' party filter
        pcell = r.party_cd.map({'DEM': 0, 'REP': 1, 'UNA': 2}) * 32 + cell
        P['xpr'] = {'state': xt(pcell, 96), 'county': {COUNTY_NAME.get(c, c.title()): xt(pcell[g.index], 96) for c, g in r.groupby('county_desc')}}
        # Registered voters by party x voting-history group (ncsbe.history_tier), statewide and by county, for the pyramid
        from ncsbe import history_tier, tier_counts
        tt = history_tier(b, out.reg.reindex(r.index).fillna(0).astype(int), out.by.reindex(r.index).fillna(0).astype(int) >= 2003, 2026)
        P['tr'] = {'state': tier_counts(r.party_cd, tt), 'county': {COUNTY_NAME.get(c, c.title()): tier_counts(r.party_cd[g.index], tt[g.index]) for c, g in r.groupby('county_desc')}}
        # Registered voters (active and inactive) who voted on Election Day 2022, by today's party, statewide and by county
        ed = r[out.e22.reindex(r.index).fillna(0).astype(bool).values]
        cnt3 = lambda g: [int((g.party_cd == x).sum()) for x in ('DEM', 'REP', 'UNA')]
        P['e22'] = {'state': cnt3(ed), 'county': {COUNTY_NAME.get(c, c.title()): cnt3(g) for c, g in ed.groupby('county_desc')}}
        for k, col in (('cd', 'cong_dist_abbrv'), ('hd', 'nc_house_abbrv'), ('sd', 'nc_senate_abbrv')):   # the same two, by today's districts
            d = pd.to_numeric(r[col], errors='coerce')
            P['tr'][k] = {str(int(x)): tier_counts(r.party_cd[g.index], tt[g.index]) for x, g in r[d.notna()].groupby(d.dropna().astype(int))}
            d = pd.to_numeric(ed[col], errors='coerce')
            P['e22'][k] = {str(int(x)): cnt3(g) for x, g in ed[d.notna()].groupby(d.dropna().astype(int))}
        P['pr'] = {'state': xt(pc, 6), 'county': {COUNTY_NAME.get(c, c.title()): xt(pc[g.index], 6) for c, g in r.groupby('county_desc')}}
        # By precinct, for the precinct map layer: registered voters [all, DEM, REP, UNA] and low-propensity ones [DEM, REP, UNA];
        # the precinct name each code goes by in the absentee file; and each precinct's district (where most of its voters are).
        cn = r.county_desc.str.strip().str.upper().map(lambda c: COUNTY_NAME.get(c, c.title()))
        key = (cn + '|' + r.precinct_abbrv.str.strip()).astype('category')
        ok = (r.precinct_abbrv.str.strip() != '').values
        kk, party, low = key[ok], r.party_cd[ok].values, r.low[ok].values
        reg = pd.crosstab(kk.values, party)
        lowc = pd.crosstab(kk.values[low], party[low])
        def top(col):   # the most common value of a column in each precinct
            t = pd.DataFrame({'k': kk.values, 'v': col[ok].str.strip().values})
            t = t[t.v != '']
            return t.groupby(['k', 'v'], observed=True).size().reset_index().sort_values(0).drop_duplicates('k', keep='last').set_index('k').v
        dist = {c: pd.to_numeric(top(r[c]), errors='coerce') for c in ('cong_dist_abbrv', 'nc_house_abbrv', 'nc_senate_abbrv')}
        names = top(r.precinct_desc)
        pct = {}
        for k in reg.index:
            c, p = k.split('|', 1)
            g = lambda tab, x: int(tab.at[k, x]) if (k in tab.index and x in tab.columns) else 0
            dd = [None if pd.isna(dist[col].get(k)) else int(dist[col].get(k)) for col in dist]
            pct.setdefault(c, {})[p] = [int(reg.loc[k].sum())] + [g(reg, x) for x in ('DEM', 'REP', 'UNA')] + [g(lowc, x) for x in ('DEM', 'REP', 'UNA')] + [dd, str(names.get(k, ''))]
        P['pct'] = pct
        # Hispanic or Latino registered voters (the ethnicity question) by propensity: [low, regular], for the county map
        hl = r.ethnic_code.str.strip().eq('HL')
        hc = (~r.low).astype(int)[hl.values]
        P['hr'] = {'state': xt(hc, 2), 'county': {COUNTY_NAME.get(c, c.title()): xt(hc[g.index], 2) for c, g in r[hl.values].groupby('county_desc')}}
        for k, col in (('cd', 'cong_dist_abbrv'), ('hd', 'nc_house_abbrv'), ('sd', 'nc_senate_abbrv')):   # the same, by today's districts
            d = pd.to_numeric(r[col], errors='coerce')
            P['xr'][k] = {str(int(n)): xt(cell[g.index], 32) for n, g in r[d.notna()].groupby(d.dropna().astype(int))}
            P['xpr'][k] = {str(int(n)): xt(pcell[g.index], 96) for n, g in r[d.notna()].groupby(d.dropna().astype(int))}
            P['pr'][k] = {str(int(n)): xt(pc[g.index], 6) for n, g in r[d.notna()].groupby(d.dropna().astype(int))}
        if 'nw' in out:   # first-time 2026 registrants (active and inactive), statewide and by county
            n = r[out.nw.reindex(r.index).fillna(0).astype(bool).values]
            P['nw'] = {'state': int(len(n)), 'county': {COUNTY_NAME.get(c, c.title()): int(len(g)) for c, g in n.groupby('county_desc')}}
            for k, col in (('cd', 'cong_dist_abbrv'), ('hd', 'nc_house_abbrv'), ('sd', 'nc_senate_abbrv')):
                d = pd.to_numeric(n[col], errors='coerce')
                P['nw'][k] = {str(int(x)): int(len(g)) for x, g in n[d.notna()].groupby(d.dropna().astype(int))}
        # Pieces: where a county and a district, or two kinds of district, overlap ("Wake|4" under "county|cd"), for showing only
        # the part of a place inside the one picked. Registered voters [all; DEM, REP, UNA, other; four age groups; races; ethnicities],
        # low-propensity ones by party, and the race x age x propensity, party x propensity and Hispanic counts above.
        from ncsbe import ETHS, RACES, eth_code, race_code
        loc = pd.DataFrame({'county': r.county_desc.str.strip().str.upper().map(lambda c: COUNTY_NAME.get(c, c.title())).values,
                            'cd': pd.to_numeric(r.cong_dist_abbrv, errors='coerce').values, 'hd': pd.to_numeric(r.nc_house_abbrv, errors='coerce').values,
                            'sd': pd.to_numeric(r.nc_senate_abbrv, errors='coerce').values}, index=r.index)
        pty = r.party_cd.where(r.party_cd.isin(['DEM', 'REP', 'UNA']), 'OTH').map({'DEM': 0, 'REP': 1, 'UNA': 2, 'OTH': 3})
        rc = r.race_code.str.strip().map({x: race_code(x) for x in r.race_code.str.strip().unique()}).map({x: i for i, x in enumerate(RACES)})
        ec = r.ethnic_code.str.strip().map({x: eth_code(x) for x in r.ethnic_code.str.strip().unique()}).map({x: i for i, x in enumerate(ETHS)})
        lpp = r.party_cd.map({'DEM': 0, 'REP': 1, 'UNA': 2}).where(r.low)
        def lab(k):
            x = loc[k]
            return x if k == 'county' else x.map(lambda n: None if pd.isna(n) else str(int(n)))
        attrs = [('pty', pty, 4), ('age', ai, 4), ('race', rc, len(RACES)), ('eth', ec, len(ETHS)), ('lpr', lpp, 3), ('xr', cell, 32), ('pr', pc, 6),
                 ('hr', hc.reindex(r.index), 2)]
        attrs = [(nm, pd.to_numeric(x, errors='coerce').values, n) for nm, x, n in attrs]
        pieces = {}
        for k1, k2 in (('county', 'cd'), ('county', 'hd'), ('county', 'sd'), ('cd', 'hd'), ('cd', 'sd'), ('hd', 'sd')):
            key = lab(k1) + '|' + lab(k2)
            codes, uniq = pd.factorize(key)   # missing district -> NaN key -> code -1
            ok = codes >= 0
            G = len(uniq)
            res = {u: {'n': 0} for u in uniq}
            nn = np.bincount(codes[ok], minlength=G)
            for gi, u in enumerate(uniq):
                res[u]['n'] = int(nn[gi])
            for nm, x, n in attrs:
                m = ok & ~np.isnan(x)
                t = np.bincount(codes[m] * n + x[m].astype(int), minlength=G * n).reshape(G, n)
                for gi, u in enumerate(uniq):
                    res[u][nm] = [int(y) for y in t[gi]]
            pieces[k1 + '|' + k2] = res
        P['pieces'] = pieces
        with open(a.pool, 'w') as f:
            json.dump(P, f, separators=(',', ':'))
        print(f"low-propensity registered voters (DEM, REP, UNA): {P['state']}")
    print(f'history lookup: {len(out):,} voters; ' + ', '.join(f"{l[-4:]} {int(((out.b & b) > 0).sum()):,}" for l, b in ELECTIONS.items()))


if __name__ == '__main__':
    main()
