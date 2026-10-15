"""Build the Turnout Tracker data file from the NC State Board of Elections statewide absentee file.

Usage:
    python build_data.py <absentee csv> <as-of date YYYY-MM-DD> <output dir> [<file Last-Modified header>]

If the State Board's Last-Modified header is given, the as-of date and the "updated" time come from it
(converted to Eastern time), so the published data says when the State Board posted the file.

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
import os
import re
import sys
from email.utils import parsedate_to_datetime
from zoneinfo import ZoneInfo

import pandas as pd

SRC, ASOF, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
UPDATED = None
if len(sys.argv) > 4 and sys.argv[4].strip():
    posted = parsedate_to_datetime(sys.argv[4].strip()).astimezone(ZoneInfo('America/New_York'))
    ASOF = posted.strftime('%Y-%m-%d')
    UPDATED = posted.isoformat(timespec='minutes')   # e.g. 2026-10-15T05:16-04:00
DROP_LIMIT = 0.95   # stop if total votes cast fall below 95% of the last published total

COLS = ['ncid', 'county_desc', 'voter_party_code', 'cong_dist_desc', 'nc_house_desc', 'nc_senate_desc',
        'ballot_req_type', 'ballot_rtn_dt', 'ballot_rtn_status']

# Every return status the State Board documents, grouped.
ACCEPTED = {'ACCEPTED', 'ACCEPTED - EXCEPTION', 'ACCEPTED - CURED'}
NEEDS_CURE = {'PENDING CURE', 'PHOTO ID CURABLE', 'ID NOT PROVIDED', 'CONFLICT', 'VOTER SIGNATURE MISSING',
              'AFFIDAVIT INCOMPLETE', 'PHOTO ID NONCOMPLIANT', 'AFFIDAVIT REVIEW PENDING', 'PENDING'}
REJECTED = {'AFFIDAVIT DECLINED', 'ASSISTANT INFO INCOMPLETE', 'NOT PROPERLY NOTARIZED', 'NO TIME FOR CURE',
            'NOT VOTED', 'REJECTED', 'RETURNED AFTER DEADLINE', 'RETURNED UNDELIVERABLE', 'SIGNED BY OTHER',
            'WITNESS INFO INCOMPLETE', 'WRONG VOTER', 'NO APPLICATION', 'E-TRANSMISSION FAILURE'}
REPLACED = {'SPOILED - EV', 'SPOILED', 'CANCELLED', 'DUPLICATE'}
KNOWN = ACCEPTED | NEEDS_CURE | REJECTED | REPLACED
TYPES = {'MAIL': 'ml', 'ONE-STOP': 'ev'}


def fail(msg):
    print('STOPPING: ' + msg, file=sys.stderr)
    sys.exit(1)


def norm(x):
    if pd.isna(x):
        return x
    s = re.sub(r'\s*-\s*', ' - ', str(x).upper().strip())
    return s.replace('E - TRANSMISSION', 'E-TRANSMISSION').replace('ONE - STOP', 'ONE-STOP')


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

# ---- votes cast: accepted ballots, one per voter, early in-person preferred ----
acc = df[df.st.isin(ACCEPTED)].copy()
acc['kind'] = acc.rtype.map(TYPES)
acc['when'] = pd.to_datetime(acc.ballot_rtn_dt, format='%m/%d/%Y', errors='coerce')
acc['prio'] = (acc.kind == 'ev').astype(int)
acc = acc.sort_values(['prio', 'when'], ascending=[False, False]).drop_duplicates('ncid', keep='first')
acc['party'] = acc.voter_party_code.where(acc.voter_party_code.isin(['DEM', 'REP', 'UNA']), 'OTH')
asof_ts = pd.Timestamp(ASOF)
acc['when'] = acc.when.fillna(asof_ts)
acc['day'] = acc.when.where(acc.when <= asof_ts, asof_ts).dt.strftime('%Y-%m-%d')  # future-dated records count on the file date
days = pd.date_range(acc.when.min(), asof_ts, freq='D').strftime('%Y-%m-%d').tolist() if len(acc) else [ASOF]


def totals(s):
    k = s.kind.value_counts()
    p = s.party.value_counts()
    by = s.groupby(['day', 'kind']).size().unstack(fill_value=0).reindex(days, fill_value=0)
    return {
        'vc': int(len(s)), 'ev': int(k.get('ev', 0)), 'ml': int(k.get('ml', 0)),
        'pty': [int(p.get(x, 0)) for x in ['DEM', 'REP', 'UNA', 'OTH']],
        'tml': [int(x) for x in by['ml']] if 'ml' in by else [0] * len(days),   # new votes per day, by mail
        'tev': [int(x) for x in by['ev']] if 'ev' in by else [0] * len(days),   # new votes per day, early in person
    }


def num(x):
    m = re.search(r'(\d+)$', str(x))
    return int(m.group(1)) if m else 0


GEOS = [('county', 'county_desc', lambda v: v.title()),
        ('cd', 'cong_dist_desc', lambda v: f'CD {num(v)}'),
        ('hd', 'nc_house_desc', lambda v: f'HD {num(v)}'),
        ('sd', 'nc_senate_desc', lambda v: f'SD {num(v)}')]

out = {'asof': ASOF, 'updated': UPDATED, 'days': days, 'state': totals(acc), 'geo': {}, 'unassigned': {}}
out['state']['g_rej'] = rejected_total
for key, field, label in GEOS:
    # Every place that appears in the file gets a row, even with zero accepted votes so far.
    places = df[field].dropna().unique()
    rows = []
    for v in places:
        r = totals(acc[acc[field] == v])
        r['name'] = label(v)
        rows.append(r)
    rows.sort(key=lambda r: (r['name'] if key == 'county' else num(r['name'])))
    out['geo'][key] = rows
    # Voters with no district listed in the State Board file count statewide and in their county only.
    out['unassigned'][key] = int(acc[field].isna().sum())

# ---- safety checks against the last published file ----
prev_path = os.path.join(OUT, 'data.json')
if os.path.exists(prev_path):
    prev = json.load(open(prev_path))
    pv, nv = prev['state']['vc'], out['state']['vc']
    if pv and nv < pv * DROP_LIMIT:
        fail(f'votes cast fell from {pv:,} to {nv:,} (more than {100 - DROP_LIMIT * 100:.0f}%); keeping the previous data')
for key, _, _ in GEOS:
    if sum(r['vc'] for r in out['geo'][key]) + out['unassigned'][key] != out['state']['vc']:
        fail(f'{key} totals do not add up to the statewide total')

os.makedirs(os.path.join(OUT, 'archive'), exist_ok=True)
for path in (prev_path, os.path.join(OUT, 'archive', ASOF + '.json')):
    with open(path, 'w') as f:
        json.dump(out, f, separators=(',', ':'))

s = out['state']
print(f"as of {ASOF}: {s['vc']:,} votes cast ({s['ev']:,} early in person, {s['ml']:,} by mail); "
      f"{rejected_total:,} rejected; places: " + ', '.join(f"{k} {len(v)}" for k, v in out['geo'].items()))
