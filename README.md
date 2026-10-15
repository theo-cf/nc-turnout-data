# NC Turnout Data

Turnout figures for North Carolina's November 3, 2026 general election, built from public State Board of Elections data. This repository powers the **Turnout Tracker** on [carolinaforward.org](https://carolinaforward.org).

Maintained by Carolina Forward.

## What it publishes

A single data file, `docs/data.json`, served at:

```
https://theo-cf.github.io/nc-turnout-data/data.json
```

It contains **totals only**: statewide, by county, by congressional district, by NC House district and by NC Senate district. Each place includes:

- votes cast, split into early in-person, by mail and (from election night) on Election Day
- early and mail votes cast each day
- votes cast by the voters' party registration (Democratic, Republican, Unaffiliated, other parties)
- votes cast by age group (18–29, 30–44, 45–64, 65 and older)

It also includes:

- **early voting sites:** early in-person votes at each site, by day, with party and age
- **turnout by precinct, from Election Day on:** votes cast in each precinct, with small precincts combined (see below)

**No voter-level information is stored in this repository.**

## Where the data comes from

- **Early and mail votes:** the [NC State Board of Elections absentee data](https://www.ncsbe.gov/results-data/absentee-data) statewide file for the 2026 general election, which the State Board updates daily. Early in-person voting and mail voting are both recorded in this file.
- **Election Day votes:** the State Board's precinct results file, posted on election night and updated through the county canvass.
- **Final turnout:** the State Board's [voter history](https://www.ncsbe.gov/results-data/voter-history-data) and [voter registration](https://www.ncsbe.gov/results-data/voter-registration-data) files, once counties have finished loading Election Day voter history, usually a few weeks after the election.
- **Precinct names:** precinct codes are matched to names and districts using the State Board's voter registration files (`precincts.csv`).

## How votes are counted

- **Votes cast** = ballots the State Board lists as accepted: early in-person ballots and mail ballots (including mail ballots accepted with a photo ID exception form or after the voter fixed a problem).
- **One vote per voter.** If a voter has more than one record — for example, a mail ballot that was replaced because the voter voted early in person instead — they are counted once.
- **Mail ballots still waiting on a fix are not counted** until the State Board marks them accepted. Totals never include ballots that might not count.
- **Not counted:** rejected ballots, and mail ballots replaced because the voter voted another way.
- **Daily figures** place each vote on the day it was cast (early voting) or received by the county board (mail). When a mail ballot is accepted after a fix, it is added on the day it was received, so recent days can rise slightly after first being published.
- **Party** is the voter's current registration. Registration is not a vote choice; unaffiliated voters can vote for any candidate.
- **Age** is as listed in the State Board file.
- **Early voting sites** count early in-person ballots at the site where they were cast. A site's party and age breakdown is shown once it has 25 early votes.
- **Election Day votes** (from election night until final turnout) are the Election Day and provisional ballots cast in the U.S. Senate race, which nearly every voter marks. The results file has no "ballots cast" line, so this can run slightly below the true number of voters; it never runs above it. These numbers are unofficial until results are certified. Party and age for Election Day voters aren't available until final turnout.
- **Districts on election night:** a precinct's Election Day votes are counted in the district where most of its registered voters live. A few precincts are split between districts, so district figures can be slightly off until final turnout.
- **Precincts:** votes are counted in the voter's home precinct, not where they voted early. To protect voter privacy, precincts with fewer than 10 votes are combined into one line, and a county never has exactly one combined precinct, so no small precinct can be worked out by subtracting the others from the county total. Precinct figures are not published before Election Day.
- **Final turnout** counts every voter in the State Board's voter history once, as early in person, by mail or on Election Day (including curbside, provisional and transfer votes), with the party they were registered with when they voted and their age from the registration file. It replaces the election-night figures.

## How it updates

A scheduled GitHub Actions workflow checks for new State Board files:

| When | How often |
|---|---|
| Through Nov. 13 (county canvass) | Three times a day: 5:37 a.m., 12:17 p.m. and 5:17 p.m. Eastern |
| Election night, 7 p.m. Nov. 3 to 4:40 a.m. Nov. 4 | Every 20 minutes |
| Nov. 14–24 (state certification) | Once a day, 5:37 a.m. |
| After Nov. 24 | No scheduled updates |

If the files haven't changed since the last check, nothing is updated. Each run:

1. downloads the State Board's statewide absentee file and, once it exists, the precinct results file
2. checks them before publishing — the run stops, and the previous data stays up, if a file is missing or malformed, if it contains a ballot status or ballot type the script doesn't recognize, or if totals drop sharply from the last update
3. builds and publishes `docs/data.json`, including the time the State Board posted the files
4. saves a dated copy of the totals in `docs/archive/`

**Final turnout** is published once, by hand, with the "Publish final turnout (voter history)" workflow. After that, scheduled updates no longer change the data.

## Files

| Path | What it is |
|---|---|
| `build_data.py` | Reads the State Board files and computes the totals |
| `election_day.py` | Election Day votes and turnout by precinct |
| `final_data.py` | Final turnout from voter history |
| `precincts.csv`, `refresh_precincts.py` | Precinct code-to-name lookup, and the script that rebuilds it |
| `ncsbe.py` | State Board status lists, county names and district counts |
| `.github/workflows/update.yml` | The update schedule |
| `.github/workflows/final.yml` | One-time final turnout |
| `docs/data.json` | Latest published totals |
| `docs/archive/` | One file of totals per day |
| `tests/` | Checks for the small-precinct privacy rule |

## Questions or corrections

Contact Theo Nollert at Carolina Forward at [theo@carolinaforward.org](mailto:theo@carolinaforward.org), or the team at [hello@carolinaforward.org](mailto:hello@carolinaforward.org).
