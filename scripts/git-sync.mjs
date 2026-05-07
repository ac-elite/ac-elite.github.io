import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const METADATA_JSON = join(__dirname, '..', 'public', 'data', 'metadata.json');

const defaultMessage = 'V3 - Update';
const customMessage = process.argv.slice(2).join(' ').trim();
const commitMessage = customMessage || defaultMessage;

function run(command) {
  execSync(command, { stdio: 'inherit' });
}

/**
 * `git pull --rebase --autostash` can leave conflict markers in metadata.json when
 * both origin and your stash touched it. Merge both JSON sides (newer timestamps win).
 */
function repairMetadataJsonIfConflict() {
  if (!existsSync(METADATA_JSON)) return false;
  let text;
  try {
    text = readFileSync(METADATA_JSON, 'utf8');
  } catch {
    return false;
  }
  if (!text.includes('<<<<<<<')) return false;

  text = text.replace(/\r\n/g, '\n');
  const conflictRe = /\{\s*\n<<<<<<<[^\n]*\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>>[^\n]*\n?/;
  const m = text.match(conflictRe);
  if (!m) {
    console.warn(
      '[git:sync] public/data/metadata.json has conflict markers in an unexpected shape; resolve by hand.'
    );
    return false;
  }

  function parseConflictSide(fragment) {
    const trimmed = fragment.trim().replace(/\}\s*$/, '');
    return JSON.parse(`{\n${trimmed}\n}`);
  }

  let upstream;
  let stashed;
  try {
    upstream = parseConflictSide(m[1]);
    stashed = parseConflictSide(m[2]);
  } catch (e) {
    console.warn('[git:sync] Could not parse metadata.json conflict sides:', e instanceof Error ? e.message : e);
    return false;
  }

  const isos = [upstream.lastSync, stashed.lastSync].filter((x) => typeof x === 'string' && x);
  const lastSync = isos.length ? isos.sort()[isos.length - 1] : upstream.lastSync ?? stashed.lastSync;

  const snaps = [upstream.rank24hSnapshotAt, stashed.rank24hSnapshotAt].filter(
    (x) => typeof x === 'string' && x
  );
  const rank24hSnapshotAt = snaps.length ? snaps.sort()[snaps.length - 1] : undefined;

  const status =
    upstream.status === 'success' || stashed.status === 'success'
      ? 'success'
      : (upstream.status ?? stashed.status ?? 'unknown');

  const merged = { lastSync, status };
  if (rank24hSnapshotAt) merged.rank24hSnapshotAt = rank24hSnapshotAt;

  writeFileSync(METADATA_JSON, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  console.log('[git:sync] Resolved merge conflict in public/data/metadata.json (merged both sides).');
  return true;
}

run('git pull --rebase --autostash');
repairMetadataJsonIfConflict();

run('git add -A');

let hasStagedChanges = true;
try {
  execSync('git diff --cached --quiet', { stdio: 'ignore' });
  hasStagedChanges = false;
} catch {
  hasStagedChanges = true;
}

if (hasStagedChanges) {
  run(`git commit -m ${JSON.stringify(commitMessage)}`);
} else {
  console.log('No staged changes to commit.');
}

run('git push');
run('git diff --quiet');
run('git diff --cached --quiet');
