# Merge Queue Demo

A demo repo for showing GitHub merge queue behaviour to engineering colleagues.

## Prerequisites

- [GitHub CLI](https://cli.github.com/) (`gh`) installed and authenticated
- Node.js 20+
- The GitHub repo must have branch protection on `main` configured (see [Branch Protection Setup](#branch-protection-setup))

## Setup

```bash
npm install
```

## Creating Demo PRs

```bash
npx ts-node scripts/create-prs.ts --count N [--fail X,Y,Z]
```

| Option | Description |
|--------|-------------|
| `--count N` | Number of PRs to create |
| `--fail X,Y,Z` | Comma-separated list of PR ordinals that should fail CI |

**Examples:**

```bash
# Create 5 PRs, all passing
npx ts-node scripts/create-prs.ts --count 5

# Create 5 PRs, PR #3 fails CI (expect 1,2,4,5 to merge)
npx ts-node scripts/create-prs.ts --count 5 --fail 3

# Create 5 PRs, PRs #2 and #4 fail CI
npx ts-node scripts/create-prs.ts --count 5 --fail 2,4
```

Each PR:
- Creates a unique file `entries/pr-NNN.md` (no merge conflicts possible)
- If marked to fail: also adds a `SHOULD_FAIL` marker file that causes CI to exit non-zero

## Cleaning Up

To close all open `demo/*` PRs and delete their branches:

```bash
npx ts-node scripts/create-prs.ts --clean
```

Run this between demo runs to reset to a clean state.

## How the CI Failure Works

When a branch is created with `--fail`, it includes a `SHOULD_FAIL` file. The CI workflow detects this file and fails the check. This causes the merge queue to eject that PR, while the remaining PRs continue merging normally.

To "fix" a failing PR mid-demo, simply delete the `SHOULD_FAIL` file and push — the CI will then pass.

## Branch Protection Setup

For the demo to work correctly, configure branch protection on `main` in GitHub repo settings:

- **Require status checks to pass** — add the `check` job from the `CI` workflow
- **Require branches to be up to date** — enables the merge queue to run checks speculatively
- **Do not require approvals** — keeps the demo flow fast
- **Block direct pushes to main**

> **Important:** When enabling the merge queue, GitHub will run CI against the queued group (a `merge_group` event). The `ci.yml` workflow already includes this trigger — make sure the `CI / check` status is listed as a required check so the queue waits for it.

## Repo Structure

```
.github/workflows/
  ci.yml           # Runs on pull_request and merge_group; fails if SHOULD_FAIL present
  on-merge.yml     # Runs on push to main; logs the merged commit
scripts/
  create-prs.ts    # CLI for creating and cleaning up demo PRs
entries/           # Each merged PR leaves a file here (shows merge outcome)
```
