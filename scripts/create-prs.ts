import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

const isClean = hasFlag('clean');
const countArg = getArg('count');
const failArg = getArg('fail');

const failSet = new Set(
  failArg ? failArg.split(',').map((s) => parseInt(s.trim(), 10)) : []
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function run(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Command failed: ${cmd}\n${msg}`);
  }
}

function pad(n: number): string {
  return String(n).padStart(3, '0');
}

function tryRun(cmd: string): string | null {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// --clean: close all open demo/* PRs and delete their branches
// ---------------------------------------------------------------------------

if (isClean) {
  console.log('Cleaning up demo PRs and branches...\n');

  const raw = run('gh pr list --json number,headRefName --state open');
  const prs = JSON.parse(raw) as Array<{ number: number; headRefName: string }>;
  const demoPRs = prs.filter((pr) => pr.headRefName.startsWith('demo/pr-'));

  if (demoPRs.length === 0) {
    console.log('No open demo PRs found.');
  } else {
    for (const pr of demoPRs) {
      console.log(`Closing PR #${pr.number} (${pr.headRefName}) and deleting branch...`);
      run(`gh pr close ${pr.number} --delete-branch`);
    }
    console.log(`\nClosed ${demoPRs.length} PR(s).`);
  }

  process.exit(0);
}

// ---------------------------------------------------------------------------
// --count N: create N branches + PRs
// ---------------------------------------------------------------------------

if (!countArg) {
  console.error('Usage:');
  console.error('  npx ts-node scripts/create-prs.ts --count N [--fail X,Y,Z]');
  console.error('  npx ts-node scripts/create-prs.ts --clean');
  process.exit(1);
}

const count = parseInt(countArg, 10);
if (isNaN(count) || count < 1) {
  console.error('--count must be a positive integer');
  process.exit(1);
}

// Validate fail indices
for (const n of failSet) {
  if (n < 1 || n > count) {
    console.error(`--fail value ${n} is out of range (must be between 1 and ${count})`);
    process.exit(1);
  }
}

console.log(`Creating ${count} PR(s)${failSet.size > 0 ? `, with PR(s) [${[...failSet].join(', ')}] set to fail CI` : ''}.\n`);

// Make sure we're on main and up to date
run('git checkout main');
run('git pull origin main');

for (let i = 1; i <= count; i++) {
  const num = pad(i);
  const branch = `demo/pr-${num}`;
  const isFailing = failSet.has(i);

  console.log(`[${i}/${count}] Creating branch ${branch}${isFailing ? ' (WILL FAIL CI)' : ''}...`);

  // Delete local branch if it already exists from a previous run
  tryRun(`git branch -D ${branch}`);
  run(`git checkout -b ${branch}`);

  // Each PR creates its own unique file — zero merge conflicts possible
  fs.mkdirSync('entries', { recursive: true });
  fs.writeFileSync(
    path.join('entries', `pr-${num}.md`),
    `# Entry ${num}\n\nAdded by demo branch \`${branch}\`.\n`
  );

  if (isFailing) {
    fs.writeFileSync(
      'SHOULD_FAIL',
      'This file causes CI to fail intentionally.\nDelete it to make this PR pass.\n'
    );
  }

  run('git add .');
  run(`git commit -m "demo: add entry ${num}${isFailing ? ' [will fail CI]' : ''}"`);
  // Force-push in case the remote branch already exists from a previous run
  run(`git push --force origin ${branch}`);

  const title = `Demo PR ${num}${isFailing ? ' (expected CI failure)' : ''}`;
  const body = isFailing
    ? `This PR intentionally fails CI to demonstrate merge queue ejection.\n\nDelete \`SHOULD_FAIL\` to make it pass.`
    : `Adds \`entries/pr-${num}.md\`. Part of a merge queue demo.`;

  // Only create a new PR if one doesn't already exist for this branch
  const existingPRs = JSON.parse(
    run(`gh pr list --head ${branch} --json number --state open`)
  ) as Array<{ number: number }>;

  if (existingPRs.length > 0) {
    console.log(`    PR #${existingPRs[0].number} already exists for ${branch}, skipping creation`);
  } else {
    run(`gh pr create --title "${title}" --body "${body}" --base main`);
    console.log(`    PR created for ${branch}`);
  }

  // Return to main before creating the next branch
  run('git checkout main');
}

console.log(`\nDone! ${count} PR(s) created and ready to enter the merge queue.`);
if (failSet.size > 0) {
  console.log(`PRs configured to fail CI: ${[...failSet].join(', ')}`);
}
