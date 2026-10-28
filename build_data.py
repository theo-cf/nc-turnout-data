"""Build the Turnout Tracker data file from the NC State Board of Elections statewide absentee file.

Usage:
    python build_data.py <absentee csv> <as-of date YYYY-MM-DD> <output dir> [<file Last-Modified header>]

If the State Board's Last-Modified header is given, the as-of date and the "updated" time come from it
(converted to Eastern time), so the published data says when the State Board posted the file.

Election Day: if the environment variable RESULTS_FILE points to the State Board's precinct results file
(results_pct_20261103.txt), Election Day votes are added (see election_day.py), and RESULTS_MODIFIED can
carry that file's Last-Modified header. From Election Day on, turnout by precinct is published too.

Writes <output dir>/data.json and <output dir>/archive/<as-of date>.json.
Only totals are written. No voter-level information (names, addresses, IDs) is ever saved.

Counting rules (see README):
  * Votes cast = accepted ballots only (early in-person and mail), one per voter.
  * A voter with an accepted early in-person ballot counts as an early voter; otherwise as a mail voter.
  * Mail ballots waiting on a fix are not counted until accepted.
  * Each vote is placed on the day it was cast (early) or received (mail).

The script stops with an error, and publishes nothing, if the file contains a ballot type or
status it doesn't recognize, or if total votes cast drop sharply from the last published file.
"""
import json
import re
import os
import sys
from email.utils import parsedate_to_datetime
from zoneinfo import ZoneInfo

import pandas as pd

from election_day import PRECINCT_MIN, TOP_CONTEST, district_ed, district_tables, load_lookup, precinct_tables, read_results
from ncsbe import history_tier, tier_counts
from ncsbe import ACCEPTED, COUNTY_NAME, DISTRICTS, ETHS, KNOWN, NC_COUNTIES, NEEDS_CURE, RACES, REJECTED, TYPES, eth_code, norm, num, race_code

SRC, ASOF, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
UPDATED = None
if len(sys.argv) > 4 and sys.argv[4].strip():
    posted = parsedate_to_datetime(sys.argv[4].strip()).astimezone(ZoneInfo('America/New_York'))
    ASOF = posted.strftime('%Y-%m-%d')
    UPDATED = posted.isoformat(timespec='minutes')   # e.g. 2026-10-15T05:16-04:00
RESULTS_FILE = os.environ.get('RESULTS_FILE', '').strip()
if os.environ.get('RESULTS_MODIFIED', '').strip() and RESULTS_FILE:
    rposted = parsedate_to_datetime(os.environ['RESULTS_MODIFIED'].strip()).astimezone(ZoneInfo('America/New_York'))
    if UPDATED is None or rposted.isoformat(timespec='minutes') > UPDATED:
        UPDATED = rposted.isoformat(timespec='minutes')   # the newer of the two State Board files
ELECTION_DAY = os.environ.get('ELECTION_DAY_OVERRIDE') or '2026-11-03'   # precinct turnout is published from this date on (override only for tests)
ED_DROP_LIMIT = 0.90          # stop if Election Day votes fall below 90% of the last published count
DROP_LIMIT = 0.95   # stop if total votes cast fall below 95% of the last published total

COLS = ['ncid', 'county_desc', 'voter_party_code', 'cong_dist_desc', 'nc_house_desc', 'nc_senate_desc',
        'ballot_req_type', 'ballot_rtn_dt', 'ballot_rtn_status', 'age', 'site_name', 'precinct_desc', 'race', 'ethnicity', 'sdr']
AGE_GROUPS = [(18, 25), (26, 40), (41, 65), (66, 200)]   # the State Board's groups: 18-25, 26-40, 41-65, 66 and older
EV_START, EV_DAYS = '2026-10-15', 17                      # in-person early voting, Oct. 15-31

def fail(msg):
    print('STOPPING: ' + msg, file=sys.stderr)
    sys.exit(1)


df = pd.read_csv(SRC, encoding='iso-8859-1', usecols=COLS, dtype=str)
if len(df) == 0:
    fail('the State Board file has no rows')

df['rtype'] = df.ballot_req_type.map(norm)
df['st'] = df.ballot_rtn_status.map(norm)
bad_types = set(df.rtype.dropna()) - set(TYPES)
if bad_types:
    fail(f'unrecognized ballot type(s): {sorted(bad_types)}')
bad_status = set(df.st.dropna()) - KNOWN
if bad_status:
    fail(f'unrecognized ballot status(es): {sorted(bad_status)}')

rejected_total = int(df.st.isin(REJECTED).sum())

# ---- mail ballots that need a fix from the voter ----
# One per voter; 'PENDING' (sent, not yet returned) is not a ballot problem and is excluded.
# A voter whose vote has already been accepted another way is not counted.
accepted_ids = set(df.loc[df.st.isin(ACCEPTED), 'ncid'])
# Mail ballots only: an early in-person ballot marked CONFLICT is a board matter, not a fix the voter makes.
cure = df[(df.rtype.map(TYPES) == 'ml') & df.st.isin(NEEDS_CURE - {'PENDING'}) & ~df.ncid.isin(accepted_ids)].drop_duplicates('ncid')

