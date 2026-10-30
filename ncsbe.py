"""State Board of Elections status lists and helpers shared by build_data.py and build_staff.py."""
import re

import pandas as pd

# Every return status the State Board documents, grouped.
ACCEPTED = {'ACCEPTED', 'ACCEPTED - EXCEPTION', 'ACCEPTED - CURED'}
NEEDS_CURE = {'PENDING CURE', 'PHOTO ID CURABLE', 'ID NOT PROVIDED', 'CONFLICT', 'VOTER SIGNATURE MISSING',
              'AFFIDAVIT INCOMPLETE', 'PHOTO ID NONCOMPLIANT', 'AFFIDAVIT REVIEW PENDING', 'PENDING'}
REJECTED = {'AFFIDAVIT DECLINED', 'ASSISTANT INFO INCOMPLETE', 'NOT PROPERLY NOTARIZED', 'NO TIME FOR CURE',
            'NO TIME FOR CURE - CONTACTED', 'NOT VOTED', 'REJECTED', 'RETURNED AFTER DEADLINE', 'RETURNED UNDELIVERABLE',
            'SIGNED BY OTHER', 'WITNESS INFO INCOMPLETE', 'WRONG VOTER', 'NO APPLICATION', 'E-TRANSMISSION FAILURE',
            'SDR - FAILED VERIFICATION'}   # same-day registrant whose address couldn't be verified: the ballot isn't counted
REPLACED = {'SPOILED - EV', 'SPOILED', 'CANCELLED', 'DUPLICATE'}
KNOWN = ACCEPTED | NEEDS_CURE | REJECTED | REPLACED
TYPES = {'MAIL': 'ml', 'ONE-STOP': 'ev', 'EARLY VOTING': 'ev'}   # the State Board labels in-person early votes "EARLY VOTING" (older files: "ONE-STOP")


def norm(x):
    if pd.isna(x):
        return x
    s = re.sub(r'\s*-\s*', ' - ', str(x).upper().strip())
    if not s:
        return float('nan')  # a blank status means nothing has been returned yet
    s = s.replace('E - TRANSMISSION', 'E-TRANSMISSION').replace('ONE - STOP', 'ONE-STOP')
    if s.startswith('NO TIME FOR CURE'):
        return 'NO TIME FOR CURE'
    return s


# Race and ethnicity as voters list them on their registration (both optional). Codes are the State Board's.
RACES = ['B', 'W', 'A', 'I', 'O', 'M', 'P', 'U']   # Black, White, Asian, American Indian, Other, two or more, Pacific Islander, undesignated
ETHS = ['HL', 'NL', 'UN']                          # Hispanic or Latino, not Hispanic or Latino, left blank
_RACE_WORDS = {'BLACK OR AFRICAN AMERICAN': 'B', 'WHITE': 'W', 'ASIAN': 'A', 'INDIAN AMERICAN OR ALASKA NATIVE': 'I',
               'AMERICAN INDIAN OR ALASKA NATIVE': 'I', 'OTHER': 'O', 'TWO OR MORE RACES': 'M', 'MULTI-RACIAL': 'M',
               'NATIVE HAWAIIAN OR PACIFIC ISLANDER': 'P'}


def race_code(x):
    """A State Board race label (absentee file) or code (registration file) as one of RACES."""
    s = str(x if not pd.isna(x) else '').strip().strip("'").upper()
    if s in RACES:
        return s
    return _RACE_WORDS.get(s, 'U')


def eth_code(x):
    s = str(x if not pd.isna(x) else '').strip().strip("'").upper()
    if s in ('HL', 'HISPANIC OR LATINO'):
        return 'HL'
    if s in ('NL', 'NOT HISPANIC OR NOT LATINO', 'NOT HISPANIC OR LATINO'):
        return 'NL'
    return 'UN'


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


# ---- voting-history groups for the tracker's "Whose unreliable voters are showing up?" pyramid ----
# Each voter falls in one group, by the three November general elections before the election year:
#   0 voted in all 3, 1 voted in 2 of 3, 2 voted in 1 of 3, 3 voted in 0 of 3,
#   4 new: hadn't voted in North Carolina by the first of the three (or the two before it), and either registered after it or
#     was too young to vote in it. New voters' later history is ignored, so the four other groups are people eligible for all three.
# Bits are those of build_history.py's lookup (2016 = 1, 2018 = 2, 2020 = 4, 2022 = 8, 2024 = 16; the extended lookup adds
# 2012 = 32, 2014 = 64). TIER_RULES[year] = (the three elections' bits, oldest first; the first one's date; bits of it and the two before).
TIER_RULES = {
    2026: ((4, 8, 16), 20201103, 4 | 2 | 1),
    2024: ((2, 4, 8), 20181106, 2 | 1 | 64),
    2022: ((1, 2, 4), 20161108, 1 | 64 | 32),
    2020: ((64, 1, 2), 20141104, 64 | 32),
    2018: ((32, 64, 1), 20121106, 32),
}
TIER_PARTIES = ['DEM', 'REP', 'UNA']


def history_tier(bits, reg_ymd, young, year):
    """Group (0-4, see above) for each voter. bits: lookup bits; reg_ymd: registration date as YYYYMMDD (0 if unknown);
    young: True where the voter was too young for the first of the three elections. All pandas Series on one index."""
    three, first_day, before = TIER_RULES[year]
    n3 = sum(((bits & b) > 0).astype(int) for b in three)
    new = ((bits & before) == 0) & ((reg_ymd > first_day) | young)
    return (3 - n3).where(~new, 4).astype(int)


def tier_counts(party, tier):
    """[DEM all 3, 2 of 3, 1 of 3, 0 of 3, new, REP ..., UNA ...]: 15 counts."""
    pi = party.map({p: i for i, p in enumerate(TIER_PARTIES)})
    cell = (pi * 5 + tier).dropna().astype(int)
    c = cell.value_counts()
    return [int(c.get(i, 0)) for i in range(15)]
