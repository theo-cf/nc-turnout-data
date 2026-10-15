"""Encrypt the staff cure tracker data, one locked file per access group.

Usage:
    STAFF_GROUPS='<json>' python encrypt_staff.py <staff data.json> <output dir>
    python encrypt_staff.py <staff data.json> <output dir> --groups <groups.json>   (local testing)

STAFF_GROUPS is a JSON list, kept as a GitHub Actions secret (never in this repo):

    [
      {"label": "Carolina Forward staff", "password": "<long passphrase>", "area": "all"},
      {"label": "Orange County volunteers", "password": "<long passphrase>",
       "area": {"county": ["Orange"], "hd": [22]}}
    ]

"area" is "all", or any mix of county names and congressional (cd), NC House (hd) and NC Senate (sd)
district numbers. A group's file holds the statewide and district totals plus ONLY the voters in its area.

How the lock works:
  * Each run picks a fresh random salt. For each group, PBKDF2-SHA256 (600,000 rounds) turns the
    password and salt into 48 bytes: the first 32 are an AES-256-GCM key, the last 16 name the file.
  * The page asks for a password, repeats the same derivation in the browser, fetches the file with
    that name and decrypts it. Passwords never leave the reader's device and are never published.
  * Without a correct password the files are unreadable, so they can sit on a public web host.

Writes <output dir>/index.json (salt and settings) and <output dir>/<file id>.json for each group.
Prints counts only (never group names or passwords), because the workflow log is public.
"""
import base64
import hashlib
import json
import os
import secrets
import sys
import unicodedata

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

ITERATIONS = 600_000
AAD = b'nc-cure-staff-v1'
MIN_PASSWORD = 16
AREA_KEYS = ('county', 'cd', 'hd', 'sd')
NAMES = {'county': 'County', 'cd': 'Congressional District', 'hd': 'NC House District', 'sd': 'NC Senate District'}


def fail(msg):
    print('STOPPING: ' + msg, file=sys.stderr)
    sys.exit(1)


def b64(b):
    return base64.b64encode(b).decode('ascii')


def norm_password(p):
    # Must match the page: Unicode NFKC, surrounding spaces ignored.
    return unicodedata.normalize('NFKC', p).strip()


def load_groups(argv):
    if '--groups' in argv:
        raw = open(argv[argv.index('--groups') + 1]).read()
    else:
        raw = os.environ.get('STAFF_GROUPS', '')
    if not raw.strip():
        fail('no access groups set (STAFF_GROUPS secret is empty)')
    try:
        groups = json.loads(raw)
    except json.JSONDecodeError as e:
        fail(f'STAFF_GROUPS is not valid JSON (line {e.lineno}, column {e.colno})')
    if not isinstance(groups, list) or not groups:
        fail('STAFF_GROUPS must be a list with at least one group')
    return groups


def check_groups(groups, data):
    known = {'county': {r['name'].lower() for r in data['geo']['county']}}
    for k in ('cd', 'hd', 'sd'):
        known[k] = {int(''.join(ch for ch in r['name'] if ch.isdigit())) for r in data['geo'][k]}
    seen = set()
    for n, g in enumerate(groups, 1):
        label = str(g.get('label', '')).strip()
        if not label:
            fail(f'group {n} has no label')
        pw = norm_password(str(g.get('password', '')))
        if len(pw) < MIN_PASSWORD:
            fail(f'the password for group {n} is shorter than {MIN_PASSWORD} characters')
        if pw in seen:
            fail(f'group {n} reuses another group\'s password')
        seen.add(pw)
        area = g.get('area')
        if area == 'all':
            continue
        if not isinstance(area, dict) or not area or set(area) - set(AREA_KEYS):
            fail(f'group {n} needs "area": "all" or a mix of {", ".join(AREA_KEYS)}')
        for k, vals in area.items():
            for v in vals:
                key = str(v).lower() if k == 'county' else int(v)
                if key not in known[k]:
                    fail(f'group {n}: {k} "{v}" is not in the State Board file')


def in_area(v, area):
    if area == 'all':
        return True
    if v['county'].lower() in {str(c).lower() for c in area.get('county', [])}:
        return True
    return any(v[k] != '' and int(v[k]) in {int(x) for x in area.get(k, [])} for k in ('cd', 'hd', 'sd'))


def describe(area):
    if area == 'all':
        return 'Statewide'
    parts = []
    if area.get('county'):
        cs = [str(c).title() for c in area['county']]
        parts.append((', '.join(cs[:-1]) + ' and ' + cs[-1] if len(cs) > 1 else cs[0]) + (' counties' if len(cs) > 1 else ' County'))
    for k in ('cd', 'hd', 'sd'):
        if area.get(k):
            ns = [str(int(x)) for x in area[k]]
            parts.append(NAMES[k] + ('s ' if len(ns) > 1 else ' ') + ', '.join(ns))
    return '; '.join(parts)


def main():
    src, out = sys.argv[1], sys.argv[2]
    data = json.load(open(src))
    groups = load_groups(sys.argv)
    check_groups(groups, data)

    salt = secrets.token_bytes(16)
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):            # never leave files from an earlier run behind
        if f.endswith('.json'):
            os.remove(os.path.join(out, f))

    for g in groups:
        area = g['area']
        bundle = dict(data)
        bundle['voters'] = [v for v in data['voters'] if in_area(v, area)]
        bundle['access'] = {'label': g['label'].strip(), 'area': area, 'desc': describe(area)}
        dk = hashlib.pbkdf2_hmac('sha256', norm_password(g['password']).encode('utf-8'), salt, ITERATIONS, dklen=48)
        key, file_id = dk[:32], dk[32:].hex()
        iv = secrets.token_bytes(12)
        ct = AESGCM(key).encrypt(iv, json.dumps(bundle, separators=(',', ':')).encode('utf-8'), AAD)
        with open(os.path.join(out, file_id + '.json'), 'w') as f:
            json.dump({'iv': b64(iv), 'ct': b64(ct)}, f)

    with open(os.path.join(out, 'index.json'), 'w') as f:
        json.dump({'v': 1, 'kdf': 'PBKDF2-SHA256', 'iter': ITERATIONS, 'salt': b64(salt), 'updated': data.get('updated')}, f)
    print(f'locked {len(groups)} access group file(s)')


if __name__ == '__main__':
    main()
