#!/bin/bash
set -e

echo "Open demo PRs:"
gh pr list --json number,title,headRefName \
  --jq '[.[] | select(.headRefName | startswith("demo/pr-"))] | sort_by(.number) | .[] | "  #\(.number)  \(.title)"'

echo ""
read -r -p "Add all to merge queue? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

echo ""
gh pr list --json number,headRefName \
  --jq '[.[] | select(.headRefName | startswith("demo/pr-"))] | sort_by(.number) | .[].number' \
  | xargs -I{} gh pr merge {} --auto --squash

echo "Done — PRs added to the merge queue."
