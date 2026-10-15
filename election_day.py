"""Election Day votes and precinct turnout for the Turnout Tracker.

Election Day votes come from the State Board's precinct results file (results_pct_20261103.zip), which is
posted on election night and updated through the county canvass. That file has no "ballots cast" line, so
Election Day turnout is the number of Election Day and provisional votes in one contest that nearly every
voter marks (TOP_CONTEST). It slightly undercounts, by the few voters who skip that race, which keeps the
tracker from ever overstating turnout. Its early-voting and mail columns are ignored: those votes come
from the absentee file, counted once per voter.

Precinct turnout combines early and mail votes by the voter's home precinct (absentee file, matched by
precinct name) with Election Day votes by precinct (results file, matched by precinct code), using the
precincts.csv lookup. Precincts with fewer than PRECINCT_MIN votes are combined, and a county never has
exactly one hidden precinct, so no small precinct can be worked out by subtraction from the county total.
"""
import os
import re

import pandas as pd

from ncsbe import COUNTY_NAME

TOP_CONTEST = 'US SENATE'
PRECINCT_MIN = 10
HERE = os.path.dirname(os.path.abspath(__file__))

SMALL = {'of', 'the', 'and', 'at', 'for', 'in', 'on', 'a'}
KEEP_UPPER = {'YMCA', 'YWCA', 'UNC', 'NCCU', 'NCSU', 'ECU', 'WSSU', 'UNCG', 'UNCW', 'UNCC', 'NCA&T', 'A&T', 'VFW', 'AME',
              'BOE', 'II', 'III', 'IV', 'NC', 'USA', 'CC', 'EMS', 'PCT', 'VFD', 'FD'}


def tidy(x):
    """'MCDOWELL TECH COMMUNITY COLLEGE' -> 'McDowell Tech Community College'. Codes like '01-49' are left alone."""
    words = ' '.join(str(x).split()).split(' ')
    out = []
    for i, w in enumerate(words):
        u = w.upper()
        if u in KEEP_UPPER or not re.search('[A-Za-z]', w) or re.fullmatch(r'[A-Z]?\d+[A-Z]?', u):
            out.append(u)
        elif i and w.lower() in SMALL:
            out.append(w.lower())
        else:
            t = '-'.join(p.capitalize() for p in w.split('-'))
            if t.startswith('Mc') and len(t) > 2:
                t = 'Mc' + t[2:3].upper() + t[3:]
            out.append(t)
    return ' '.join(out)


def load_lookup(path=os.path.join(HERE, 'precincts.csv')):
    return pd.read_csv(path, dtype=str, keep_default_na=False)


def read_results(path):
    """Election Day + provisional votes in TOP_CONTEST, per county and precinct code.

    Returns (by_precinct DataFrame[county, code, real, ed], or None if the file has no such contest yet)."""
    r = pd.read_csv(path, sep='\t', dtype=str, encoding='latin-1', keep_default_na=False)
    need = {'County', 'Precinct', 'Contest Name', 'Election Day', 'Provisional', 'Real Precinct'}
    if need - set(r.columns):
        raise ValueError(f'results file is missing columns: {sorted(need - set(r.columns))}')
    s = r[r['Contest Name'].str.strip().str.upper() == TOP_CONTEST]
    if s.empty:
        return None
    s = s.assign(ed=pd.to_numeric(s['Election Day'], errors='coerce').fillna(0) + pd.to_numeric(s['Provisional'], errors='coerce').fillna(0))
    return (s.groupby(['County', 'Precinct', 'Real Precinct']).ed.sum().astype(int).reset_index()
             .rename(columns={'County': 'county', 'Precinct': 'code', 'Real Precinct': 'real'}))


def match_names(names, lookup_names):
    """Map absentee-file precinct names to lookup names; the absentee file sometimes cuts long names short."""
    full = set(lookup_names)
    out = {}
    for n in names:
        if n in full:
            out[n] = n
        else:
            hits = [f for f in full if n and f.startswith(n)]
            out[n] = hits[0] if len(hits) == 1 else None
    return out


def precinct_tables(acc, ed_by_pct, lookup):
    """{County: {'rows': [[name, early, mail, election day], ...] largest first, 'small': [count, early, mail, ed] or None}}.

    acc: accepted votes, one row per voter, with county_desc, precinct_desc and kind ('ev' or 'ml')."""
    out = {}
    for county, lk in lookup.groupby('county'):
        a = acc[acc.county_desc == county]
        names = match_names(a.precinct_desc.dropna().unique(), lk.name)
        a = a.assign(pname=a.precinct_desc.map(names))
        em = a.dropna(subset=['pname']).groupby(['pname', 'kind']).size().unstack(fill_value=0)
        rows = {}
        for _, p in lk.iterrows():
            rows[p.code] = {'name': tidy(p['name']), 'ev': int(em.ev.get(p['name'], 0)) if 'ev' in em else 0,
                            'ml': int(em.ml.get(p['name'], 0)) if 'ml' in em else 0, 'ed': 0}
        if ed_by_pct is not None:
            for _, e in ed_by_pct[(ed_by_pct.county == county) & (ed_by_pct.real == 'Y')].iterrows():
                rows.setdefault(e.code, {'name': tidy(e.code), 'ev': 0, 'ml': 0, 'ed': 0})['ed'] += int(e.ed)
        t = pd.DataFrame(rows.values())
        if t.empty:
            continue
        table = finish_table(t)
        if table:
            out[COUNTY_NAME.get(county, county.title())] = table
    return out


def finish_table(t):
    """Apply the privacy rule to one county's precincts (DataFrame with name, ev, ml, ed)."""
    t = t.assign(tot=t.ev + t.ml + t.ed)
    t = t[t.tot > 0].sort_values(['tot', 'name'], ascending=[False, True])
    if t.empty:
        return None
    small = t[t.tot < PRECINCT_MIN]
    if len(small) == 1 and len(t) > 1:
        small = t.tail(2)          # never one hidden precinct alone: it could be backed out of the county total
    big = t.drop(small.index)
    return {
        'rows': [[r.name, int(r.ev), int(r.ml), int(r.ed)] for r in big.itertuples()],
        'small': [int(len(small)), int(small.ev.sum()), int(small.ml.sum()), int(small.ed.sum())] if len(small) else None,
    }


def district_ed(ed_by_pct, lookup):
    """Election Day votes per district, placing each precinct in the district most of its voters are in."""
    m = ed_by_pct.merge(lookup[['county', 'code', 'cd', 'hd', 'sd']], on=['county', 'code'], how='left')
    res = {}
    for k in ('cd', 'hd', 'sd'):
        g = m.dropna(subset=[k])
        g = g[g[k] != '']
        res[k] = {int(d): int(v) for d, v in g.groupby(g[k].astype(int)).ed.sum().items()}
        res[k + '_unassigned'] = int(m.ed.sum() - g.ed.sum())
    return res
