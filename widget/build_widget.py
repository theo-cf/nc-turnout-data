import sys, json
tpl, data, url, out = sys.argv[1:5]; base = sys.argv[5] if len(sys.argv) > 5 else None
t = open(tpl).read(); d = open(data).read()
t = t.replace('/*__URL__*/null', json.dumps(url) if url != '-' else 'null').replace('/*__DATA__*/null', d.replace('</', '<\\/'))
if base: t = t.replace('/*__BASE__*/null', open(base).read().replace('</', '<\\/'))
import os
if os.environ.get('XT'): t = t.replace('/*__XT__*/null', open(os.environ['XT']).read())
if os.environ.get('XT18'): t = t.replace('/*__XT18__*/null', open(os.environ['XT18']).read())
if os.environ.get('XT20'): t = t.replace('/*__XT20__*/null', open(os.environ['XT20']).read())
if os.environ.get('XT24'): t = t.replace('/*__XT24__*/null', open(os.environ['XT24']).read())
if os.environ.get('DMAP'): t = t.replace('/*__DMAP__*/null', open(os.environ['DMAP']).read())
if os.environ.get('XTD'): t = t.replace('/*__XTD__*/{}', '{' + ','.join('%s:%s' % (y, open(os.environ['XTD'] % y).read()) for y in (2018, 2020, 2022, 2024)) + '}')
if os.environ.get('PNAMES'): t = t.replace('/*__PNAMES__*/null', open(os.environ['PNAMES']).read())
if os.environ.get('BASED'): t = t.replace('/*__BASED__*/null', open(os.environ['BASED']).read())
open(out, 'w').write(''.join(c if ord(c) < 128 else '\\u%04x' % ord(c) for c in t))
t2 = open(out).read()
if os.environ.get('PCT'):
    t2 = t2.replace('/*__PCT__*/null', open(os.environ['PCT']).read())
    t2 = t2.replace('/*__PSH__*/{}', '{' + ','.join('%s:%s' % (json.dumps(c), open('/home/claude/nc-turnout-data/docs/precincts/%s.json' % c).read()) for c in os.environ['PSH'].split(',')) + '}')
    open(out, 'w').write(''.join(c if ord(c) < 128 else '\\u%04x' % ord(c) for c in t2))
if os.environ.get('PBASE'):
    t3 = open(out).read()
    items = []
    for y in os.environ['PBASE'].split(','):
        for c in os.environ['PSH'].split(','):
            f = '/home/claude/nc-turnout-data/docs/pct_base/%s/%s.json' % (y, c)
            if os.path.exists(f): items.append('%s:%s' % (json.dumps(y + '|' + c), open(f).read()))
    t3 = t3.replace('/*__PBASE__*/{}', '{' + ','.join(items) + '}')
    open(out, 'w').write(t3)
if os.environ.get('PIECEDIR'):
    import glob
    t4 = open(out).read()
    pd_, ps_ = os.environ['PIECEDIR'], '/home/claude/nc-turnout-data/docs/piece_shapes'
    items, shp = [], []
    for f in glob.glob(pd_ + '/*/*.json'):
        g = f.split('/')[-2]; n = os.path.basename(f)[:-5]
        items.append('%s:%s' % (json.dumps(g + '|' + n), open(f).read()))
        sf = '%s/%s/%s.json' % (ps_, g, n)
        if os.path.exists(sf): shp.append('%s:%s' % (json.dumps(g + '|' + n), open(sf).read()))
    t4 = t4.replace('/*__PIECES__*/{}', '{' + ','.join(items) + '}').replace('/*__PSHAPES__*/{}', '{' + ','.join(shp) + '}')
    if os.environ.get('PCTDAYS'):
        t4 = t4.replace('/*__PCTDAYS__*/null', open(os.environ['PCTDAYS']).read())
    open(out, 'w').write(t4)