# ---- votes cast: accepted ballots, one per voter, early in-person preferred ----
acc = df[df.st.isin(ACCEPTED)].copy()
acc['kind'] = acc.rtype.map(TYPES)
acc['when'] = pd.to_datetime(acc.ballot_rtn_dt, format='%m/%d/%Y', errors='coerce')
acc['prio'] = (acc.kind == 'ev').astype(int)
acc = acc.sort_values(['prio', 'when'], ascending=[False, False]).drop_duplicates('ncid', keep='first')
acc['ab'] = pd.cut(pd.to_numeric(acc.age, errors='coerce'), [a - 1 for a, _ in AGE_GROUPS] + [200], labels=False)
acc['party'] = acc.voter_party_code.where(acc.voter_party_code.isin(['DEM', 'REP', 'UNA']), 'OTH')
acc['race'] = acc.race.fillna('').map({x: race_code(x) for x in acc.race.fillna('').unique()})        # as listed on the registration (optional)
acc['sdr'] = acc.sdr.fillna('').str.strip().str.upper().eq('Y')   # registered (or updated their address) and voted the same day
acc['eth'] = acc.ethnicity.fillna('').map({x: eth_code(x) for x in acc.ethnicity.fillna('').unique()})
asof_ts = pd.Timestamp(ASOF)
acc['when'] = acc.when.fillna(asof_ts)
acc['day'] = acc.when.where(acc.when <= asof_ts, asof_ts).dt.strftime('%Y-%m-%d')  # future-dated records count on the file date

# ---- voter propensity: how many of the last three November elections (2020, 2022, 2024) each voter voted in ----
# HISTORY_FILE is the private lookup from build_history.py (kept out of this repo). Without it, the view is skipped.
HISTORY_FILE = os.environ.get('HISTORY_FILE', '').strip()
HAS_HIST = bool(HISTORY_FILE) and os.path.exists(HISTORY_FILE)
if HAS_HIST:
    _H = pd.read_pickle(HISTORY_FILE)
    _bits = acc.ncid.map(_H.b).fillna(0).astype(int)
    _n3 = sum(((_bits & b) > 0).astype(int) for b in (4, 8, 16))
    # low-propensity: voted in 0 or 1 of the last three Novembers (2020, 2022, 2024) in North Carolina, or voted in 2020 and
    # 2024 but skipped the 2022 midterm
    acc['low'] = (_n3 <= 1) | ((_bits & 28) == 20)
    # voting-history group for the pyramid (ncsbe.history_tier): voters missing from the lookup registered after it, so they're new
    acc['tier'] = history_tier(_bits, acc.ncid.map(_H.reg).fillna(0).astype(int), acc.ncid.map(_H.by).fillna(0).astype(int) >= 2003, 2026) \
        .where(acc.ncid.isin(_H.index), 4)
    acc['e22'] = acc.ncid.map(_H.e22).fillna(0).astype(int).eq(1) if 'e22' in _H.columns else False   # voted on Election Day 2022
    # First-time North Carolina registrants this year (see build_history.py --snap): flagged in the lookup, or not in it at all
    # (registered after the State Board's weekly file, including same-day registrants).
    HAS_NW = 'nw' in _H.columns
    if HAS_NW:
        acc['unk'] = ~acc.ncid.isin(_H.index)
        acc['nw'] = acc.ncid.map(_H.nw).fillna(0).astype(int).eq(1) | acc.unk
else:
    HAS_NW = False
# Each full day of in-person early voting (the file date itself is partial and left out), for the day-by-day breakdown.
EVD_FULL = [d for d in pd.date_range(EV_START, periods=EV_DAYS, freq='D').strftime('%Y-%m-%d') if d < ASOF]


def day_detail(s):
    """Early in-person voters on each full day of early voting: [DEM, REP, UNA, OTH, age 1-4, low-propensity DEM, REP, UNA]."""
    e = s[s.kind == 'ev']
    g = {d: x for d, x in e.groupby('day')}
    res = []
    for d in EVD_FULL:
        x = g.get(d)
        if x is None:
            res.append([0] * (8 + (3 if HAS_HIST else 0)))
            continue
        p, a = x.party.value_counts(), x.ab.value_counts()
        row = [int(p.get(v, 0)) for v in ['DEM', 'REP', 'UNA', 'OTH']] + [int(a.get(i, 0)) for i in range(len(AGE_GROUPS))]
        if HAS_HIST:
            row += [int(x.low[x.party == v].sum()) for v in ['DEM', 'REP', 'UNA']]
        res.append(row)
    return res


def day_new(s):
    """For each full day of early voting: [first-time registrants, same-day registrants, first-time same-day registrants]
    among all ballots accepted that day (early in person and mail), to match the past years' day-by-day counts."""
    g = {d: x for d, x in s.groupby('day')}
    res = []
    for d in EVD_FULL:
        x = g.get(d)
        res.append([0, 0, 0] if x is None else [int(x.nw.sum()), int(x.sdr.sum()), int((x.nw & x.sdr).sum())])
    return res


XT_RACES = ['B', 'O', 'A', 'W']   # race rows on the shareable graphics: Black, Other, Asian, White


