# Working in this repo

Data pipeline for Carolina Forward's NC Turnout Tracker, plus the tracker widget's source. **Read `DEVELOPING.md` before any non-trivial change.** It has the architecture, the data fields, and the plans for the Election Day analysis and the selectable base year.

Must-follow rules:
- **Counts only. No voter-level data** in the repo, logs or output. Raw State Board files and history lookups are git-ignored; keep it that way.
- **Never push while an update run is in progress.** Use `tools/runs.sh push`. Start runs with `tools/runs.sh dispatch` (`gh workflow run` fails: GraphQL is blocked).
- If you change `build_history.py`'s pool or lookup output, bump the cache key version (`|vNN`) in `.github/workflows/update.yml`.
- Check published data at https://theo-cf.github.io/nc-turnout-data/, not raw.githubusercontent.
- Widget: edit `widget/turnout_story_template.js`, then run `widget/build.sh` and `node widget/test/smoke.mjs`. Look at the screenshots at 900px and 390px. Send Theo `widget/out/nc-turnout-tracker.js`; he uploads it in Decap.
- README changes and any reader-facing wording need Theo's approval before they're published.
- Don't commit `build_propensity.py`. Don't create releases. Run Python with `-I` on downloaded files.
- End commit messages with the attribution lines the session provides.
