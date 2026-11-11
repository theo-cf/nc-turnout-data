"""Provisional ballots for the staff cure tracker.

Called by build_staff.py when PROV_FILE points at the State Board's provisional file
(ENRS/2026_11_03/provisional_20261103.txt: UTF-16, tab-separated, one row per provisional ballot).
Returns the `prov` block of the staff data.json. THIS CONTAINS VOTER NAMES, ADDRESSES AND PHONE NUMBERS:
it goes only into the staff data file, never into the repo or the log (counts only there).

Each ballot's reason (pv_voted_reason) puts it in one action group:
  id   Must bring a photo ID to the county board by the deadline (no exception form).
  num  May need to send a driver's license or SSN number, or a HAVA ID, by the same deadline
       (Numbered Memo 2025-02: only if the number they gave didn't validate or was left out).
  rev  The county board is checking eligibility (registration, removal, move, address).
  na   No action expected from the voter: photo ID exception forms, wrong precinct (counted for the
       contests the voter is eligible in), voted during extended hours.
Reasons the State Board adds later fall into `rev` and show under their own label.
"""
import re
import string

import pandas as pd

from ncsbe import eth_code, num, race_code

# Deadlines for the Nov. 3, 2026 general election (State Board press release, Nov. 4, 2026).
DEADLINE = '2026-11-10T12:00'     # photo ID, HAVA ID and Registration Repair numbers: noon, 5th business day after
CANVASS = '2026-11-13T11:00'      # county canvass
ELECTION_DAY = '2026-11-03'

GROUP = {
    'ID NOT PROVIDED - NO EXCEPTION FORM/RETURN WITH ID': 'id', 'ID NOT PROVIDED': 'id',
    'DL/SSN PROVISIONAL': 'num', 'HAVA ID NOT PROVIDED': 'num',
    'NO RECORD OF REGISTRATION': 'rev', 'PREVIOUSLY REMOVED': 'rev', 'UNREPORTED MOVE': 'rev',
    'UNRECOGNIZED ADDRESS (GEOCODE ISSUE)': 'rev', 'JURISDICTION DISPUTE': 'rev', 'VOTER ALREADY VOTED': 'rev',
    'INCORRECT PARTY': 'rev',
    'ID NOT PROVIDED - EXCEPTION -REASONABLE IMPEDIMENT': 'na', 'ID NOT PROVIDED - EXCEPTION -NATURAL DISASTER': 'na',
    'ID NOT PROVIDED - EXCEPTION -RELIGIOUS OBJECTION': 'na', 'INCORRECT PRECINCT': 'na', 'VOTED DURING EXTENDED HOURS': 'na',
}
# Plain-language reason labels; anything new keeps the State Board's wording.
LABEL = {
    'ID NOT PROVIDED - NO EXCEPTION FORM/RETURN WITH ID': 'No photo ID, must return with ID', 'ID NOT PROVIDED': 'No photo ID',
    'DL/SSN PROVISIONAL': 'Registration Repair (DL/SSN)', 'HAVA ID NOT PROVIDED': 'HAVA ID not provided',
    'NO RECORD OF REGISTRATION': 'No record of registration', 'PREVIOUSLY REMOVED': 'Previously removed',
    'UNREPORTED MOVE': 'Unreported move', 'UNRECOGNIZED ADDRESS (GEOCODE ISSUE)': 'Unrecognized address',
    'JURISDICTION DISPUTE': 'Jurisdiction dispute', 'VOTER ALREADY VOTED': 'Already voted', 'INCORRECT PARTY': 'Wrong party ballot',
    'ID NOT PROVIDED - EXCEPTION -REASONABLE IMPEDIMENT': 'ID exception: reasonable impediment',
    'ID NOT PROVIDED - EXCEPTION -NATURAL DISASTER': 'ID exception: natural disaster',
    'ID NOT PROVIDED - EXCEPTION -RELIGIOUS OBJECTION': 'ID exception: religious objection',
    'INCORRECT PRECINCT': 'Wrong precinct', 'VOTED DURING EXTENDED HOURS': 'Voted during extended hours',
}
STATUS = {'PENDING': 'pend', 'APPROVED': 'ok', 'PARTIAL': 'part', 'NOT COUNTED': 'no'}
GROUPS = ['id', 'num', 'rev', 'na']


