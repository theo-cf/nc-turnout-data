"""Precinct outlines for the tracker's precinct map layer: docs/precincts/<County>.json, one file per county.

Usage:
    python build_precinct_shapes.py <SBE_PRECINCTS_YYYYMMDD.shp>

Use the newest file at https://s3.amazonaws.com/dl.ncsbe.gov/ShapeFiles/Precinct/ (the current files were built from
SBE_PRECINCTS_20260824). Counties redraw precincts between elections, so rebuild when a new file comes out.

Reads the State Board's precinct shapefile (NC State Plane, feet), simplifies it with mapshaper (installed with
`npm install -g mapshaper`), and writes each county's precincts as SVG paths in one statewide coordinate system 8,000 units
wide, so precincts from neighboring counties line up when a district spans several counties. Each file:
    {"p": {"<precinct code>": "<SVG path>"}, "n": {"<code>": "<precinct name>"}, "b": {"<code>": [x0, y0, x1, y1]}}
Precinct codes are the State Board's (precinct_abbrv in the voter file, prec_id in the shapefile).
"""
import json
import os
import subprocess
import sys
import tempfile

W = 8000   # width of the statewide coordinate system


def main():
    shp = sys.argv[1]
    with tempfile.TemporaryDirectory() as tmp:
        out = os.path.join(tmp, 'p.json')
        subprocess.run(['mapshaper', shp, '-simplify', '8%', 'keep-shapes', 'planar', '-clean', '-o', 'format=geojson', 'precision=1', out], check=True)
        G = json.load(open(out))
    xs, ys = [], []

    def rings(geom):
        if geom['type'] == 'Polygon':
            return [geom['coordinates']]
        return geom['coordinates'] if geom['type'] == 'MultiPolygon' else []

    for f in G['features']:
        for poly in rings(f['geometry']):
            for ring in poly:
                for x, y in ring:
                    xs.append(x); ys.append(y)
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    k = W / (x1 - x0)
    by = {}
    for f in G['features']:
        a = f['properties']; county = a['county_nam'].strip().title().replace('Mcdowell', 'McDowell'); code = a['prec_id'].strip()
        d, bx = [], [1e9, 1e9, -1e9, -1e9]
        for poly in rings(f['geometry']):
            for ring in poly:
                pts = [((x - x0) * k, (y1 - y) * k) for x, y in ring]
                for px, py in pts:
                    bx = [min(bx[0], px), min(bx[1], py), max(bx[2], px), max(bx[3], py)]
                d.append('M' + 'L'.join(f'{px:.1f},{py:.1f}' for px, py in pts) + 'Z')
        if not d:
            continue
        c = by.setdefault(county, {'p': {}, 'n': {}, 'b': {}})
        c['p'][code] = ''.join(d); c['n'][code] = a['enr_desc'].strip(); c['b'][code] = [round(v, 1) for v in bx]
    os.makedirs('docs/precincts', exist_ok=True)
    total = 0
    for county, c in by.items():
        with open(f'docs/precincts/{county}.json', 'w') as fh:
            json.dump(c, fh, separators=(',', ':'))
        total += os.path.getsize(f'docs/precincts/{county}.json')
    print(f'{sum(len(c["p"]) for c in by.values())} precincts in {len(by)} counties; {total / 1e6:.1f} MB in all, '
          f'largest {max(os.path.getsize(f"docs/precincts/{c}.json") for c in by) / 1e3:.0f} KB')


if __name__ == '__main__':
    main()
