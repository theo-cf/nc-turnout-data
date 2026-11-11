"""Election-night results for the district lean widget (results.json): the State Board's live unofficial count for
every congressional, NC House and NC Senate race, plus race calls.

The State Board never calls races. Calls come from district_lean/calls.csv (Chamber,District,Party,Called,Source),
one row per called race, added by hand as the AP calls them. A race with only one candidate on the ballot (write-ins
aside) is marked won at once, with source "unopposed".

Usage:
    python -I build_results.py [results_0.txt] [calls.csv] [out.json]
With no results file it downloads https://er.ncsbe.gov/enr/20261103/data/results_0.txt.

Output: {"asof": State Board file time (ISO, UTC), "built": ..., "cd"|"hd"|"sd": {"1": {
    "c": [[name, party, votes], ...] (most votes first), "in": precincts reporting, "of": precincts,
    "w": winning party or absent, "by": "AP" | "unopposed" | ..., "at": when called}},
    "st": {"m": average two-party D-R margin across tonight's statewide partisan races, "races": [[name, margin], ...]}}
Parties: D, R, L, G, I (unaffiliated); write-ins are left out.
"""
import csv
import datetime as dt
import os
import email.utils
import json
import re
import sys
import urllib.request

URL = 'https://er.ncsbe.gov/enr/20261103/data/results_0.txt'
PTY = {'DEM': 'D', 'REP': 'R', 'LIB': 'L', 'GRE': 'G', 'UNA': 'I'}   # I = unaffiliated, as in candidates.csv
RACE = [(re.compile(r'^US HOUSE OF REPRESENTATIVES DISTRICT 0*(\d+)\b'), 'cd'),
        (re.compile(r'^NC HOUSE OF REPRESENTATIVES DISTRICT 0*(\d+)\b'), 'hd'),
        (re.compile(r'^NC STATE SENATE DISTRICT 0*(\d+)\b'), 'sd')]
# Tonight's statewide environment, for "vs. lean": the average two-party margin across the statewide partisan races,
# mirroring the lean itself (an average of statewide Council of State races)
STATEWIDE = re.compile(r'^(US SENATE|NC SUPREME COURT ASSOCIATE JUSTICE SEAT \d+|NC COURT OF APPEALS JUDGE SEAT \d+)\b')
CH = {'congress': 'cd', 'cd': 'cd', 'us house': 'cd', 'nc house': 'hd', 'house': 'hd', 'hd': 'hd',
      'nc senate': 'sd', 'senate': 'sd', 'sd': 'sd'}


def load(path):
    if path:
        with open(path, encoding='utf-8-sig') as f:
            return json.load(f), None
    req = urllib.request.Request(URL, headers={'User-Agent': 'carolina-forward-results'})
    with urllib.request.urlopen(req, timeout=60) as r:
        lm = r.headers.get('Last-Modified')
        return json.loads(r.read().decode('utf-8-sig')), lm


def main():
    src = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] != '-' else None
    calls_path = sys.argv[2] if len(sys.argv) > 2 else 'district_lean/calls.csv'
    out_path = sys.argv[3] if len(sys.argv) > 3 else 'results.json'
    rows, lm = load(src)
    out = {'cd': {}, 'hd': {}, 'sd': {}}
    sw = {}
    for x in rows:
        if STATEWIDE.match(x['cnm']) and x['pty'] in ('DEM', 'REP'):
            sw.setdefault(x['cnm'].split(' (')[0], {})[x['pty']] = int(x['vct'])
        for rx, g in RACE:
            m = rx.match(x['cnm'])
            if not m:
                continue
            p = PTY.get(x['pty'].strip())
            race = out[g].setdefault(str(int(m.group(1))), {'c': [], 'in': int(x['prt']), 'of': int(x['ptl'])})
            if p:   # write-ins have no party; leave them out
                race['c'].append([x['bnm'].strip(), p, int(x['vct'])])
            pv = race.setdefault('pv', [0, 0, 0])   # provisional votes counted so far: D, R, all candidates
            n = int(x.get('pvc') or 0)
            pv[2] += n
            if p in ('D', 'R'):
                pv['DR'.index(p)] += n
            break
    for g in out:
        for race in out[g].values():
            race['c'].sort(key=lambda c: -c[2])
            if len(race['c']) == 1:
                race.update(w=race['c'][0][1], by='unopposed')
    n_calls = 0
    try:
        with open(calls_path, newline='', encoding='utf-8-sig') as f:
            for c in csv.DictReader(f):
                g, d, p = CH[c['Chamber'].strip().lower()], str(int(c['District'])), c['Party'].strip().upper()
                race = out[g].get(d)
                if race is None or not any(x[1] == p for x in race['c']):
                    sys.exit(f'calls.csv: no {p} candidate in {g} {d}')
                race.update(w=p, by=(c.get('Source') or 'AP').strip(), at=(c.get('Called') or '').strip())
                n_calls += 1
    except FileNotFoundError:
        pass
    asof = email.utils.parsedate_to_datetime(lm).isoformat() if lm else None
    races = [[n, round((v['DEM'] - v['REP']) / (v['DEM'] + v['REP']) * 100, 2)] for n, v in sorted(sw.items()) if v.get('DEM', 0) + v.get('REP', 0) > 0 and 'DEM' in v and 'REP' in v]
    st = {'m': round(sum(m for _, m in races) / len(races), 2), 'races': races} if races else None
    # Provisional ballots cast in each district (counts only), when the provisional file is passed in PROV_FILE.
    # RESULTS_PCT (the precinct results file) says which counties have added provisional votes to their count yet.
    prov = None
    pf, rp = os.environ.get('PROV_FILE', '').strip(), os.environ.get('RESULTS_PCT', '').strip()
    if pf and os.path.exists(pf):
        try:
            sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
            from build_provisional import district_counts
            by, prov = district_counts(pf, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'precincts.csv'),
                                       rp if rp and os.path.exists(rp) else None)
            for g in by:
                for d, (n, w, wc) in by[g].items():
                    if d in out[g]:
                        out[g][d]['pc'], out[g][d]['pw'] = n, w   # cast in the district; in counties not counting them yet
                        if wc:
                            out[g][d]['pwc'] = sorted(wc)
            for k in ('PROV_MODIFIED', 'RESULTS_PCT_MODIFIED'):
                v = os.environ.get(k, '').strip()
                if v:
                    prov[k.lower().replace('_modified', '').replace('prov', 'file').replace('results_pct', 'pct')] = email.utils.parsedate_to_datetime(v).isoformat()
            print('provisional:', prov['cast'], 'cast;', prov.get('counted'), 'counted;', len(prov.get('wait', [])), 'counties not counting yet')
        except Exception as e:   # never hold up the results over this
            print(f'::warning::provisional counts skipped: {type(e).__name__}: {e}', file=sys.stderr)
            prov = None
    out = {'asof': asof, 'built': dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'), 'st': st, **out}
    if prov:
        out['prov'] = prov
    with open(out_path, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    print({g: (len(out[g]), sum(1 for r in out[g].values() if 'w' in r)) for g in ('cd', 'hd', 'sd')}, 'calls:', n_calls)


if __name__ == '__main__':
    main()