def _title(x):
    if not isinstance(x, str) or not x.strip():
        return ''
    s = re.sub(r"([-'])([a-z])", lambda m: m.group(1) + m.group(2).upper(), string.capwords(' '.join(x.split())))
    s = re.sub(r'\b(Ne|Nw|Se|Sw|Po)\b', lambda m: m.group(1).upper(), s)
    return re.sub(r'\b([A-Z][a-z]) (\d{5})', lambda m: m.group(1).upper() + ' ' + m.group(2), s)


def _phone(x):
    d = re.sub(r'\D', '', x or '')
    if len(d) == 11 and d[0] == '1':
        d = d[1:]
    return f'({d[:3]}) {d[3:6]}-{d[6:]}' if len(d) == 10 else ''


def build(path, precincts_csv='precincts.csv'):
    d = pd.read_csv(path, sep='\t', encoding='utf-16', dtype=str, keep_default_na=False)
    d.columns = [c.strip() for c in d.columns]
    d = d.apply(lambda s: s.str.strip())
    if not len(d):
        raise ValueError('the provisional file has no rows')
    for c in ['county_name', 'voter_reg_num', 'voted_dt', 'reg_pct_lbl', 'voted_pct_lbl', 'full_name', 'res_addr_street',
              'res_addr_csz', 'pv_voted_reason', 'pv_status', 'not_counted_reason', 'phone_num', 'pv_party']:
        if c not in d.columns:
            raise ValueError(f'the provisional file has no {c} column')

    # Districts from the precinct they're registered in, or else the one they voted in.
    p = pd.read_csv(precincts_csv, dtype=str)
    pk = {(r.county.upper(), r.code.strip()): (num(r.cd), num(r.hd), num(r.sd)) for r in p.itertuples()}
    county = d.county_name.str.upper()
    home_pct = d.reg_pct_lbl.where(d.reg_pct_lbl != '', d.voted_pct_lbl)
    dist = [pk.get((c, x), (0, 0, 0)) for c, x in zip(county, home_pct)]

    reasons = sorted(set(d.pv_voted_reason) - {''}, key=lambda r: (GROUPS.index(GROUP.get(r, 'rev')), -int((d.pv_voted_reason == r).sum())))
    rix = {r: i for i, r in enumerate(reasons)}
    voted = pd.to_datetime(d.voted_dt.str[:10], format='%m/%d/%Y', errors='coerce')
    ok_date = (voted >= '2026-09-01') & (voted <= ELECTION_DAY)

    rows = []
    for i, r in enumerate(d.itertuples(index=False)):
        party = r.pv_party if r.pv_party in ('DEM', 'REP', 'UNA') else 'OTH'
        rows.append({
            'name': _title(r.full_name), 'reg': r.voter_reg_num,
            'county': _title(r.county_name), 'precinct': r.voted_pct_lbl,
            'rpct': r.reg_pct_lbl if r.reg_pct_lbl and r.reg_pct_lbl != r.voted_pct_lbl else '',
            'cd': dist[i][0] or '', 'hd': dist[i][1] or '', 'sd': dist[i][2] or '',
            'party': party, 'pcode': r.pv_party,
            'race': race_code(r.pv_race) if r.pv_race else '', 'eth': eth_code(r.pv_ethnicity) if r.pv_race or r.pv_ethnicity else '',
            'why': rix.get(r.pv_voted_reason, -1),
            'imp': r.reasonable_impediment_reason.capitalize() if r.reasonable_impediment_reason else '',
            'st': STATUS.get(r.pv_status, r.pv_status.title() or 'pend'),
            'nc': r.not_counted_reason.capitalize() if r.not_counted_reason else '',
            'voted': voted.iat[i].strftime('%Y-%m-%d') if ok_date.iat[i] else '',
            'curb': 1 if r.is_curbside == 'YES' else 0,
            'phone': _phone(r.phone_num),
            'home': _title(', '.join(x for x in (r.res_addr_street, r.res_addr_csz) if x)),
            'dmv': 1 if r.dmv_reg_issue == 'YES' else 0,
        })
    rows.sort(key=lambda x: (x['county'], x['precinct'], x['name']))

    stc = d.pv_status.map(lambda s: STATUS.get(s, 'other')).value_counts()
    grp = d.pv_voted_reason.map(lambda r: GROUP.get(r, 'rev')).value_counts()
    summary = {'n': len(d), 'pend': int(stc.get('pend', 0)), 'ok': int(stc.get('ok', 0)), 'part': int(stc.get('part', 0)),
               'no': int(stc.get('no', 0)), 'ed': int((voted == ELECTION_DAY).sum())}
    summary.update({g: int(grp.get(g, 0)) for g in GROUPS})
    unplaced = sum(1 for x in dist if not x[0])
    return {
        'deadline': DEADLINE, 'canvass': CANVASS, 'election_day': ELECTION_DAY,
        'reasons': [[LABEL.get(r, r.capitalize()), GROUP.get(r, 'rev'), r] for r in reasons],
        'state': summary, 'unplaced': unplaced, 'voters': rows,
    }