def xt_counts(s):
    """Voters by race x age x propensity ('xv': ((race * 4) + age) * 2 + (0 low, 1 regular)) and by party x propensity
    ('pv': DEM low, DEM regular, REP low, REP regular, UNA low, UNA regular)."""
    reg = (~s.low).astype(int)
    ri = s.race.map({x: i for i, x in enumerate(XT_RACES)})
    cell = ((ri * 4 + s.ab) * 2 + reg).dropna().astype(int).value_counts()
    pc = (s.party.map({'DEM': 0, 'REP': 2, 'UNA': 4}) + reg).dropna().astype(int).value_counts()
    hl = s.eth.eq('HL')   # Hispanic or Latino voters (ethnicity) by propensity: [low, regular]
    xp = (s.party.map({'DEM': 0, 'REP': 1, 'UNA': 2}) * 32 + (ri * 4 + s.ab) * 2 + reg).dropna().astype(int).value_counts()   # the same cells once per party
    return {'xv': [int(cell.get(i, 0)) for i in range(32)], 'xpv': [int(xp.get(i, 0)) for i in range(96)], 'pv': [int(pc.get(i, 0)) for i in range(6)],
            'hv': [int((hl & s.low).sum()), int((hl & ~s.low).sum())]}


def day_race(s):
    """Early in-person voters on each full day of early voting, by race (RACES) and ethnicity (ETHS)."""
    e = s[s.kind == 'ev']
    g = {d: x for d, x in e.groupby('day')}
    res = []
    for d in EVD_FULL:
        x = g.get(d)
        if x is None:
            res.append([0] * (len(RACES) + len(ETHS)))
            continue
        rc, ec = x.race.value_counts(), x.eth.value_counts()
        res.append([int(rc.get(v, 0)) for v in RACES] + [int(ec.get(v, 0)) for v in ETHS])
    return res


days = pd.date_range(acc.when.min(), asof_ts, freq='D').strftime('%Y-%m-%d').tolist() if len(acc) else [ASOF]


def through_days(s):
    """Votes so far at the end of each full day of early voting (early in person and mail, by the day each was accepted):
    [all, DEM, REP, UNA, OTH, low-propensity DEM, REP, UNA, early in person, mail], for the tracker's "through a day" view."""
    if not len(s):
        return [[0] * 10 for _ in EVD_FULL]
    cols = pd.DataFrame({'day': s.day.values, 'n': 1})
    for v in ['DEM', 'REP', 'UNA', 'OTH']:
        cols[v] = (s.party == v).values.astype(int)
    for v in ['DEM', 'REP', 'UNA']:
        cols['l' + v] = ((s.party == v) & s.low).values.astype(int) if HAS_HIST else 0
    cols['ev'] = (s.kind == 'ev').values.astype(int)
    cols['ml'] = (s.kind == 'ml').values.astype(int)
    byday = cols.groupby('day').sum().sort_index().cumsum()
    out = []
    for d in EVD_FULL:
        x = byday[byday.index <= d]
        out.append([int(v) for v in x.iloc[-1]] if len(x) else [0] * 10)
    return out


def totals(s):
    k = s.kind.value_counts()
    p = s.party.value_counts()
    a = s.ab.value_counts()
    by = s.groupby(['day', 'kind']).size().unstack(fill_value=0).reindex(days, fill_value=0)
    return {
        'vc': int(len(s)), 'ev': int(k.get('ev', 0)), 'ml': int(k.get('ml', 0)),
        'cured': int(((s.kind == 'ml') & (s.st == 'ACCEPTED - CURED')).sum()),   # mail ballots accepted after the voter fixed them
        'pty': [int(p.get(x, 0)) for x in ['DEM', 'REP', 'UNA', 'OTH']],
        'age': [int(a.get(i, 0)) for i in range(len(AGE_GROUPS))],   # by age group (voters with no age listed are left out)
        'tml': [int(x) for x in by['ml']] if 'ml' in by else [0] * len(days),   # new votes per day, by mail
        'tev': [int(x) for x in by['ev']] if 'ev' in by else [0] * len(days),   # new votes per day, early in person
        'dd': day_detail(s),   # early in-person voters on each full day of early voting, by party, age and propensity
        'cdd': through_days(s),   # votes so far at the end of each full day of early voting
        'race': [int(s.race.eq(x).sum()) for x in RACES], 'eth': [int(s.eth.eq(x).sum()) for x in ETHS],   # by race and ethnicity (ncsbe.RACES, ETHS)
        'ddr': day_race(s),
        # party by race: [DEM, REP, UNA] voters for Black, White, Asian and American Indian voters (race), then Hispanic or Latino (ethnicity)
        'gp': [[int((s.race.eq(g) & s.party.eq(x)).sum()) for x in ['DEM', 'REP', 'UNA']] for g in ['B', 'W', 'A', 'I']]
              + [[int((s.eth.eq('HL') & s.party.eq(x)).sum()) for x in ['DEM', 'REP', 'UNA']]],
    } | ({'lp': [int(s.low[s.party == x].sum()) for x in ['DEM', 'REP', 'UNA']], 'tv': tier_counts(s.party, s.tier), 'e22v': [int((s.e22 & (s.party == x)).sum()) for x in ['DEM', 'REP', 'UNA']]} if HAS_HIST else {}) \
      | (xt_counts(s) if HAS_HIST else {}) \
      | ({'nv': [int(s.nw.sum()), int(s.sdr.sum()), int((s.nw & s.sdr).sum()), int(s.unk.sum())]} if HAS_NW else {}) \
      | ({'dn': day_new(s)} if HAS_NW else {})
    # low-propensity voters by party; counts for the shareable graphics; new voters: first-time registrants who have voted,
    # same-day registrants, first-time same-day registrants, first-time registrants newer than the registration file


