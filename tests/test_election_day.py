"""Checks for the small-precinct privacy rule. Run: python tests/test_election_day.py"""
import os
import sys

import pandas as pd

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from election_day import PRECINCT_MIN, precinct_tables, tidy  # noqa: E402

lookup = pd.DataFrame({'county': ['X'] * 4, 'code': ['A', 'B', 'C', 'D'], 'name': ['BIG ONE', 'BIG TWO', 'TINY', 'MID'],
                       'cd': ['1'] * 4, 'hd': ['1'] * 4, 'sd': ['1'] * 4})


def acc_for(counts):
    rows = []
    for name, ev, ml in counts:
        rows += [{'county_desc': 'X', 'precinct_desc': name, 'kind': 'ev'}] * ev + [{'county_desc': 'X', 'precinct_desc': name, 'kind': 'ml'}] * ml
    return pd.DataFrame(rows)


ed = pd.DataFrame({'county': ['X'] * 4, 'code': ['A', 'B', 'C', 'D'], 'real': ['Y'] * 4, 'ed': [50, 40, 2, 20]})

# One precinct under the minimum: it must not be hidden alone, so the next smallest is folded in with it.
t = precinct_tables(acc_for([('BIG ONE', 30, 5), ('BIG TWO', 20, 5), ('TINY', 1, 0), ('MID', 5, 0)]), ed, lookup)['X']
assert t['small'][0] == 2 and len(t['small']) == 5, t
assert sum(r[1] + r[2] + r[3] for r in t['rows']) + sum(t['small'][1:]) == 30 + 5 + 20 + 5 + 1 + 5 + 50 + 40 + 2 + 20
assert all(r[1] + r[2] + r[3] >= PRECINCT_MIN for r in t['rows'])

# No precinct under the minimum: nothing is combined.
t = precinct_tables(acc_for([('BIG ONE', 30, 5), ('BIG TWO', 20, 5), ('TINY', 9, 0), ('MID', 5, 0)]), ed, lookup)['X']
assert t['small'] is None, t

# Truncated name in the absentee file still matches its precinct.
lk = lookup.copy()
lk.loc[2, 'name'] = 'TINY PRECINCT WITH A VERY LONG NAME'
t = precinct_tables(acc_for([('TINY PRECINCT WITH A VERY', 12, 0)]), None, lk)['X']
assert t['rows'][0][0] == 'Tiny Precinct With a Very Long Name', t

assert tidy('MCDOWELL TECH COMMUNITY COLLEGE') == 'McDowell Tech Community College'
assert tidy('PRECINCT 01-49') == 'Precinct 01-49'
assert tidy('PCT 012') == 'PCT 012'
print('all checks passed')
