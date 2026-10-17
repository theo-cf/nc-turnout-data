"""Build the data file for Carolina Forward's staff-only mail ballot cure tracker.

Usage:
    python build_staff.py <absentee csv> <output dir> [<file Last-Modified header>]

Writes <output dir>/data.json. THIS FILE CONTAINS VOTER NAMES AND ADDRESSES. It must only ever be
deployed behind Cloudflare Access, never committed to this (public) repository and never printed
to the workflow log. The output directory is listed in .gitignore.

Counting rules (one row per voter, never per ballot):
  * Returned mail voters: voters with at least one returned mail ballot (any status except Pending).
  * Each of them lands in exactly one group, checked in this order:
      1. Voted in person instead: an early in-person ballot was accepted.
      2. Accepted by mail: a mail ballot was accepted.
      3. Waiting on the voter: a mail ballot needs a fix and nothing has been accepted.
      4. Not counted: a mail ballot was rejected and nothing is pending or accepted.
      5. Replaced: only spoiled, cancelled or duplicate ballots remain.
  * A voter with more than one ballot needing a fix is listed under the most recently returned one.
"""
import json
import re
import os
import string
import sys
from email.utils import parsedate_to_datetime
from zoneinfo import ZoneInfo

import pandas as pd

from ncsbe import ACCEPTED, KNOWN, NEEDS_CURE, REJECTED, TYPES, norm, num

SRC, OUT = sys.argv[1], sys.argv[2]
ASOF, UPDATED = pd.Timestamp.now(tz='America/New_York').strftime('%Y-%m-%d'), None
if len(sys.argv) > 3 and sys.argv[3].strip():
    posted = parsedate_to_datetime(sys.argv[3].strip()).astimezone(ZoneInfo('America/New_York'))
    ASOF, UPDATED = posted.strftime('%Y-%m-%d'), posted.isoformat(timespec='minutes')

CURE = NEEDS_CURE - {'PENDING'}
# Short keys for every status a voter can be waiting on, in the State Board's own words.
CURE_KEYS = [('pend', 'PENDING CURE'), ('idc', 'PHOTO ID CURABLE'), ('idn', 'ID NOT PROVIDED'), ('conf', 'CONFLICT'),
             ('sig', 'VOTER SIGNATURE MISSING'), ('affi', 'AFFIDAVIT INCOMPLETE'), ('idnc', 'PHOTO ID NONCOMPLIANT'),
             ('aff', 'AFFIDAVIT REVIEW PENDING')]
assert {s for _, s in CURE_KEYS} == CURE
CURE_KEY = {s: k for k, s in CURE_KEYS}
PARTIES = ['DEM', 'REP', 'UNA', 'OTH']


def fail(msg):
    print('STOPPING: ' + msg, file=sys.stderr)
    sys.exit(1)


df = pd.read_csv(SRC, encoding='iso-8859-1', dtype=str, keep_default_na=False, na_values=[''])
if len(df) == 0:
    fail('the State Board file has no rows')
df['rtype'] = df.ballot_req_type.map(norm)
df['st'] = df.ballot_rtn_status.map(norm)
if set(df.rtype.dropna()) - set(TYPES):
    fail('unrecognized ballot type in the State Board file')
if set(df.st.dropna()) - KNOWN:
    fail(f'unrecognized ballot status(es): {sorted(set(df.st.dropna()) - KNOWN)}')
df['when'] = pd.to_datetime(df.ballot_rtn_dt, format='%m/%d/%Y', errors='coerce')
df['party'] = df.voter_party_code.where(df.voter_party_code.isin(PARTIES[:3]), 'OTH')

mail = df[(df.rtype == 'MAIL') & df.st.notna() & (df.st != 'PENDING')]
ev_ok = set(df.loc[(df.rtype.map(TYPES) == 'ev') & df.st.isin(ACCEPTED), 'ncid'])
ml_ok = set(mail.loc[mail.st.isin(ACCEPTED), 'ncid'])
waiting = set(mail.loc[mail.st.isin(CURE), 'ncid'])
rejected = set(mail.loc[mail.st.isin(REJECTED), 'ncid'])

# One row per returned-mail voter: the most recently returned mail ballot carries their details.
v = mail.sort_values('when', ascending=False, na_position='last').drop_duplicates('ncid').set_index('ncid')


