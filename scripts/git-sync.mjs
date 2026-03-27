import { execSync } from 'node:child_process';

const defaultMessage = 'V2 - Update';
const customMessage = process.argv.slice(2).join(' ').trim();
const commitMessage = customMessage || defaultMessage;

function run(command) {
  execSync(command, { stdio: 'inherit' });
}

run('git pull --rebase --autostash');
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
