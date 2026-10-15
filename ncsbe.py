"""State Board of Elections status lists and helpers shared by build_data.py and build_staff.py."""
import re

import pandas as pd

# Every return status the State Board documents, grouped.
ACCEPTED = {'ACCEPTED', 'ACCEPTED - EXCEPTION', 'ACCEPTED - CURED'}
NEEDS_CURE = {'PENDING CURE', 'PHOTO ID CURABLE', 'ID NOT PROVIDED', 'CONFLICT', 'VOTER SIGNATURE MISSING',
              'AFFIDAVIT INCOMPLETE', 'PHOTO ID NONCOMPLIANT', 'AFFIDAVIT REVIEW PENDING', 'PENDING'}
REJECTED = {'AFFIDAVIT DECLINED', 'ASSISTANT INFO INCOMPLETE', 'NOT PROPERLY NOTARIZED', 'NO TIME FOR CURE',
            'NOT VOTED', 'REJECTED', 'RETURNED AFTER DEADLINE', 'RETURNED UNDELIVERABLE', 'SIGNED BY OTHER',
            'WITNESS INFO INCOMPLETE', 'WRONG VOTER', 'NO APPLICATION', 'E-TRANSMISSION FAILURE'}
REPLACED = {'SPOILED - EV', 'SPOILED', 'CANCELLED', 'DUPLICATE'}
KNOWN = ACCEPTED | NEEDS_CURE | REJECTED | REPLACED
TYPES = {'MAIL': 'ml', 'ONE-STOP': 'ev', 'EARLY VOTING': 'ev'}   # the State Board labels in-person early votes "EARLY VOTING" (older files: "ONE-STOP")


def norm(x):
    if pd.isna(x):
        return x
    s = re.sub(r'\s*-\s*', ' - ', str(x).upper().strip())
    if not s:
        return float('nan')   # a blank status means nothing has been returned yet
    return s.replace('E - TRANSMISSION', 'E-TRANSMISSION').replace('ONE - STOP', 'ONE-STOP')


def num(x):
    m = re.search(r'(\d+)$', str(x))
    return int(m.group(1)) if m else 0


# All 100 North Carolina counties, and the number of districts in each plan, so access groups can
# name a place before any ballot from it shows up in the State Board file.
NC_COUNTIES = [
    'Alamance', 'Alexander', 'Alleghany', 'Anson', 'Ashe', 'Avery', 'Beaufort', 'Bertie', 'Bladen', 'Brunswick',
    'Buncombe', 'Burke', 'Cabarrus', 'Caldwell', 'Camden', 'Carteret', 'Caswell', 'Catawba', 'Chatham', 'Cherokee',
    'Chowan', 'Clay', 'Cleveland', 'Columbus', 'Craven', 'Cumberland', 'Currituck', 'Dare', 'Davidson', 'Davie',
    'Duplin', 'Durham', 'Edgecombe', 'Forsyth', 'Franklin', 'Gaston', 'Gates', 'Graham', 'Granville', 'Greene',
    'Guilford', 'Halifax', 'Harnett', 'Haywood', 'Henderson', 'Hertford', 'Hoke', 'Hyde', 'Iredell', 'Jackson',
    'Johnston', 'Jones', 'Lee', 'Lenoir', 'Lincoln', 'Macon', 'Madison', 'Martin', 'McDowell', 'Mecklenburg',
    'Mitchell', 'Montgomery', 'Moore', 'Nash', 'New Hanover', 'Northampton', 'Onslow', 'Orange', 'Pamlico', 'Pasquotank',
    'Pender', 'Perquimans', 'Person', 'Pitt', 'Polk', 'Randolph', 'Richmond', 'Robeson', 'Rockingham', 'Rowan',
    'Rutherford', 'Sampson', 'Scotland', 'Stanly', 'Stokes', 'Surry', 'Swain', 'Transylvania', 'Tyrrell', 'Union',
    'Vance', 'Wake', 'Warren', 'Washington', 'Watauga', 'Wayne', 'Wilkes', 'Wilson', 'Yadkin', 'Yancey',
]
DISTRICTS = {'cd': 14, 'hd': 120, 'sd': 50}
COUNTY_NAME = {c.upper(): c for c in NC_COUNTIES}   # 'MCDOWELL' -> 'McDowell'
