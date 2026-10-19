"""Match past precincts to TODAY's congressional, NC House and NC Senate districts (docs/precinct_xwalk.json).

Usage:
    python build_district_xwalk.py <current registration: ncvoter_Statewide.zip or a folder of ncvoter<N>.zip> \
                                   2018 VR_Snapshot_20181106.zip 2022 VR_Snapshot_20221108.zip 2024 VR_Snapshot_20241105.zip

Today's districts are made of today's precincts, and each voter in today's registration file is assigned to a district.
Past elections were run in past precincts, some of which have since been renamed, split or merged. To place a past
precinct inside today's districts, this uses the voters who were registered in it at that election and still live at the
same address today (same voter ID, house number, first word of the street name and ZIP code): their current districts
show which of today's districts that piece of ground now sits in. Each past precinct is counted in the district where
most of those voters now are; the share that agrees is kept, so precincts that today's lines split can be measured.

Writes, for each year, {"<COUNTY>|<precinct code>": [cd, hd, sd, cd share, hd share, sd share, voters matched]}. Counts only.
"""
import glob
import io
import json
import os
import re
import sys
import zipfile

import pandas as pd

DIRS = {'N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW', 'NORTH', 'SOUTH', 'EAST', 'WEST'}
MIN_MATCH = 10   # past precincts with fewer matched voters fall back to today's precinct with the same code


def norm_num(s):
    return pd.to_numeric(s.str.extract(r'(\d+)', expand=False), errors='coerce')


def current(path):
    files = sorted(glob.glob(os.path.join(path, 'ncvoter*.zip'))) if os.path.isdir(path) else [path]
    parts = []
    cols = ['ncid', 'county_desc', 'status_cd', 'res_street_address', 'zip_code', 'precinct_abbrv', 'cong_dist_abbrv', 'nc_house_abbrv', 'nc_senate_abbrv']
    for f in files:
        with zipfile.ZipFile(f) as z:
            for ch in pd.read_csv(z.open(z.namelist()[0]), sep='\t', dtype=str, encoding='latin-1', keep_default_na=False, usecols=cols, chunksize=1_000_000):
                ch = ch[ch.status_cd.isin(['A', 'I'])].apply(lambda c: c.str.strip())
                tok = ch.res_street_address.str.split()
                house = tok.str[0]
                st = tok.str[1].where(~tok.str[1].isin(DIRS) | (tok.str.len() < 4), tok.str[2])
                key = ch.county_desc + '|' + house.fillna('') + '|' + st.fillna('') + '|' + ch.zip_code.str[:5]
                parts.append(pd.DataFrame({'key': key.values, 'county': ch.county_desc.values, 'pct': ch.precinct_abbrv.values,
                                           'cd': norm_num(ch.cong_dist_abbrv).values, 'hd': norm_num(ch.nc_house_abbrv).values,
                                           'sd': norm_num(ch.nc_senate_abbrv).values}, index=ch.ncid.values))
    cur = pd.concat(parts)
    return cur[~cur.index.duplicated()]


def mode_share(g, col):
    c = g.groupby(['k', col]).n.sum().reset_index().sort_values(['k', 'n'], ascending=[True, False])
    tot = c.groupby('k').n.sum()
    top = c.drop_duplicates('k').set_index('k')
    return top[col], (top.n / tot).round(3)


def year(snap, cur, today):
    agg = []
    with zipfile.ZipFile(snap) as z, z.open(z.namelist()[0]) as fb:
        enc = 'utf-16' if fb.peek(2)[:2] in (b'\xff\xfe', b'\xfe\xff') else 'latin-1'
        for ch in pd.read_csv(io.TextIOWrapper(fb, encoding=enc), sep='\t', dtype=str, keep_default_na=False, chunksize=1_000_000,
                              usecols=['ncid', 'status_cd', 'county_desc', 'precinct_abbrv', 'house_num', 'street_name', 'zip_code']):
            ch = ch[ch.status_cd.str.strip().isin(['A', 'I'])].apply(lambda c: c.str.strip())
            ch = ch[ch.precinct_abbrv != '']
            key = ch.county_desc + '|' + ch.house_num + '|' + ch.street_name.str.split().str[0].fillna('') + '|' + ch.zip_code.str[:5]
            m = cur.reindex(ch.ncid.values)
            same = (m.key.values == key.values)
            d = pd.DataFrame({'k': (ch.county_desc + '|' + ch.precinct_abbrv).values, 'cd': m.cd.values, 'hd': m.hd.values, 'sd': m.sd.values})[same]
            agg.append(d.groupby(['k', 'cd', 'hd', 'sd']).size().rename('n').reset_index())
            # every past precinct, matched or not, so none goes missing
            agg.append(pd.DataFrame({'k': pd.unique((ch.county_desc + '|' + ch.precinct_abbrv).values), 'cd': -1, 'hd': -1, 'sd': -1, 'n': 0}))
    g = pd.concat(agg)
    g = g.groupby(['k', 'cd', 'hd', 'sd']).n.sum().reset_index()
    real = g[g.cd >= 0]
    n = real.groupby('k').n.sum()
    out = {}
    cols = {c: mode_share(real, c) for c in ('cd', 'hd', 'sd')}
    fallback = unmatched = 0
    for k in g.k.unique():
        if n.get(k, 0) >= MIN_MATCH:
            out[k] = [int(cols[c][0][k]) for c in ('cd', 'hd', 'sd')] + [float(cols[c][1][k]) for c in ('cd', 'hd', 'sd')] + [int(n[k])]
        elif k in today:   # too few voters to tell: use today's precinct with the same code
            out[k] = today[k] + [1.0, 1.0, 1.0, int(n.get(k, 0))]
            fallback += 1
        else:
            unmatched += 1
    return out, fallback, unmatched


def main():
    cur = current(sys.argv[1])
    t = cur.dropna(subset=['cd', 'hd', 'sd']).assign(k=lambda d: d.county + '|' + d.pct)
    today = {}
    for k, grp in t.groupby('k'):
        today[k] = [int(grp[c].mode().iat[0]) for c in ('cd', 'hd', 'sd')]
    split = {c: int((t.groupby('k')[c].nunique() > 1).sum()) for c in ('cd', 'hd', 'sd')}
    print(f'today: {len(today)} precincts; split between districts: {split}')
    res = {'today': today}
    args = sys.argv[2:]
    for i in range(0, len(args), 2):
        out, fb, un = year(args[i + 1], cur, today)
        res[args[i]] = out
        sh = pd.DataFrame([v[3:7] for v in out.values()], columns=['cd', 'hd', 'sd', 'n'])
        print(f"{args[i]}: {len(out)} precincts placed ({fb} by code only), {un} not placed; matched voters {int(sh.n.sum()):,}; "
              f"precincts under 95% agreement: cd {(sh.cd < .95).sum()}, hd {(sh.hd < .95).sum()}, sd {(sh.sd < .95).sum()}", flush=True)
    with open('docs/precinct_xwalk.json', 'w') as f:
        json.dump(res, f, separators=(',', ':'))


if __name__ == '__main__':
    main()