def group(i):
    if i in ev_ok:
        return 'ip'
    if i in ml_ok:
        return 'acc'
    if i in waiting:
        return 'wait'
    if i in rejected:
        return 'rej'
    return 'repl'


v['grp'] = [group(i) for i in v.index]

# Accepted-by-mail subtype (accepted / with exception / cured), from that voter's accepted mail ballot.
acc_rows = mail[mail.st.isin(ACCEPTED)].sort_values('when', ascending=False, na_position='last').drop_duplicates('ncid')
v['acc_st'] = acc_rows.set_index('ncid').st.reindex(v.index)
# Status a waiting voter is listed under: their most recently returned ballot that needs a fix.
cure_rows = mail[mail.st.isin(CURE)].sort_values('when', ascending=False, na_position='last').drop_duplicates('ncid')
v['cure_st'] = cure_rows.set_index('ncid').st.reindex(v.index)
cure_when = cure_rows.set_index('ncid').when.reindex(v.index)

SUB = {'ACCEPTED': 'acc_ok', 'ACCEPTED - EXCEPTION': 'acc_exc', 'ACCEPTED - CURED': 'acc_cur'}


def summary(s):
    g = s.grp.value_counts()
    w = s[s.grp == 'wait']
    a = s[s.grp == 'acc'].acc_st.map(SUB).value_counts()
    out = {'n': int(len(s))}
    for k in ['acc', 'ip', 'wait', 'rej', 'repl']:
        out[k] = int(g.get(k, 0))
    for k in SUB.values():
        out[k] = int(a.get(k, 0))
    out['email'] = int((s.ballot_req_delivery_type == 'E-MAIL').sum())
    out['pn'] = [int((s.party == p).sum()) for p in PARTIES]      # returned mail voters by party
    out['pw'] = [int((w.party == p).sum()) for p in PARTIES]      # waiting on the voter, by party
    # waiting on the voter, by status and party: {status key: [DEM, REP, UNA, OTH]}
    out['sp'] = {CURE_KEY[st]: [int((g2.party == p).sum()) for p in PARTIES] for st, g2 in w.groupby('cure_st')}
    return out


GEOS = [('county', 'county_desc', lambda x: x.title()),
        ('cd', 'cong_dist_desc', lambda x: f'CD {num(x)}'),
        ('hd', 'nc_house_desc', lambda x: f'HD {num(x)}'),
        ('sd', 'nc_senate_desc', lambda x: f'SD {num(x)}')]

out = {'asof': ASOF, 'updated': UPDATED, 'cure_keys': CURE_KEYS, 'state': summary(v), 'geo': {}, 'precincts': {}}
for key, field, label in GEOS:
    rows = []
    for name, s in v.groupby(field):
        r = summary(s)
        r['name'] = label(name)
        rows.append(r)
    rows.sort(key=lambda r: (r['name'] if key == 'county' else num(r['name'])))
    out['geo'][key] = rows

# Per precinct: [returned mail voters, waiting on the voter, waiting DEM, REP, UNA, OTH].
for (county, pct), s in v.groupby(['county_desc', 'precinct_desc']):
    w = s[s.grp == 'wait']
    out['precincts'].setdefault(county.title(), {})[pct] = [int(len(s)), int(len(w))] + [int((w.party == p).sum()) for p in PARTIES]

# ---- data checks on returned mail ballots (counts only) ----
rtn = mail.when
snd = pd.to_datetime(mail.ballot_send_dt, format='%m/%d/%Y', errors='coerce')
req = pd.to_datetime(mail.ballot_req_dt, format='%m/%d/%Y', errors='coerce')
age = pd.to_numeric(mail.age, errors='coerce')
checks = [('Return date after file date', rtn > pd.Timestamp(ASOF)),
          ('Returned before ballot was sent', rtn < snd),
          ('Sent before it was requested', snd < req),
          ('Missing or unreadable date', rtn.isna() | snd.isna() | req.isna()),
          ('Age over 105', age > 105), ('Age under 18', age < 18)]
out['flags'] = [[name, c.title(), int(k)] for name, m in checks
                for c, k in mail[m.fillna(False)].groupby('county_desc').size().items()]


# ---- the voter list: everyone waiting on the voter ----
def clean(*parts):
    return ' '.join(' '.join(str(p) for p in parts if isinstance(p, str) and p.strip()).split())


