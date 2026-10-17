"""Build the 2022 and 2024 comparison baselines for the Turnout Tracker (docs/baseline.json).

Run once (the past elections don't change):
    python build_baselines.py 2022 <absentee_20221108.csv> <voter_stats_20221108.zip> <history_stats_20221108.zip> \
                              2024 <absentee_20241105.csv> <voter_stats_20241105.zip> <history_stats_20241105.zip>

All files are from the State Board's election archives, https://s3.amazonaws.com/dl.ncsbe.gov/ENRS/<date>/.

For each year, statewide and for each county:
  * c / p / a: votes cast so far (accepted early in-person and mail ballots, one per voter), in total, by
    party and by age group, at the end of each day from 14 days before early voting began through Election
    Day. Day k is the k-th day after early voting began (k = 0 is its first day; Election Day is k = 19 in
    2022, 2024 and 2026). Counted with the same rules as the 2026 tracker.
  * reg / rp / ra: registered voters as of that election (active and inactive), from the State Board's
    voter_stats file, in total, by party and by age group.
  * fin / fp / fa: final turnout from the State Board's history_stats file, in total, by party and by age.
  * lp: (with HISTORY_FILE set) low-propensity voters so far, by party (DEM, REP, UNA), on the same days as p:
    voters who cast a ballot in 0 or 1 of the three previous November elections (2016-2020 for 2022,
    2018-2022 for 2024) in North Carolina, and for 2022 also voters who cast a ballot in 2016 and 2020 but
    not 2018 (the midterm-skippers, matching 2026's rule). Counts only.
  * dd: early in-person voters on each day of early voting (k = 0 to 16): [DEM, REP, UNA, OTH, the four age groups,
    and with HISTORY_FILE, low-propensity DEM, REP, UNA].
Age groups are the State Board's: 18-25, 26-40, 41-65, 66 and older. Counts only.
"""
import json
import os
import sys
import zipfile

import pandas as pd

from ncsbe import COUNTY_NAME

YEARS = {'2022': '2022-10-20', '2024': '2024-10-17'}   # first day of in-person early voting
# Voter propensity: the last three November elections before each year, as bits in build_history.py's lookup
# (2016 = 1, 2018 = 2, 2020 = 4, 2022 = 8). Optional: set HISTORY_FILE to that private lookup.
PRIOR = {'2022': (1, 2, 4), '2024': (2, 4, 8)}
# Also low-propensity: voted in both presidential elections but skipped the midterm between them (2022 only, the
# year that lines up with 2026; 2024 has no midterm-skipper equivalent): (bits to check, pattern).
SKIP = {'2022': (7, 5), '2024': None}
HISTORY_FILE = os.environ.get('HISTORY_FILE', '').strip()
HIST = pd.read_pickle(HISTORY_FILE) if HISTORY_FILE else None
K0, K1 = -14, 19
EV_LEN = 17   # days of in-person early voting in 2022, 2024 and 2026
PARTIES = ['DEM', 'REP', 'UNA', 'OTH']
AGE_EDGES = [17, 25, 40, 65, 200]
AGE_LABELS = {'Age 18 - 25': 0, 'Age 26 - 40': 1, 'Age 41 - 65': 2, 'Age Over 66': 3}


def party(s):
    return s.where(s.isin(PARTIES[:3]), 'OTH')


def place(c):
    return COUNTY_NAME.get(c, c.title())


def read_stats(path):
    with zipfile.ZipFile(path) as zf:
        d = pd.read_csv(zf.open(zf.namelist()[0]), sep='\t', dtype=str, encoding='latin-1', keep_default_na=False)
    d['n'] = pd.to_numeric(d.total_voters, errors='coerce').fillna(0).astype(int)
    d['pp'] = party(d.party_cd)
    d['ag'] = d.age.map(AGE_LABELS)
    if d.ag.isna().any():
        raise SystemExit(f'STOPPING: unknown age groups in {path}: {sorted(set(d.age[d.ag.isna()]))}')
    return d