GEOS = [('county', 'county_desc', lambda v: COUNTY_NAME.get(v.upper(), v.title())),
        ('cd', 'cong_dist_desc', lambda v: f'CD {num(v)}'),
        ('hd', 'nc_house_desc', lambda v: f'HD {num(v)}'),
        ('sd', 'nc_senate_desc', lambda v: f'SD {num(v)}')]

out = {'asof': ASOF, 'updated': UPDATED, 'days': days, 'state': totals(acc), 'geo': {}, 'unassigned': {}}
out['state']['g_rej'] = rejected_total
out['state']['cure'] = int(len(cure))
# Every returned ballot that was not accepted, statewide, by ballot type and State Board status: [status, ballots, voters with no
# accepted ballot of any kind]. Shown in "How we count" so readers can see what happened to them.
_na = df[df.st.notna() & ~df.st.isin(ACCEPTED) & (df.st != 'PENDING')]


def na_table(sub):
    return {t: [[st, int(len(g)), int((~g.drop_duplicates('ncid').ncid.isin(accepted_ids)).sum())]
                for st, g in sorted(sub[sub.rtype.map(TYPES) == t].groupby('st'), key=lambda x: (-len(x[1]), x[0]))]
            for t in ('ml', 'ev')}


out['not_accepted'] = na_table(_na)   # statewide; each county and district row gets its own as 'na'
for key, field, label in GEOS:
    # Every place that appears in the file gets a row, even with zero accepted votes so far.
    places = df[field].dropna().unique()
    rows = []
    for v in places:
        r = totals(acc[acc[field] == v])
        r['cure'] = int((cure[field] == v).sum())
        r['name'] = label(v)
        sub = _na[_na[field] == v]
        if len(sub):
            r['na'] = na_table(sub)
        rows.append(r)
    # Every county and district gets a row, even before any vote from it shows up (Election Day votes may).
    have = {r['name'] for r in rows}
    allnames = [c for c in NC_COUNTIES] if key == 'county' else [f'{key.upper()} {n}' for n in range(1, DISTRICTS[key] + 1)]
    for n in allnames:
        if n not in have:
            r = totals(acc.iloc[0:0])
            r['cure'], r['name'] = 0, n
            rows.append(r)
    rows.sort(key=lambda r: (r['name'] if key == 'county' else num(r['name'])))
    out['geo'][key] = rows
    # Voters with no district listed in the State Board file count statewide and in their county only.
    out['unassigned'][key] = int(acc[field].isna().sum())

# ---- the State Board's county summary of mail ballots (absentee_spoiled_outstanding_<date>.csv) ----
# The statewide file above lists only each voter's latest ballot, so a returned mail ballot that the county didn't count and
# replaced with a new one isn't in it. This county-level file counts those. Optional: if it's missing or doesn't look right,
# the tracker publishes without it.
SO_COLS = ['county_name', 'abs_sent', 'abs_accepted', 'abs_spoiled_EV', 'abs_received_not_counted', 'abs_outstanding']
SO_FILE = os.environ.get('SO_FILE', '').strip()


def load_so(path):
    so = pd.read_csv(path, dtype=str)
    missing = [c for c in SO_COLS if c not in so.columns]
    if missing:
        raise ValueError(f'missing column(s) {missing}')
    so['name'] = so.county_name.str.strip().str.upper().map(COUNTY_NAME)
    if so.name.isna().any() or so.name.nunique() != len(so) or len(so) != 100:
        raise ValueError('expected one row for each of the 100 counties')
    vals = so[SO_COLS[1:]].apply(lambda c: pd.to_numeric(c.str.replace(',', '').str.strip(), errors='raise')).astype(int)
    if (vals < 0).any().any():
        raise ValueError('negative counts')
    # [sent, accepted, voided because the voter voted early in person, returned but not counted, not yet returned]
    return {n: [int(x) for x in row] for n, row in zip(so.name, vals.values)}


if SO_FILE:
    try:
        SO = load_so(SO_FILE)
        for r in out['geo']['county']:
            r['so'] = SO[r['name']]
        out['state']['so'] = [sum(v[i] for v in SO.values()) for i in range(5)]
        so_mod = os.environ.get('SO_MODIFIED', '').strip()
        out['so_asof'] = parsedate_to_datetime(so_mod).astimezone(ZoneInfo('America/New_York')).strftime('%Y-%m-%d') if so_mod else ASOF
        print(f"county summary file ({out['so_asof']}): {out['state']['so'][3]:,} mail ballots returned but not counted; "
              f"{out['state']['so'][1]:,} accepted (statewide file: {int(out['state'].get('ml', 0)):,} by mail)")
    except Exception as e:
        print(f'WARNING: county summary file skipped: {e}', file=sys.stderr)   # never let it block the main update

# ---- early voting sites: accepted early in-person votes by the site where they were cast ----
SMALL = {'of', 'the', 'and', 'at', 'for', 'in', 'on', 'a'}
NOT_ACRONYM = {'mt', 'st', 'dr', 'jr', 'sr', 'ft', 'rd', 'ln', 'hwy', 'pkwy', 'blvd', 'ct', 'pl', 'sq', 'bldg', 'ctr', 'rm', 'mr', 'ms', 'mrs', 'nd', 'th'}
KEEP_UPPER = {'YMCA', 'YWCA', 'UNC', 'NCCU', 'NCSU', 'ECU', 'WSSU', 'UNCG', 'UNCW', 'UNCC', 'NCA&T', 'A&T', 'VFW', 'AME', 'BOE', 'II', 'III', 'NC', 'USA', 'CC', 'EMS'}


