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
TYPES = {'MAIL': 'ml', 'ONE-STOP': 'ev'}


def norm(x):
    if pd.isna(x):
        return x
    s = re.sub(r'\s*-\s*', ' - ', str(x).upper().strip())
    return s.replace('E - TRANSMISSION', 'E-TRANSMISSION').replace('ONE - STOP', 'ONE-STOP')


def num(x):
    m = re.search(r'(\d+)$', str(x))
    return int(m.group(1)) if m else 0
