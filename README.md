# NC Turnout Data

Daily turnout figures for North Carolina's November 3, 2026 general election, built from public State Board of Elections data. This repository powers the **Turnout Tracker** on [carolinaforward.org](https://carolinaforward.org).

Maintained by Carolina Forward.

## What it publishes

A single data file, `docs/data.json`, served at:

```
https://theo-cf.github.io/nc-turnout-data/data.json
```

It contains **totals only**: statewide, by county, by congressional district, by NC House district and by NC Senate district. Each place includes:

- votes cast, split into early in-person and by mail
- votes cast each day
- votes cast by the voters' party registration (Democratic, Republican, Unaffiliated, other parties)

**No voter-level information is ever stored or published here.**

## Where the data comes from

The [NC State Board of Elections absentee data](https://www.ncsbe.gov/results-data/absentee-data) statewide file for the 2026 general election, which the State Board updates daily. In North Carolina, early in-person voting ("one-stop") and mail voting are both recorded in this file.

## How votes are counted

- **Votes cast** = ballots the State Board lists as accepted: early in-person ballots and mail ballots (including mail ballots accepted with a photo ID exception form or after the voter fixed a problem).
- **One vote per voter.** If a voter has more than one record — for example, a mail ballot that was replaced because the voter voted early in person instead — they are counted once.
- **Mail ballots still waiting on a fix are not counted** until the State Board marks them accepted. Totals never include ballots that might not count.
- **Not counted:** rejected ballots, and mail ballots replaced because the voter voted another way.
- **Daily figures** place each vote on the day it was cast (early voting) or received by the county board (mail). When a mail ballot is accepted after a fix, it is added on the day it was received, so recent days can rise slightly after first being published.
- **Party** is the voter's current registration. Registration is not a vote choice; unaffiliated voters can vote for any candidate.
- **Election Day votes are not included.** The State Board's absentee file covers early in-person and mail voting only.

## How it updates

A scheduled GitHub Actions workflow checks for a new State Board file three times a day, at 5:37 a.m., 12:17 p.m. and 5:17 p.m. Eastern. If the file hasn't changed since the last check, nothing is updated. Each run:

1. downloads the State Board's statewide absentee file
2. checks it before publishing — the run stops, and the previous day's data stays up, if the file is missing or malformed, if it contains a ballot status or ballot type the script doesn't recognize, or if totals drop sharply from the day before
3. builds and publishes `docs/data.json`, including the time the State Board posted the file
4. saves a dated copy of the totals in `docs/archive/`

## Files

| Path | What it is |
|---|---|
| `build_data.py` | Reads the State Board file and computes the totals |
| `.github/workflows/update.yml` | The daily schedule |
| `docs/data.json` | Latest published totals |
| `docs/archive/` | One file of totals per day |

## Questions or corrections

Contact Theo Nollert at Carolina Forward at [theo@carolinaforward.org](mailto:theo@carolinaforward.org), or the team at [hello@carolinaforward.org](mailto:hello@carolinaforward.org).
