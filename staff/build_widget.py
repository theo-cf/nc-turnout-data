"""Build the staff cure tracker widget from staff/widget.src.js and staff/widget.css.

Usage:
    python staff/build_widget.py [<vault url>] [<output dir>]

Defaults: vault url https://theo-cf.github.io/nc-turnout-data/vault/, output dir docs/staff.
Writes nc-cure-staff.js (upload this to the carolinaforward.org post) and index.html (a standalone
page that loads the same widget). Neither file contains voter data or passwords.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SLUG = 'nc-cure-staff'
VAULT = sys.argv[1] if len(sys.argv) > 1 else 'https://theo-cf.github.io/nc-turnout-data/vault/'
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, '..', 'docs', 'staff')


def scope(css, root='.' + SLUG):
    """Prefix every selector with the widget class. '&' stands for the widget itself."""
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    out, i = [], 0

    def rules(block):
        res = []
        for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', block):
            sels = []
            for s in m.group(1).split(','):
                s = s.strip()
                sels.append(s.replace('&', root) if '&' in s else root + ' ' + s)
            res.append(','.join(sels) + '{' + m.group(2).strip() + '}')
        return res

    while i < len(css):
        at = css.find('@media', i)
        if at == -1:
            out += rules(css[i:])
            break
        out += rules(css[i:at])
        open_ = css.index('{', at)
        depth, j = 1, open_ + 1
        while depth:
            depth += {'{': 1, '}': -1}.get(css[j], 0)
            j += 1
        out.append(css[at:open_].strip() + '{' + ''.join(rules(css[open_ + 1:j - 1])) + '}')
        i = j
    return '\n'.join(out)


def ascii_js(s):
    # Non-ASCII characters have turned into mojibake on the site, so escape them all.
    return ''.join(c if ord(c) < 128 else '\\u%04x' % ord(c) for c in s)


src = open(os.path.join(HERE, 'widget.src.js'), encoding='utf-8').read()
css = scope(open(os.path.join(HERE, 'widget.css'), encoding='utf-8').read())
assert src.count("/*__CSS__*/''") == 1 and src.count("/*__VAULT__*/'vault/'") == 1
js = src.replace("/*__CSS__*/''", json.dumps(css)).replace("/*__VAULT__*/'vault/'", json.dumps(VAULT))
js = ascii_js(js)

os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, SLUG + '.js'), 'w', encoding='ascii') as f:
    f.write(js)
with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8') as f:
    f.write('''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="referrer" content="no-referrer">
<title>Cure Tracker</title>
<style>
body{margin:0;background:#fff;color:#1a1a1a;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif}
.mast{border-bottom:1px solid #d8d2c4}
.mast div{max-width:1040px;margin:0 auto;padding:14px 24px;font:700 22px "Zilla Slab",Georgia,serif;color:#253551}
main{max-width:1040px;margin:0 auto;padding:8px 24px 48px}
@media (max-width:700px){.mast div{padding:12px 16px}main{padding:4px 16px 40px}}
</style>
</head>
<body>
<div class="mast"><div>Carolina Forward</div></div>
<main><div class="nc-cure-staff"></div></main>
<script src="nc-cure-staff.js"></script>
</body>
</html>
''')
print(f'built {SLUG}.js ({len(js):,} bytes) and index.html in {os.path.normpath(OUT)}; vault: {VAULT}')
