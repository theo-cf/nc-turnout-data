# NCSBE source files

This branch (`ncsbe-source-files`) holds copies of the raw files we downloaded from the NC State Board of Elections (NCSBE) to build the Turnout Tracker, saved here so they don't have to be tracked down again. It's kept separate from the tracker's code on `main`, so the tracker's automatic updates never have to download these files. Nothing in these files has been changed. Only the file names are ours; each name says what the file is and what date it covers. The State Board's original file name is in parentheses below.

Most of these files are public records that list individual voters (name, address, party, voting history). The State Board publishes them openly at https://www.ncsbe.gov/results-data.

## Files split into parts

GitHub won't store a single file over 100 MB, so bigger files are split into numbered parts (`.part00`, `.part01`, …). To put one back together, download all its parts into one folder and join them in order:

- Mac or Linux (Terminal): `cat ncsbe_absentee_2020-11-03_general.zip.part* > ncsbe_absentee_2020-11-03_general.zip`
- Windows (Command Prompt): `copy /b ncsbe_absentee_2020-11-03_general.zip.part00 + ncsbe_absentee_2020-11-03_general.zip.part01 + ncsbe_absentee_2020-11-03_general.zip.part02 ncsbe_absentee_2020-11-03_general.zip`

The joined file is the original zip and opens normally.

## What each file is

### Absentee and early voting files

One row per ballot request or early vote, for one election.

- `ncsbe_absentee_2006-11-07_general.zip`, `…2010-11-02…`, `…2014-11-04…`, `…2018-11-06…`, `…2022-11-08…`, `…2024-11-05…`: final absentee and early voting files for those November general elections (`absentee_YYYYMMDD.csv`/`.txt`).
- `ncsbe_absentee_2018-11-06_general_with_ethnicity.zip`: the 2018 file with an ethnicity column, released by the State Board in 2020. The tracker uses this one for 2018.
- `ncsbe_absentee_2020-11-03_general.zip`: the 2020 file (`absentee_20201103.csv`), zipped by us because we only had the unzipped copy.
- `ncsbe_absentee_2026-11-03_general_daily_file_as_of_2026-10-17.zip` (and 10-18, 10-19): copies of the 2026 file as it stood on those mornings. The State Board replaces this file every day, so older days can't be downloaded again.

### Voter registration snapshots

Every registered voter, as of Election Day that year. *Not copied here:* each is 1 to 1.5 GB, and the State Board keeps them at stable links:
- 2018: https://s3.amazonaws.com/dl.ncsbe.gov/data/Snapshots/VR_Snapshot_20181106.zip
- 2020: https://s3.amazonaws.com/dl.ncsbe.gov/data/Snapshots/VR_Snapshot_20201103.zip
- 2022: https://s3.amazonaws.com/dl.ncsbe.gov/data/Snapshots/VR_Snapshot_20221108.zip
- 2024: https://s3.amazonaws.com/dl.ncsbe.gov/data/Snapshots/VR_Snapshot_20241105.zip

### Voter history

One row per voter per election they voted in.
- `ncsbe_voter_history_statewide_as_of_2022-11-05_internet_archive_copy.zip`: the statewide history file as published in early November 2022, recovered from the Internet Archive (a capture from Nov. 8, 2022). It reaches back to 2012, which the State Board's current file no longer does, so it's how the tracker gets 2012 and 2014 voting history for the 2018 and 2020 comparisons (`ncvhis_Statewide.zip`).
- `ncsbe_voter_history_statewide_as_of_2026-10-11.zip`: the current statewide history file, downloaded Oct. 2026 (`ncvhis_Statewide.zip`).

### Summary counts

Registered voters and voters, by county, precinct, party, race, sex and age. No individual voters.
- `ncsbe_voter_stats_YYYY-MM-DD.zip` and `ncsbe_history_stats_YYYY-MM-DD.zip` for 2018, 2020, 2022 and 2024 (`voter_stats_YYYYMMDD.zip`, `history_stats_YYYYMMDD.zip`).

### Other


- `ncsbe_precinct_results_2022-11-08_general.zip`: 2022 general election results by precinct (`results_pct_20221108.txt`).
- `ncsbe_precinct_shapefiles_2024-07-23.zip`: precinct boundary shapefiles dated July 23, 2024 (`SBE_PRECINCTS_20240723`). The tracker's district map shapes are built from these.
- `ncsbe_candidate_listing_2026.csv`: the 2026 candidate list (`Candidate_Listing_2026.csv`), used for the legislative races page.

Files over 100 MB above are the split ones: the 2020, 2022 and 2024 absentee files and both voter history files.

`SHA256SUMS.txt` lists a checksum for each whole file (after joining any parts), if you ever need to confirm a copy is intact.