def year(label, absentee, vstats, hstats):
    start = pd.Timestamp(YEARS[label])
    ks = list(range(K0, K1 + 1))
    a = pd.read_csv(absentee, encoding='iso-8859-1', dtype=str, keep_default_na=False,
                    usecols=['ncid', 'county_desc', 'voter_party_code', 'age', 'ballot_req_type', 'ballot_rtn_dt', 'ballot_rtn_status'])
    a = a[a.ballot_rtn_status.str.upper().str.startswith('ACCEPTED')].copy()
    a['ev'] = a.ballot_req_type.str.upper().isin(['ONE-STOP', 'EARLY VOTING']).astype(int)
    a['when'] = pd.to_datetime(a.ballot_rtn_dt, format='%m/%d/%Y', errors='coerce')
    a = a.sort_values(['ev', 'when'], ascending=[False, False]).drop_duplicates('ncid')
    a['k'] = (a.when - start).dt.days
    a['pp'] = party(a.voter_party_code)
    a['ag'] = pd.cut(pd.to_numeric(a.age, errors='coerce'), AGE_EDGES, labels=False)
    if HIST is not None:
        bits = a.ncid.map(HIST.b).fillna(0).astype(int)
        a['low'] = sum(((bits & b) > 0).astype(int) for b in PRIOR[label]) <= 1
        if SKIP[label]:
            a['low'] |= (bits & SKIP[label][0]) == SKIP[label][1]
    v, h = read_stats(vstats), read_stats(hstats)

    def cum(s, col=None, vals=None):
        if col is None:
            byk = s.k.value_counts()
            return [int(byk[byk.index <= k].sum()) for k in ks]
        return [cum(s[s[col] == x]) for x in vals]

    def block(s, vs, hs):
        return {'c': cum(s), 'p': cum(s, 'pp', PARTIES), 'a': cum(s, 'ag', range(4)),
                'reg': int(vs.n.sum()), 'rp': [int(vs.n[vs.pp == x].sum()) for x in PARTIES], 'ra': [int(vs.n[vs.ag == i].sum()) for i in range(4)],
                'fin': int(hs.n.sum()), 'fp': [int(hs.n[hs.pp == x].sum()) for x in PARTIES], 'fa': [int(hs.n[hs.ag == i].sum()) for i in range(4)]} | \
               ({'lp': [cum(s[(s.pp == x) & s.low]) for x in PARTIES[:3]]} if HIST is not None else {}) | \
               {'dd': day_detail(s)}   # low-propensity voters, by party; early in-person voters on each day of early voting

    def day_detail(s):
        # [DEM, REP, UNA, OTH, age 1-4, (low-propensity DEM, REP, UNA)] for early in-person voters on each early voting day
        e = s[s.ev == 1]
        res = []
        for k in range(EV_LEN):
            x = e[e.k == k]
            p, ag = x.pp.value_counts(), x.ag.value_counts()
            row = [int(p.get(v, 0)) for v in PARTIES] + [int(ag.get(i, 0)) for i in range(4)]
            if HIST is not None:
                row += [int((x.low & (x.pp == v)).sum()) for v in PARTIES[:3]]
            res.append(row)
        return res

    out = {'ev_start': YEARS[label], 'k0': K0, 'places': {'North Carolina': block(a, v, h)}}
    for c, s in a.groupby('county_desc'):
        out['places'][place(c)] = block(s, v[v.county_desc == c], h[h.county_desc == c])
    st = out['places']['North Carolina']
    print(f"{label}: {st['c'][-1]:,} early and mail votes by Election Day; {st['reg']:,} registered; final turnout {st['fin']:,}; "
          f"{len(out['places']) - 1} counties")
    return out


def main():
    args = sys.argv[1:]
    res = {}
    for i in range(0, len(args), 4):
        res[args[i]] = year(*args[i:i + 4])
    try:   # keep the registered low-propensity pools added by add_pool_baseline.py
        old = json.load(open('docs/baseline.json'))
        for y in res:
            for name, p in res[y]['places'].items():
                if 'lpr' in old.get(y, {}).get('places', {}).get(name, {}):
                    p['lpr'] = old[y]['places'][name]['lpr']
    except FileNotFoundError:
        pass
    with open('docs/baseline.json', 'w') as f:
        json.dump(res, f, separators=(',', ':'))


if __name__ == '__main__':
    main()