def site_label(x):
    words = ' '.join(str(x).split()).split(' ')
    out_w = []
    for i, w in enumerate(words):
        u = w.upper()
        core = re.sub(r'[^A-Za-z.]', '', w)
        if u in KEEP_UPPER or re.fullmatch(r'(?:[A-Za-z]\.){2,}', core) or \
                (len(core) >= 2 and core.isalpha() and not re.search('[aeiouyAEIOUY]', core) and core.lower() not in NOT_ACRONYM):
            out_w.append(u)   # initials (W.E.) and vowel-less acronyms (CCCC, DSS) stay capitals
        elif i and w.lower() in SMALL:
            out_w.append(w.lower())
        else:
            t = w.capitalize()
            if t.startswith('Mc') and len(t) > 2:
                t = 'Mc' + t[2:].capitalize()
            out_w.append(t)
    return ' '.join(out_w)


ev_days = pd.date_range(EV_START, periods=EV_DAYS, freq='D').strftime('%Y-%m-%d').tolist()


def site_days(s):
    """[DEM, REP, UNA, OTH] voters at a site on each day of early voting, for the tracker's one-day view"""
    t = s.groupby(['day', 'party']).size()
    return [[int(t.get((d, x), 0)) for x in ['DEM', 'REP', 'UNA', 'OTH']] for d in ev_days]

ev = acc[(acc.kind == 'ev') & acc.site_name.notna() & (acc.site_name.str.strip() != '')].copy()
ev['site'] = ev.site_name.map(site_label)
out['sites'] = {}
for (county, site), s in ev.groupby(['county_desc', 'site']):
    daily = s.day.value_counts()
    p, a = s.party.value_counts(), s.ab.value_counts()
    out['sites'].setdefault(COUNTY_NAME.get(county, county.title()), []).append([
        site, [int(daily.get(d, 0)) for d in ev_days],
        [int(p.get(x, 0)) for x in ['DEM', 'REP', 'UNA', 'OTH']],
        [int(a.get(i, 0)) for i in range(len(AGE_GROUPS))],
        [int(s.race.eq(x).sum()) for x in RACES], [int(s.eth.eq(x).sum()) for x in ETHS],
        site_days(s)])
for rows in out['sites'].values():
    rows.sort(key=lambda r: -sum(r[1]))

# ---- Election Day votes (election night on) and turnout by precinct (from Election Day on) ----
lookup = load_lookup()

# ---- registered voters (weekly registration file; see build_registration.py) ----
REG_PATH = os.environ.get('REG_FILE', '').strip() or os.path.join(os.path.dirname(os.path.abspath(__file__)), 'registration.json')
reg = json.load(open(REG_PATH)) if os.path.exists(REG_PATH) else None
if reg:
    out['reg_as_of'] = reg.get('as_of')
    for r, x in [(out['state'], reg['state'])] + [(r, reg[k].get(r['name'] if k == 'county' else str(num(r['name']))))
                                                  for k in ('county', 'cd', 'hd', 'sd') for r in out['geo'][k]]:
        if x:
            r['reg'], r['rpty'], r['rage'] = x['n'], x['pty'], x['age']
            if 'race' in x:
                r['rrace'], r['reth'] = x['race'], x['eth']
ed_pct = None
if RESULTS_FILE and os.path.exists(RESULTS_FILE) and ASOF >= ELECTION_DAY:   # the State Board posts a blank results file weeks early
    try:
        ed_pct = read_results(RESULTS_FILE)
    except ValueError as e:
        print(f'WARNING: results file skipped: {e}', file=sys.stderr)   # never let it block early and mail updates
    if ed_pct is not None and ed_pct.ed.sum() == 0:
        ed_pct = None
if ed_pct is not None:
    out['ed_contest'] = TOP_CONTEST
    out['state']['ed'] = int(ed_pct.ed.sum())
    by_county = ed_pct.groupby('county').ed.sum()
    for r in out['geo']['county']:
        r['ed'] = int(by_county.get(r['name'].upper(), 0))
    dist = district_ed(ed_pct, lookup)
    for k in ('cd', 'hd', 'sd'):
        for r in out['geo'][k]:
            r['ed'] = dist[k].get(num(r['name']), 0)
    out['unassigned_ed'] = {k: dist[k + '_unassigned'] for k in ('cd', 'hd', 'sd')}
if ASOF >= ELECTION_DAY:
    out['precincts'] = precinct_tables(acc, ed_pct, lookup, reg['precinct'] if reg else None)
    out['dprecincts'] = district_tables(acc, ed_pct, lookup, reg['precinct'] if reg else None)   # today's districts
    out['precinct_min'] = PRECINCT_MIN

