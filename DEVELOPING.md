# NC Turnout Tracker: handoff for the next session

Written Oct. 28, 2026. The widget source, build script, tests and run helpers are in this repo (see "Where the code lives"). Read this file before changing anything.

**Your first steps in a new session**
1. Read this file.
2. Run `widget/build.sh` and then `node widget/test/smoke.mjs`. Both should pass before you touch anything.
3. Then start on the two projects at the end of this file.

---

## What exists

| Piece | Where | Notes |
|---|---|---|
| Public tracker widget | `turnout_story_template.js` → built to `nc-turnout-tracker.js` | Uploaded by Theo through Decap CMS ("Custom Widget Script") to carolinaforward.org/news/the-carolina-forward-turnout-tracker/ |
| Data pipeline | GitHub repo `theo-cf/nc-turnout-data` | Publishes to https://theo-cf.github.io/nc-turnout-data/ (GitHub Pages, deployed from Actions) |
| District lean widget | `district_lean_template.js` → `nc-district-lean.js` | Separate CF post; preview artifact https://claude.ai/artifact/5bGyP3XeBtxcgnGRoBGHVi |
| Staff mail ballot cure tracker | `staff/` in the repo, published to the Pages vault | Encrypted; never put voter-level data anywhere else |

### Where the code lives

- `widget/turnout_story_template.js`: tracker source (~410 KB, one IIFE). Placeholders like `/*__URL__*/null` are filled at build time. **Edit this, never the built file.**
- `widget/district_lean_template.js`: lean widget source.
- `widget/build.sh`: builds both into `widget/out/` (git-ignored). `widget/build.sh local` points the tracker at the local test server instead of Pages.
- `widget/build_widget.py`: the placeholder filler that `build.sh` calls.
- `widget/test/serve.py`: local test data server on 127.0.0.1:8123. It serves files from a folder you pass it and proxies anything missing to the live Pages site, so you can test with edited data.
- `widget/test/smoke.mjs`: loads the built tracker at 900px and 390px on several places and reports page errors, horizontal overflow and missing sections. It saves full-page screenshots to `widget/test/shots/`; look at them.
- `tools/runs.sh`: `status`, `push` (refuses while an update is running), `dispatch` and `wait`.

After building, Theo uploads `widget/out/nc-turnout-tracker.js` (or `nc-district-lean.js`) in Decap himself. Send him the file.

---

## Building and testing

```
widget/build.sh                       # production build: live data from Pages
node widget/test/smoke.mjs            # or: node widget/test/smoke.mjs widget/out/nc-turnout-tracker.js state county:Wake cd:1

# testing against data you've edited
python3 widget/test/serve.py <folder with data.json etc.> &
widget/build.sh local && node widget/test/smoke.mjs
```

Routes are hash links: `#nc-turnout=state`, `county:Wake`, `cd:1`, `hd:22`, `sd:9`.

- The CF article column is 680px wide.
- The site's full-bleed pattern is `left:50%; transform:translateX(-50%); width:92vw`.
- Chromium and Playwright are preinstalled in the cloud container. Don't reinstall Playwright. Load it with `createRequire` (as `smoke.mjs` does), because an ES-module `import` won't find the global install.

---

## Pipeline: how it runs, and rules learned the hard way

- `update.yml` runs on a schedule: through Nov. 13 that's 5:37 a.m., 12:17 p.m. and 5:17 p.m. ET, plus every 20 minutes on election night.
  1. Restore or rebuild the private voting-history lookup and registration pool. They're cached in the Actions cache, never committed. The cache key is `vhis-sha(H|V|v15)`; bump the `vNN` whenever `build_history.py`'s pool output changes. A rebuild takes about 10 minutes.
  2. `build_data.py` (~15–19 minutes).
  3. Commit `docs/` and deploy Pages.
  - `timeout-minutes` is 50.
- **If the history lookup is missing, the run now fails on purpose**, and the site keeps the last full data. That way a broken history step can't publish a tracker with blank history sections.
- **Never push while an update run is in progress.** Its own commit gets rejected and the run fails. This happened twice on Oct. 28. Use `tools/runs.sh push`, which checks first.
- **Start a run with `tools/runs.sh dispatch`.** `gh workflow run` fails because GraphQL is blocked in Claude sessions.
- Run `git pull --rebase` before every push. The workflow commits data, too.
- Commit messages end with the attribution lines the session gives you.
- After a run, check the **Pages** URL, not raw.githubusercontent. Pages is deployed from Actions.

### Security and approval rules (Theo's, still in force)

- **No voter-level data** in the public repo, in logs, or in this project. Counts only. Staff data goes only to the encrypted Pages vault.
- The history lookup and pool live only in the Actions cache. The extended local lookup (with 2012 and 2014) stays local, so rebuild it in the new session if you need it (see below).
- Don't commit `build_propensity.py`. Don't create GitHub releases.
- Raw NCSBE files may go on the `ncsbe-source-files` branch.
- **README changes need Theo's approval. Wording he hasn't approved isn't published.** Don't push undecided changes.
- Run Python with `-I` on untrusted downloads, and keep downloads in their own folder.
- Theo approved making the lean and candidate data public.

