#!/usr/bin/env bash
# Safe helpers for the update workflow (gh's GraphQL is blocked in Claude sessions, so these use the REST API).
#   tools/runs.sh status     recent update runs
#   tools/runs.sh push       git pull --rebase and push, but only if no update run is in progress
#                            (a push during a run makes that run's own commit fail)
#   tools/runs.sh dispatch   start an update run now
#   tools/runs.sh wait       wait for the latest run to finish and print its result
set -euo pipefail
R=repos/theo-cf/nc-turnout-data
busy() { gh api "$R/actions/runs?per_page=5" -q '[.workflow_runs[] | select(.status!="completed")] | length'; }
case "${1:-status}" in
  status)   gh api "$R/actions/runs?per_page=5" -q '.workflow_runs[] | "\(.id) \(.status) \(.conclusion) \(.event) \(.created_at)"' ;;
  push)     n=$(busy); if [ "$n" != 0 ]; then echo "An update run is in progress; push after it finishes."; exit 1; fi
            git pull --rebase -q && git push -q && echo pushed ;;
  dispatch) gh api -X POST "$R/actions/workflows/update.yml/dispatches" -f ref=main && echo dispatched ;;
  wait)     id=$(gh api "$R/actions/runs?per_page=1" -q '.workflow_runs[0].id'); echo "run $id"
            until gh api "$R/actions/runs/$id" -q .status | grep -q completed; do sleep 30; done
            gh api "$R/actions/runs/$id" -q .conclusion ;;
  *) echo "usage: tools/runs.sh status|push|dispatch|wait"; exit 2 ;;
esac