# ---- registered low-propensity voters by party, for "what share of them have voted" (from build_history.py --pool) ----
POOL_FILE = os.environ.get('POOL_FILE', '').strip()
if HAS_HIST and POOL_FILE and os.path.exists(POOL_FILE):
    _P = json.load(open(POOL_FILE))
    out['state']['lpr'] = _P['state']
    for _k in ('county', 'cd', 'hd', 'sd'):
        for _r in out['geo'][_k]:
            _x = _P.get(_k, {}).get(_r['name'] if _k == 'county' else str(num(_r['name'])))
            if _x:
                _r['lpr'] = _x
    if HAS_NW and 'nw' in _P:   # first-time 2026 registrants in the registration file, statewide and by county
        out['state']['nwr'] = _P['nw']['state']
        for _r in out['geo']['county']:
            _r['nwr'] = _P['nw']['county'].get(_r['name'], 0)
        for _k in ('cd', 'hd', 'sd'):
            if _k in _P['nw']:
                for _r in out['geo'][_k]:
                    _r['nwr'] = _P['nw'][_k].get(str(num(_r['name'])), 0)
    if 'e22' in _P:   # registered voters who voted on Election Day 2022, by party: the denominator for the "already voted" bars
        out['state']['e22r'] = _P['e22']['state']
        for _r in out['geo']['county']:
            if _r['name'] in _P['e22']['county']:
                _r['e22r'] = _P['e22']['county'][_r['name']]
        for _k in ('cd', 'hd', 'sd'):
            for _r in out['geo'][_k]:
                _x = _P['e22'].get(_k, {}).get(str(num(_r['name'])))
                if _x:
                    _r['e22r'] = _x
    if 'tr' in _P:   # registered voters by party x voting-history group, statewide and by county, for the pyramid
        out['state']['tr'] = _P['tr']['state']
        for _r in out['geo']['county']:
            if _r['name'] in _P['tr']['county']:
                _r['tr'] = _P['tr']['county'][_r['name']]
        for _k in ('cd', 'hd', 'sd'):   # and by today's districts
            for _r in out['geo'][_k]:
                _x = _P['tr'].get(_k, {}).get(str(num(_r['name'])))
                if _x:
                    _r['tr'] = _x
    for _key in ('xr', 'xpr', 'pr', 'hr'):   # registered voters for the shareable graphics and the county map, statewide and by county
        if _key in _P:
            out['state'][_key] = _P[_key]['state']
            for _r in out['geo']['county']:
                if _r['name'] in _P[_key]['county']:
                    _r[_key] = _P[_key]['county'][_r['name']]
            for _k in ('cd', 'hd', 'sd'):
                for _r in out['geo'][_k]:
                    _x = _P[_key].get(_k, {}).get(str(num(_r['name'])))
                    if _x:
                        _r[_key] = _x

# ---- precinct map layer: early and mail votes by the voter's home precinct (docs/pct.json, loaded only when a precinct map
# is opened). Precinct codes and registration come from the pool (build_history.py --pool); the absentee file only names the
# precinct, so names are matched to codes within each county. Precincts with fewer than PRECINCT_MIN votes get no vote counts.
PCT = None


def also_hide(counts):
    """The precinct to hide besides the ones under PRECINCT_MIN, so a county never has exactly one hidden precinct with votes:
    one hidden count could be worked out from the county total, which the tracker publishes. counts: {precinct: votes}, for one
    county (and one day, for the day-by-day files). Same rule as election_day.finish_table."""
    voted = {p: n for p, n in counts.items() if n > 0}
    small = [p for p, n in voted.items() if n < PRECINCT_MIN]
    if len(small) != 1 or len(voted) < 2:
        return None
    shown = sorted((n, p) for p, n in voted.items() if n >= PRECINCT_MIN)
    return shown[0][1] if shown else None


if HAS_HIST and POOL_FILE and os.path.exists(POOL_FILE) and 'pct' in _P:
    _byname = {c: {v[8]: k for k, v in ps.items() if v[8]} for c, ps in _P['pct'].items()}
    _cn = acc.county_desc.str.strip().str.upper().map(lambda c: COUNTY_NAME.get(c, c.title()))
    _code = [(_byname.get(c) or {}).get(n) for c, n in zip(_cn, acc.precinct_desc.fillna('').str.strip())]
    _pv = pd.DataFrame({'c': _cn.values, 'p': _code, 'party': acc.party.values, 'low': acc.low.values}).dropna(subset=['p'])
    PCT = {'asof': ASOF, 'min': PRECINCT_MIN, 'matched': round(len(_pv) / max(len(acc), 1), 4), 'c': {}}
    _n = _pv.groupby(['c', 'p']).size()
    _extra = {c: also_hide(g.droplevel(0).to_dict()) for c, g in _n.groupby(level=0)}
    for (c, p), g in _pv.groupby(['c', 'p']):
        if len(g) >= PRECINCT_MIN and _extra.get(c) != p:
            PCT['c'].setdefault(c, {})[p] = [int(len(g))] + [int((g.party == x).sum()) for x in ('DEM', 'REP', 'UNA')] + \
                [int(((g.party == x) & g.low).sum()) for x in ('DEM', 'REP', 'UNA')]
    PCT['reg'] = {c: {p: v[:8] for p, v in ps.items()} for c, ps in _P['pct'].items()}   # registered [all, D, R, U, low D, R, U, [cd, hd, sd]]
    if PCT['matched'] < 0.95:
        print(f"WARNING: only {PCT['matched']:.1%} of votes matched to a precinct code", file=sys.stderr)