### Local inputs you'll need to fetch again (the old container is gone)

| Input | Source |
|---|---|
| Current voter history and registration: `ncvhis_Statewide.zip`, `ncvoter_Statewide.zip` | `https://s3.amazonaws.com/dl.ncsbe.gov/data/` |
| Registration snapshots `VR_Snapshot_20181106/20201103/20221108/20241105.zip` | `.../data/Snapshots/` |
| Absentee files for 2018, 2020, 2022 and 2024 (2018: `absentee_20181106_w_ethnicity.csv`) | NCSBE, or the `ncsbe-source-files` branch |
| Archived history file as of 11/08/2022 (`ncvhis_20221108.zip`) | Used for 2018 Election Day voters in `build_ed_baseline.py` |
| Extended lookup (2012 and 2014 bits) | Rebuilt from an archived history file. Bits are 2016=1, 2018=2, 2020=4, 2022=8, 2024=16, 2012=32, 2014=64. See `build_baselines.py` and `build_tier_baseline.py`. |

Memory in the container is about 7 GB, and building a full year's snapshot can be killed for running out of it. Keep columns slim and categorical, and free memory between steps. See `build_tier_baseline.py`.

---

## What the tracker has now (as of Oct. 28)

- **Top section:** turnout so far vs. the same day of early voting in a comparison year (2018, 2020, 2022 or 2024; the picker is `vs`). Pace lines and the day-by-day chart.
- **Map** with layers and per-button "?" definitions. **Rankings** with per-column "?".
- **Precinct map and table:** past years placed in today's precincts (`docs/pct_base/<year>/<County>.json`, `build_precinct_baselines.py`).
- **Who has voted:** party, age, race, propensity and new voters, plus a "Haven't voted yet" view.
- **Percentages / Votes switch:** one switch shared by Who has voted, Rankings and the crosstabs.
- **"Whose unreliable voters are showing up?"** A back-to-back pyramid of turnout by how many of the last three Novembers people voted in.
  - Years toggle, Turnout rate / Share of votes, extra-voters grid with a Net row.
  - Downloads: wide and tall PNG, and CSV.
  - Works for the state, counties and, as of today, districts. District past years place voters through their precinct then, using `docs/precinct_xwalk.json`.
- **"How much of the early vote comes from 2022 Election Day voters?"** Each party's share of its early and mail votes cast by 2022 Election Day voters.
  - A tick marks the same share at this point in 2022, from 2018 Election Day voters (`docs/edbase2022.json`).
  - Also shows the "still to vote" count.
- **"Share these crosstabs":** 1080×1350 images.
  - As of today: a Measure control (Turnout rate / Share of votes) and a Party filter (All / D / R / U) on the race × age × propensity images.
  - Data: 2026 `xpv`/`xpr` (96 cells = party × 32) and past `docs/xtabp<year>.json`.