def counting_progress(results_pct):
    """Provisional votes counted so far, per county, from the State Board's precinct results file
    (results_pct_20261103.txt): the U.S. Senate race, which nearly every voter marks. Counts only."""
    r = pd.read_csv(results_pct, sep='\t', dtype=str, keep_default_na=False, usecols=['County', 'Contest Name', 'Provisional'])
    s = r[r['Contest Name'].str.startswith('US SENATE')]
    if not len(s):
        raise ValueError('no U.S. Senate rows in the precinct results file')
    return {_title(c): int(v) for c, v in pd.to_numeric(s.Provisional, errors='coerce').fillna(0).groupby(s.County).sum().items()}


def district_counts(path, precincts_csv='precincts.csv', results_pct=None):
    """Counts only, for the public district lean widget: provisional ballots cast in each district (by the precinct
    the voter is registered in, else the one they voted in), and how many of those are in counties that haven't
    added any provisional votes to their count yet."""
    d = pd.read_csv(path, sep='\t', encoding='utf-16', dtype=str, keep_default_na=False,
                    usecols=lambda c: c.strip() in ('county_name', 'reg_pct_lbl', 'voted_pct_lbl'))
    d.columns = [c.strip() for c in d.columns]
    d = d.apply(lambda s: s.str.strip())
    p = pd.read_csv(precincts_csv, dtype=str)
    pk = {(r.county.upper(), r.code.strip()): (num(r.cd), num(r.hd), num(r.sd)) for r in p.itertuples()}
    county = d.county_name.str.upper()
    home = d.reg_pct_lbl.where(d.reg_pct_lbl != '', d.voted_pct_lbl)
    counted = counting_progress(results_pct) if results_pct else None
    waiting = {c.upper() for c, n in counted.items() if n == 0} if counted else set()
    out = {'cd': {}, 'hd': {}, 'sd': {}}
    for c, x in zip(county, home):
        dist = pk.get((c, x))
        if not dist:
            continue
        for g, n in zip(('cd', 'hd', 'sd'), dist):
            o = out[g].setdefault(str(n), [0, 0, set()])
            o[0] += 1
            if c in waiting:
                o[1] += 1
                o[2].add(_title(c))
    cast = county.value_counts()
    summary = {'cast': int(len(d)), 'counties': {_title(c): [int(cast.get(c, 0)), counted.get(_title(c), 0) if counted else None]
                                               for c in sorted(set(cast.index) | {x.upper() for x in (counted or {})})}}
    if counted:
        summary['counted'] = int(sum(counted.values()))
        summary['wait'] = sorted(c for c, n in counted.items() if n == 0 and cast.get(c.upper(), 0))
    return out, summary
