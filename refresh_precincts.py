"""Rebuild precincts.csv, the lookup from State Board precinct codes to precinct names and districts.

Election-night results identify precincts by code ("CB1"); the absentee file uses names ("CARRBORO").
This reads the State Board's 100 county voter registration files and keeps only one row per precinct:
county, code, name, and the congressional, NC House and NC Senate district most of its voters are in.
No voter-level information is kept.

Usage: python refresh_precincts.py   (downloads about 500 MB, one county at a time)
"""
import io
import urllib.request
import zipfile

import pandas as pd

URL = 'https://s3.amazonaws.com/dl.ncsbe.gov/data/ncvoter{}.zip'
COLS = ['county_desc', 'precinct_abbrv', 'precinct_desc', 'cong_dist_abbrv', 'nc_house_abbrv', 'nc_senate_abbrv']
rows = []
for i in range(1, 101):
    with zipfile.ZipFile(io.BytesIO(urllib.request.urlopen(URL.format(i)).read())) as zf:
        d = pd.read_csv(zf.open(zf.namelist()[0]), sep='\t', dtype=str, encoding='latin-1', usecols=COLS, keep_default_na=False)
    d = d[(d.precinct_abbrv != '') & (d.precinct_desc != '')]
    g = d.groupby(['county_desc', 'precinct_abbrv', 'precinct_desc']).agg(
        cd=('cong_dist_abbrv', lambda s: s.mode().iat[0]), hd=('nc_house_abbrv', lambda s: s.mode().iat[0]),
        sd=('nc_senate_abbrv', lambda s: s.mode().iat[0])).reset_index()
    rows.append(g)
    print(f'county {i}: {len(g)} precincts')
out = pd.concat(rows).rename(columns={'county_desc': 'county', 'precinct_abbrv': 'code', 'precinct_desc': 'name'})
out.to_csv('precincts.csv', index=False)
print(f'{len(out)} precincts written')
