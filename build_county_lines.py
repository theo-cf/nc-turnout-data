"""County borders in the precinct map's coordinate system (docs/precinct_counties.json), drawn over the statewide precinct
map so readers can find their county among 2,600 precincts.

Usage:
    python build_county_lines.py <SBE_PRECINCTS_YYYYMMDD.shp>

Uses the same shapefile, simplification and 8,000-unit-wide coordinate system as build_precinct_shapes.py (run both on
the same file). The borders are the precincts merged by county with mapshaper (`npm install -g mapshaper`).
Output: {"w": 8000, "h": <height>, "lines": "<SVG path of the borders between counties>", "edge": "<SVG path of the state's
outline>"}
"""
import json
import os
import subprocess
import sys
import tempfile

W = 8000


def rings(geom):
    if not geom:
        return []
    t = geom['type']
    if t == 'Polygon':
        return [geom['coordinates']]
    if t == 'MultiPolygon':
        return geom['coordinates']
    if t == 'LineString':
        return [[geom['coordinates']]]
    if t == 'MultiLineString':
        return [geom['coordinates']]
    return []


def main():
    shp = sys.argv[1]
    with tempfile.TemporaryDirectory() as tmp:
        base, inner, edge = (os.path.join(tmp, n) for n in ('p.json', 'inner.json', 'edge.json'))
        simp = ['mapshaper', shp, '-simplify', '8%', 'keep-shapes', 'planar', '-clean']
        subprocess.run(simp + ['-o', 'format=geojson', 'precision=1', base], check=True, capture_output=True)
        subprocess.run(simp + ['-dissolve', 'county_nam', '-innerlines', '-o', 'format=geojson', 'precision=1', inner], check=True, capture_output=True)
        subprocess.run(simp + ['-dissolve', '-lines', '-o', 'format=geojson', 'precision=1', edge], check=True, capture_output=True)
        G = json.load(open(base))
        xs, ys = [], []
        for f in G['features']:
            for poly in rings(f['geometry']):
                for ring in poly:
                    for x, y in ring:
                        xs.append(x); ys.append(y)
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        k = W / (x1 - x0)

        def path(fn, closed):
            d = []
            J = json.load(open(fn))
            geoms = [f['geometry'] for f in J['features']] if 'features' in J else J.get('geometries', [])
            for g in geoms:
                for part in rings(g):
                    for line in part:
                        pts = [f'{(x - x0) * k:.1f},{(y1 - y) * k:.1f}' for x, y in line]
                        if len(pts) > 1:
                            d.append('M' + 'L'.join(pts) + ('Z' if closed else ''))
            return ''.join(d)

        out = {'w': W, 'h': round((y1 - y0) * k, 1), 'lines': path(inner, False), 'edge': path(edge, False)}
    with open('docs/precinct_counties.json', 'w') as fh:
        json.dump(out, fh, separators=(',', ':'))
    print(f"docs/precinct_counties.json: {os.path.getsize('docs/precinct_counties.json') / 1e3:.0f} KB")


if __name__ == '__main__':
    main()