# ---- pieces: where a county and a district, or two kinds of district, overlap (docs/pieces.json, loaded when a place is picked).
# The tracker shows only the part of each county or district inside the place picked: votes from the absentee file by the
# ballot's county and districts, registered voters from the pool (build_history.py --pool). Also the early voting sites
# used by each district's voters, with only those voters' votes.
PIECES = None
if HAS_HIST and POOL_FILE and os.path.exists(POOL_FILE) and 'pieces' in _P:
    _loc = pd.DataFrame({'county': acc.county_desc.str.strip().str.upper().map(lambda c: COUNTY_NAME.get(c, c.title())).values,
                         'cd': acc.cong_dist_desc.map(lambda v: num(v) or None if pd.notna(v) else None).values,
                         'hd': acc.nc_house_desc.map(lambda v: num(v) or None if pd.notna(v) else None).values,
                         'sd': acc.nc_senate_desc.map(lambda v: num(v) or None if pd.notna(v) else None).values},
                        index=acc.index)
    PIECES = {'asof': ASOF, 'p': {}, 'sites': {}}
    for k1, k2 in (('county', 'cd'), ('county', 'hd'), ('county', 'sd'), ('cd', 'hd'), ('cd', 'sd'), ('hd', 'sd')):
        lab = lambda k: _loc[k] if k == 'county' else _loc[k].map(lambda x: None if x is None or pd.isna(x) else str(int(x)))
        key = (lab(k1) + '|' + lab(k2)).dropna()
        regs = _P['pieces'].get(k1 + '|' + k2, {})
        res = {}
        for kk, sub in acc.loc[key.index].groupby(key.values):
            row = totals(sub)
            row.pop('xpv', None)   # the crosstabs' party filter is for whole places only
            x = regs.get(kk)
            if x:
                row.update({'reg': x['n'], 'rpty': x['pty'], 'rage': x['age'], 'rrace': x['race'], 'reth': x['eth'], 'lpr': x['lpr'],
                            'xr': x['xr'], 'pr': x['pr'], 'hr': x['hr']})
            res[kk] = row
        for kk, x in regs.items():   # a piece with registered voters but no votes yet
            if kk not in res:
                res[kk] = {'vc': 0, 'reg': x['n'], 'rpty': x['pty'], 'rage': x['age'], 'rrace': x['race'], 'reth': x['eth'], 'lpr': x['lpr']}
        PIECES['p'][k1 + '|' + k2] = res
    _ev = ev.join(_loc[['cd', 'hd', 'sd']])
    for k in ('cd', 'hd', 'sd'):
        dk = {}
        for (n, county, site), s in _ev.dropna(subset=[k]).groupby([k, 'county_desc', 'site']):
            daily = s.day.value_counts()
            p_, a_ = s.party.value_counts(), s.ab.value_counts()
            dk.setdefault(str(int(n)), {}).setdefault(COUNTY_NAME.get(county, county.title()), []).append([
                site, [int(daily.get(d, 0)) for d in ev_days], [int(p_.get(x, 0)) for x in ['DEM', 'REP', 'UNA', 'OTH']],
                [int(a_.get(i, 0)) for i in range(len(AGE_GROUPS))], [int(s.race.eq(x).sum()) for x in RACES], [int(s.eth.eq(x).sum()) for x in ETHS],
                site_days(s)])
        for cs in dk.values():
            for rows in cs.values():
                rows.sort(key=lambda r: -sum(r[1]))
        PIECES['sites'][k] = dk
    _chk = sum(r['vc'] for r in PIECES['p']['county|cd'].values())
    if abs(_chk - out['state']['vc'] + out['unassigned']['cd']) > 0:
        print(f"WARNING: county x congressional district pieces add to {_chk:,}, not {out['state']['vc'] - out['unassigned']['cd']:,}", file=sys.stderr)