- **Data fields per place in `data.json`:**
  - `pty`, `age`, `race`, `eth`, `lp` (low-propensity voters by party), `tv`/`tr` (pyramid), `e22v`/`e22r` (2022 Election Day voters who've voted, and registered).
  - `xv`/`xr`, `xpv`/`xpr`, `pv`/`pr` (crosstabs), `dd`/`cdd` (by day), `nv` (new voters).
  - Registered-voter denominators come from the pool.

**Added Oct. 29:**
- **Candidates** on district pages ("On the ballot"), from `docs/candidates.json` (`build_candidates.py`, from `district_lean/candidates.csv`, the lean widget's list). Fetched lazily with `side()`.
- **Party split by day, compared with past years** inside "Early voting, day by day": a day picker, That day / Through that day, Share / Votes, one row per year from `dd`. Early in-person only, like the chart. State `psDay`, `psThru`, `psVotes`.
- **Election Day in past years** section (`edBlock`): Election Day votes (V, C, P, T), share of all votes, party mix, and early-and-mail D − R for 2018–2024, state, counties and today's districts. Data `docs/edhist.json` from `build_ed_history.py` and the State Board's `history_stats_<date>.zip` files; totals match `baseline.json`'s `fin`/`fp` exactly. Precinct-level Election Day history (Project 1, step 2) is still to do.
- **Rankings: Choose columns.** The five measures and the numbers they're built from (`RK_X`: votes, registered, votes by party, shares, registration by party, registration split, low-propensity voters and registrants) switch on and off. `rkCols` rides in the hash as `rkcols=`. In Change since mode the extra columns show 2026 with the past year beneath; their CSV gets one column for each year.
- District lean widget: lean comparisons removed (Performance vs. Lean, Over/Underperformance, peers, stripes). 2024 Presidential is Harris − Trump on its own; Performance vs. Presidential = party split − (Harris − Trump).

**Still waiting on Theo's sign-off on wording:**
- Pyramid notes
- Rankings votes-mode "?" text
- A suggested "Share these crosstabs" paragraph for the article's "What We Track" section

---

## Project 1: Election Day analysis (for poll greeters)

**Goal:** help people decide where to send poll greeters on Election Day. Show where Election Day voting has historically been heaviest, and who is likely still to vote on Election Day this year, by precinct, county and district.

**What we know from the data:**
- Voter history `voting_method` gives each voter's method in each election.
  - Election Day = `ELECTION DAY IN-PERSON`, `ELECTION DAY CURBSIDE`, `PROVISIONAL`, `TRANSFER` (2022 labels).
  - 2018 uses `IN-PERSON`, `CURBSIDE`, `PROVISIONAL`, `TRANSFER`.
  - Early voting is `ABSENTEE ONESTOP` / `ABSENTEE CURBSIDE`; mail is `ABSENTEE BY MAIL`.
- The current history file drops people since removed from the rolls. Archived history files, such as the one as of 11/08/2022, cover the voters registered at the time.
- The pipeline already flags 2022 Election Day voters in the private lookup (`e22`). The pool has registered 2022 Election Day voters by party for the state, counties and districts (`e22r`), and `data.json` has how many have voted (`e22v`).
- Precinct placement in today's precincts is solved in `build_precinct_baselines.py`: same-address matching, with everyone else spread proportionally. Reuse it.
- Cross-check: NCSBE precinct results files (`results_pct_<date>.zip`) split votes by method (Election Day, One Stop, Absentee by Mail, Provisional) with no party. Use them to sanity-check historical Election Day totals.

**Suggested first version (most useful to greeters right now):**
1. **Live "likely Election Day voters still to come" by precinct.**
   - Registered voters who voted on Election Day in 2022 (and/or 2024) and haven't voted yet in 2026, by party and low/high propensity, in today's precincts.
   - Built in the pool and `build_data.py`, alongside `e22`.
   - Needs a per-precinct `e22` count in the pool, plus a 2024 Election Day flag (`e24`) in the lookup.
2. **Historical Election Day turnout by precinct** for 2018, 2020, 2022 and 2024:
   - Election Day votes, their share of all votes, and the party mix, placed in today's precincts.
   - New files, for example `docs/pct_ed/<year>/<County>.json`, built like `pct_base`.
3. **UI:** an "Election Day" layer or mode on the precinct map and table, plus a rankings column: "most 2022 Election Day voters not yet voted".
   - County and district rollups.
   - CSV download, because greeter coordinators will want lists of precincts.
   - Keep the small-precinct privacy rule: precincts with fewer than 10 are combined, and no county has exactly one combined precinct.

**Decide with Theo before building:**
- Use 2022 alone (the last midterm) or 2022 and 2024 combined? Midterm behavior matches 2026 better.
- Should "likely Election Day voter" mean Election Day in 2022 only, or Election Day in their most recent election?
- Where should it live: a new section, a map layer, or a separate staff-only view?
- After Nov. 3 it becomes purely historical. Does it stay up?

---

## Project 2: Selectable base year ("view a past year")

**What it is:** today, 2026 is always the "now," and the user picks a comparison year (`vs`). A base-year selector would let someone view 2022 on its own, or 2022 vs. 2018, at any day of early voting.

**The earlier recommendation still stands:** build it after Nov. 3. Until then it competes with live 2026 use, and the risk of breaking the live tracker is high. After the election it turns the tracker into a lasting historical tool.

**How to approach it:**
- Almost every section reads the current-year place object `r` (fields listed above).
  - Write one adapter: `rowFor(year, place, day)` returns an `r`-shaped object built from the past-year files (`baseline.json`, `baseline_districts.json`, `tiers<year>.json`, `xtab<year>.json`, `xtabp<year>.json`, `pct_base`, `edbase2022.json`) at day `k`.
  - Then call `show()` with it, so most sections render unchanged.
  - Sections whose fields don't exist for past years return `''`. Examples: early voting sites, per-site breakdowns, possibly race for 2018.
- Check which fields each past-year file carries. Fill gaps with new baseline builders if needed. For example, registered voters by group for each past year come from the snapshots.
- Comparison logic currently assumes base = 2026 in many places: labels like "2026", `D.days`, `fullDay()`, `kLatest()` and the share-image source lines. Search for `2026` and `vs` and route them through `baseYear`.
- Districts: past years use today's lines through `precinct_xwalk.json`. Say so in the notes.
- Day alignment: 2018 is lined up by days before Election Day (`build_baselines.py`).
- URL hash: add `base=` alongside the existing `vs=`.

**Decide with Theo:** which sections must work in phase 1? A sensible minimum is the top section, the map, Who has voted and Rankings. And should the base year be allowed to be later than the comparison year?