def title(x):
    # capwords, not str.title(), so "17TH ST" becomes "17th St" rather than "17Th St"
    if not isinstance(x, str):
        return ''
    return re.sub(r"([-'])([a-z])", lambda m: m.group(1) + m.group(2).upper(), string.capwords(x))   # Mosher-Gomez, O'Neal


def addr(street, city, state, zip_):
    line = clean(street)
    rest = clean(city, state, zip_)
    return ', '.join(x for x in (line, rest) if x)


def fix_state(x):
    x = re.sub(r'\b(Ne|Nw|Se|Sw|Po)\b', lambda m: m.group(1).upper(), x)          # directionals, PO Box
    return re.sub(r'\b([A-Z][a-z]) (\d{5})', lambda m: m.group(1).upper() + ' ' + m.group(2), x)   # state before ZIP


def same(a, b):
    return re.sub(r'[^A-Z0-9]', '', a.upper()) == re.sub(r'[^A-Z0-9]', '', b.upper())


# Voting history (optional): HISTORY_FILE is the private lookup from build_history.py. For each voter waiting, which of
# the last three November elections (2020, 2022, 2024) they voted in, and whether they're a New Voter (no NC vote on or
# before Nov. 3, 2020, and registered after it or too young for it). Voters not in the lookup count as New Voters.
HISTORY_FILE = os.environ.get('HISTORY_FILE', '').strip()
HIST = pd.read_pickle(HISTORY_FILE) if HISTORY_FILE and os.path.exists(HISTORY_FILE) else None


def history(ncid):
    if HIST is None:
        return {}
    if ncid not in HIST.index:
        return {'h': 'NNN', 'nv': 1}
    b, reg, by = HIST.at[ncid, 'b'], HIST.at[ncid, 'reg'], HIST.at[ncid, 'by']
    new = (b & 7) == 0 and (reg > 20201103 or by >= 2003)
    return {'h': ''.join('Y' if b & bit else 'N' for bit in (4, 8, 16)), 'nv': int(bool(new))}


voters = []
for i, r in v[v.grp == 'wait'].iterrows():
    home = addr(r.voter_street_address, r.voter_city, r.voter_state, r.voter_zip)
    mail_to = addr(r.ballot_mail_street_address, r.ballot_mail_city, r.ballot_mail_state, r.ballot_mail_zip)
    if not mail_to:
        mail_to = ', '.join(x for x in (clean(r.other_mail_addr1), clean(r.other_mail_addr2), clean(r.other_city_state_zip)) if x)
    w = cure_when[i]
    voters.append({
        'name': title(clean(r.voter_first_name, r.voter_middle_name, r.voter_last_name)),
        'ncid': i, 'reg': r.voter_reg_num or '',
        'county': title(r.county_desc), 'precinct': r.precinct_desc if isinstance(r.precinct_desc, str) else '',   # a few voters have no precinct listed
        'cd': num(r.cong_dist_desc) or '', 'hd': num(r.nc_house_desc) or '', 'sd': num(r.nc_senate_desc) or '',
        'party': r.party, 'pcode': r.voter_party_code or '', 'age': int(r.age) if str(r.age).isdigit() else '',
        'status': CURE_KEY[r.cure_st], 'returned': w.strftime('%Y-%m-%d') if pd.notna(w) else '',
        'home': fix_state(title(home)),
        'mail_to': '' if same(mail_to, home) else fix_state(title(mail_to)),
        'delivery': (r.ballot_req_delivery_type or '').title().replace('E-Mail', 'Email'),
    } | history(i))
voters.sort(key=lambda x: (x['county'], x['precinct'], x['name']))
out['voters'] = voters

# ---- safety checks ----
s = out['state']
if s['acc'] + s['ip'] + s['wait'] + s['rej'] + s['repl'] != s['n']:
    fail('voter groups do not add up to returned mail voters')
if len(voters) != s['wait']:
    fail('voter list length does not match the waiting count')
for key, _, _ in GEOS:
    if sum(r['n'] for r in out['geo'][key]) + int(v[dict((g[0], g[1]) for g in GEOS)[key]].isna().sum()) != s['n']:
        fail(f'{key} totals do not add up')

os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, 'data.json'), 'w') as f:
    json.dump(out, f, separators=(',', ':'))
# Counts only: the workflow log is public.
print(f"staff data as of {ASOF}: {s['n']:,} returned mail voters; {s['acc']:,} accepted by mail; "
      f"{s['ip']:,} voted in person instead; {s['wait']:,} waiting on the voter; {s['rej']:,} not counted")