# ---- one day of early in-person votes by home precinct (docs/pct_days.json, for the precinct map's one-day view):
# [votes, DEM, REP, UNA, low-propensity DEM, REP, UNA] on each full day of early voting; null under PRECINCT_MIN votes.
PCT_DAYS = None
if PCT is not None:
    _pd = pd.DataFrame({'c': _cn.values, 'p': _code, 'party': acc.party.values, 'low': acc.low.values, 'kind': acc.kind.values, 'day': acc.day.values}).dropna(subset=['p'])
    _pt = _pd.copy()   # all votes, for "through a day"
    _pd = _pd[_pd.kind == 'ev']
    PCT_DAYS = {'asof': ASOF, 'min': PRECINCT_MIN, 'days': EVD_FULL, 'c': {}, 't': {}}
    _pt['n'] = 1
    for y in ('DEM', 'REP', 'UNA'):
        _pt[y] = (_pt.party == y).astype(int)
        _pt['l' + y] = ((_pt.party == y) & _pt.low).astype(int)
    _tc = ['n', 'DEM', 'REP', 'UNA', 'lDEM', 'lREP', 'lUNA']
    _cum = _pt.groupby(['c', 'p', 'day'])[_tc].sum().groupby(level=[0, 1]).cumsum()
    for (c, p), g in _cum.groupby(level=[0, 1]):   # votes so far at the end of each day: [votes, D, R, U, low D, R, U]; null under the minimum
        g = g.droplevel([0, 1])
        arr = []
        for d in EVD_FULL:
            x = g[g.index <= d]
            v = [int(q) for q in x.iloc[-1]] if len(x) else None
            arr.append(v if v and v[0] >= PRECINCT_MIN else None)
        PCT_DAYS['t'].setdefault(c, {})[p] = arr
    _g = {k: g for k, g in _pd.groupby(['c', 'p'])}
    for (c, p), g in _g.items():
        byd = {d: x for d, x in g.groupby('day')}
        arr = []
        for d in EVD_FULL:
            x = byd.get(d)
            if x is None or len(x) < PRECINCT_MIN:
                arr.append(None)
            else:
                arr.append([int(len(x))] + [int((x.party == y).sum()) for y in ('DEM', 'REP', 'UNA')] + [int(((x.party == y) & x.low).sum()) for y in ('DEM', 'REP', 'UNA')])
        PCT_DAYS['c'].setdefault(c, {})[p] = arr
    # never exactly one hidden precinct with votes in a county on any day, as in pct.json (the counts under the minimum are
    # already null, so the raw counts for the rule come from the data frames)
    _cn_t = {}   # votes so far at the end of each day, and votes on each day, per precinct
    for (c, p), g in _cum['n'].groupby(level=[0, 1]):
        g = g.droplevel([0, 1]); _cn_t.setdefault(c, {})[p] = [int(g[g.index <= d].iloc[-1]) if (g.index <= d).any() else 0 for d in EVD_FULL]
    _cn_d = {}
    for (c, p, d), n in _pd.groupby(['c', 'p', 'day']).size().items():
        if d in EVD_FULL:
            _cn_d.setdefault(c, {}).setdefault(p, [0] * len(EVD_FULL))[EVD_FULL.index(d)] = int(n)
    for key, cnts in (('t', _cn_t), ('c', _cn_d)):
        for c, ps in PCT_DAYS[key].items():
            for i in range(len(EVD_FULL)):
                x = also_hide({p: v[i] for p, v in cnts.get(c, {}).items()})
                if x is not None and x in ps:
                    ps[x][i] = None
        PCT_DAYS[key] = {c: {p: a for p, a in ps.items() if any(v is not None for v in a)} for c, ps in PCT_DAYS[key].items()}
        PCT_DAYS[key] = {c: ps for c, ps in PCT_DAYS[key].items() if ps}

# ---- safety checks against the last published file ----
prev_path = os.path.join(OUT, 'data.json')
if os.path.exists(prev_path):
    prev = json.load(open(prev_path))
    pv, nv = prev['state']['vc'], out['state']['vc']
    if pv and nv < pv * DROP_LIMIT:
        fail(f'votes cast fell from {pv:,} to {nv:,} (more than {100 - DROP_LIMIT * 100:.0f}%); keeping the previous data')
    pe, ne = prev['state'].get('ed') or 0, out['state'].get('ed') or 0
    if pe and ne < pe * ED_DROP_LIMIT:
        fail(f'Election Day votes fell from {pe:,} to {ne:,}; keeping the previous data')
if ed_pct is not None and sum(r['ed'] for r in out['geo']['county']) != out['state']['ed']:
    fail('Election Day county totals do not add up to the statewide total')
if sum(sum(r[1]) for rows in out['sites'].values() for r in rows) > out['state']['ev']:
    fail('early voting site totals are larger than early in-person votes')
for key, _, _ in GEOS:
    if sum(r['vc'] for r in out['geo'][key]) + out['unassigned'][key] != out['state']['vc']:
        fail(f'{key} totals do not add up to the statewide total')

if PCT is not None:
    with open(os.path.join(OUT, 'pct.json'), 'w') as f:
        json.dump(PCT, f, separators=(',', ':'))
if PCT_DAYS is not None:
    with open(os.path.join(OUT, 'pct_days.json'), 'w') as f:
        json.dump(PCT_DAYS, f, separators=(',', ':'))
if PIECES is not None:   # one file per place: docs/pieces/<county|cd|hd|sd>/<name>.json with its pieces in each other layer, and its sites
    import shutil
    _pdir = os.path.join(OUT, 'pieces')
    shutil.rmtree(_pdir, ignore_errors=True)
    _files = {}
    for pair, rows in PIECES['p'].items():
        k1, k2 = pair.split('|')
        for kk, row in rows.items():
            n1, n2 = kk.split('|')
            _files.setdefault((k1, n1), {}).setdefault(k2, {})[n2] = row
            _files.setdefault((k2, n2), {}).setdefault(k1, {})[n1] = row
    for (k, n), inner in _files.items():
        os.makedirs(os.path.join(_pdir, k), exist_ok=True)
        body = {'asof': ASOF, 'p': inner}
        if k != 'county':
            body['sites'] = PIECES['sites'].get(k, {}).get(n, {})
        with open(os.path.join(_pdir, k, n + '.json'), 'w') as f:
            json.dump(body, f, separators=(',', ':'))
os.makedirs(os.path.join(OUT, 'archive'), exist_ok=True)
for path in (prev_path, os.path.join(OUT, 'archive', ASOF + '.json')):
    with open(path, 'w') as f:
        json.dump(out, f, separators=(',', ':'))

s = out['state']
print(f"as of {ASOF}: {s['vc']:,} votes cast ({s['ev']:,} early in person, {s['ml']:,} by mail)"
      + (f"; {s['ed']:,} on Election Day" if 'ed' in s else '')
      + f"; {len(cure):,} need a fix; {rejected_total:,} rejected; {sum(len(v) for v in out['sites'].values()):,} early voting sites"
      + (f"; precinct tables for {len(out['precincts'])} counties" if 'precincts' in out else '')
      + '; places: ' + ', '.join(f"{k} {len(v)}" for k, v in out['geo'].items()))
