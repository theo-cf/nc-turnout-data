"""Outlines of the pieces where a county and a district, or two kinds of district, overlap, for the tracker's maps when a place
is picked (docs/piece_shapes/<county|cd|hd|sd>/<name>.json).

Usage:
    python build_piece_shapes.py <SBE_PRECINCTS_YYYYMMDD.shp> <pct.json>

Built from the State Board's precinct shapefile (the same file as build_precinct_shapes.py) and each precinct's districts from
the tracker's pct.json (where most of the precinct's registered voters are; build_history.py --pool): precincts are merged
("dissolved") into pieces with mapshaper (`npm install -g mapshaper`), so a precinct split between two districts is drawn on
the side where most of its voters live. Coordinates are the same statewide system, 8,000 units wide, as docs/precincts/.
Each place's file: {"<other layer>": {"<other place>": {"d": "<SVG path>", "b": [x0, y0, x1, y1]}}}
"""
import csv
import json
import os
import shutil
import subprocess
import sys
import tempfile

from ncsbe import COUNTY_NAME

W = 8000
PAIRS = (('county', 'cd'), ('county', 'hd'), ('county', 'sd'), ('cd', 'hd'), ('cd', 'sd'), ('hd', 'sd'))


def rings(geom):
    if not geom:
        return []
    if geom['type'] == 'Polygon':
        return [geom['coordinates']]
    return geom['coordinates'] if geom['type'] == 'MultiPolygon' else []


def main():
    shp, pctf = sys.argv[1:3]
    P = json.load(open(pctf))
    with tempfile.TemporaryDirectory() as tmp:
        tab = os.path.join(tmp, 'd.csv')
        with open(tab, 'w', newline='') as f:
            w = csv.writer(f)
            w.writerow(['ckey', 'county', 'cd', 'hd', 'sd'])
            for c, ps in P['reg'].items():
                for code, v in ps.items():
                    d = v[7] or [None, None, None]
                    w.writerow([c.upper() + '|' + code, c] + ['' if x is None else str(x) for x in d])
        # the whole state once, for the coordinate system
        full = os.path.join(tmp, 'all.json')
        subprocess.run(['mapshaper', shp, '-simplify', '8%', 'keep-shapes', 'planar', '-o', 'format=geojson', 'precision=1', full], check=True)
        xs, ys = [], []
        for ft in json.load(open(full))['features']:
            for poly in rings(ft['geometry']):
                for ring in poly:
                    for x, y in ring:
                        xs.append(x); ys.append(y)
        x0, x1, y1 = min(xs), max(xs), max(ys)
        k = W / (x1 - x0)
        files = {}
        for k1, k2 in PAIRS:
            out = os.path.join(tmp, f'{k1}_{k2}.json')
            subprocess.run(['mapshaper', shp, '-each', "ckey=county_nam.trim().toUpperCase() + '|' + prec_id.trim()",
                            '-join', tab, 'keys=ckey,ckey', 'string-fields=ckey,county,cd,hd,sd',
                            '-filter', f"!!{k1} && !!{k2}", '-dissolve', f'{k1},{k2}', '-simplify', '6%', 'keep-shapes', 'planar', '-clean',
                            '-o', 'format=geojson', 'precision=1', out], check=True, capture_output=True)
            G = json.load(open(out))
            for ft in G['features']:
                a = ft['properties']
                n1, n2 = str(a[k1]), str(a[k2])
                d, bx = [], [1e9, 1e9, -1e9, -1e9]
                for poly in rings(ft['geometry']):
                    for ring in poly:
                        pts = [((x - x0) * k, (y1 - y) * k) for x, y in ring]
                        for px, py in pts:
                            bx = [min(bx[0], px), min(bx[1], py), max(bx[2], px), max(bx[3], py)]
                        d.append('M' + 'L'.join(f'{px:.1f},{py:.1f}' for px, py in pts) + 'Z')
                if not d:
                    continue
                piece = {'d': ''.join(d), 'b': [round(v, 1) for v in bx]}
                files.setdefault((k1, n1), {}).setdefault(k2, {})[n2] = piece
                files.setdefault((k2, n2), {}).setdefault(k1, {})[n1] = piece
            print(f'{k1}|{k2}: {len(G["features"])} pieces', flush=True)
    root = os.path.join('docs', 'piece_shapes')
    shutil.rmtree(root, ignore_errors=True)
    total = 0
    for (kind, n), inner in files.items():
        os.makedirs(os.path.join(root, kind), exist_ok=True)
        fn = os.path.join(root, kind, n + '.json')
        with open(fn, 'w') as f:
            json.dump(inner, f, separators=(',', ':'))
        total += os.path.getsize(fn)
    print(f'{len(files)} place files, {total / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
