#!/usr/bin/env bash
# Build the public widgets from their templates.
#   widget/build.sh                 -> widget/out/nc-turnout-tracker.js (live data from GitHub Pages) and nc-district-lean.js
#   widget/build.sh local           -> widget/out/nc-turnout-tracker.js reading http://127.0.0.1:8123/data.json (see test/serve.py)
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out
URL=https://theo-cf.github.io/nc-turnout-data/data.json
[ "${1:-}" = local ] && URL=http://127.0.0.1:8123/data.json
echo null > out/null.json
python3 build_widget.py turnout_story_template.js out/null.json "$URL" out/nc-turnout-tracker.js
# The lean widget uses the tracker's Carolina Forward logo
python3 - <<'PY'
import re
t = open('turnout_story_template.js').read()
logo = re.search(r"var CF_LOGO = '([^']+)'", t).group(1)
open('out/nc-district-lean.js', 'w').write(open('district_lean_template.js').read().replace('__CF_LOGO__', logo))
PY
ls -la out/*.js
