"""Add first-time registrants to the Turnout Tracker's comparison baselines (docs/baseline.json). Run once per past year.

Usage:
    [HISTORY_FILE=<lookup.pkl.gz>] python build_newreg_baseline.py <year> <absentee file> <VR_Snapshot_<Election Day>.zip> [...]

A first-time registrant in a year is a voter who was registered (active or inactive) on that Election Day and whose
earliest North Carolina registration, across every county record the State Board's snapshot keeps for them, was made
that year. With HISTORY_FILE (the private lookup from build_history.py), voters with any earlier November voting history
are also left out. Voters who moved between counties or registered here before don't count.

For each year, statewide and for each county, adds:
  * nwr: first-time registrants that year
  * nv:  at the end of each day k (the same days as c), cumulative counts of accepted early and mail voters who were
         [first-time registrants, same-day registrants, first-time same-day registrants]
Counts only.
"""
import io
import json
import os
import sys
import zipfile

import pandas as pd

from build_baselines import K0, K1, YEARS, place

PRIOR_BITS = {'2018': 32 | 64 | 1, '2020': 64 | 1 | 2, '2022': 1 | 2 | 4, '2024': 1 | 2 | 4 | 8}   # history lookup bits for Novembers before each year (2016 = 1)
HISTORY_FILE = os.environ.get('HISTORY_FILE', '').strip()
HIST = pd.read_pickle(HISTORY_FILE).b if HISTORY_FILE else None


def first_registrations(snap):
    """Earliest registration date (YYYYMMDD) across all of each voter's records, and the county of their active record."""
    firsts, acts = [], []
    with zipfile.ZipFile(snap) as z, z.open(z.namelist()[0]) as fb:
        enc = 'utf-16' if fb.peek(2)[:2] in (b'\xff\xfe', b'\xfe\xff') else 'latin-1'
        for ch in pd.read_csv(io.TextIOWrapper(fb, encoding=enc), sep='\t', dtype=str, keep_default_na=False, chunksize=1_000_000,
                              usecols=['ncid', 'status_cd', 'county_desc', 'registr_dt']):
            ch = ch.apply(lambda c: c.str.strip())
            rd = ch.registr_dt.str[:10]
            rd = rd.where(~rd.str.contains('/'), rd.str[6:10] + rd.str[0:2] + rd.str[3:5])   # some snapshots use mm/dd/yyyy
            d = pd.to_numeric(rd.str.replace('-', ''), errors='coerce')
            firsts.append(d.groupby(ch.ncid).min())
            a = ch[ch.status_cd.isin(['A', 'I'])]
            acts.append(pd.Series(a.county_desc.values, index=a.ncid.values))
    first = pd.concat(firsts).groupby(level=0).min()
    act = pd.concat(acts)
    act = act[~act.index.duplicated()]
    return pd.DataFrame({'county': act, 'first': first.reindex(act.index).values})


def year(label, absentee, snap):
    y, start = int(label), pd.Timestamp(YEARS[label])
    r = first_registrations(snap)
    new = r['first'] // 10000 == y
    if HIST is not None and PRIOR_BITS[label]:
        new &= (HIST.reindex(r.index).fillna(0).astype(int) & PRIOR_BITS[label]) == 0
    nw = r[new]
    a = pd.read_csv(absentee, encoding='iso-8859-1', dtype=str, keep_default_na=False,
                    usecols=['ncid', 'county_desc', 'ballot_req_type', 'ballot_rtn_dt', 'ballot_rtn_status', 'sdr'])
    a = a[a.ballot_rtn_status.str.upper().str.startswith('ACCEPTED')].copy()
    a['ev'] = a.ballot_req_type.str.upper().isin(['ONE-STOP', 'EARLY VOTING']).astype(int)
    a['when'] = pd.to_datetime(a.ballot_rtn_dt, format='%m/%d/%Y', errors='coerce')
    a = a.sort_values(['ev', 'when'], ascending=[False, False]).drop_duplicates('ncid')
    a['k'] = (a.when - start).dt.days
    a['nw'] = a.ncid.isin(nw.index)
    a['sdr'] = a.sdr.str.strip().str.upper().eq('Y')
    ks = list(range(K0, K1 + 1))

    def cum(s):
        out = []
        for col in (s.nw, s.sdr, s.nw & s.sdr):
            byk = s.k[col].value_counts()
            out.append([int(byk[byk.index <= k].sum()) for k in ks])
        return [list(x) for x in zip(*out)]   # one [first-time, same-day, first-time same-day] triple per day

    res = {'North Carolina': {'nwr': int(len(nw)), 'nv': cum(a)}}
    cnt = nw.county.value_counts()
    for c, s in a.groupby('county_desc'):
        res[place(c)] = {'nwr': int(cnt.get(c, cnt.get(c.upper(), 0))), 'nv': cum(s)}
    st = res['North Carolina']
    print(f"{label}: {st['nwr']:,} first-time registrants; by Election Day {st['nv'][-1][0]:,} of them voted early or by mail; "
          f"{st['nv'][-1][1]:,} same-day registrants ({st['nv'][-1][2]:,} first-time)")
    return res


def main():
    args = sys.argv[1:]
    base = json.load(open('docs/baseline.json'))
    for i in range(0, len(args), 3):
        label = args[i]
        for name, v in year(*args[i:i + 3]).items():
            if name in base[label]['places']:
                base[label]['places'][name].update(v)
    with open('docs/baseline.json', 'w') as f:
        json.dump(base, f, separators=(',', ':'))


if __name__ == '__main__':
    main()
