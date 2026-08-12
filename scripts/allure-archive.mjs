// scripts/allure-archive.mjs
// ─────────────────────────────────────────────────────────────
// Generates the Allure report for the CURRENT run and archives it, so
// old and new runs can be compared and shared.
//
//     npm run allure:archive
//
// Produces, for a run stamped 2026-08-10_14-32-07:
//
//   allure-report/                             the live report (npm run allure:open)
//   reports/allure/2026-08-10_14-32-07/        full archived copy, browsable
//   reports/allure/2026-08-10_14-32-07.html    ONE self-contained file to send
//   reports/allure/_history/                   trend data, carried run to run
//
// The single .html file is the one to email or drop in Slack: it needs
// no web server and no folder, unlike the normal Allure report which
// breaks when opened over file://.
//
// Trend history is restored into allure-results before generating, so
// every archived report shows how the run compares with previous ones
// even though allure-results itself is wiped between runs.
// ─────────────────────────────────────────────────────────────

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, cpSync, rmSync, readdirSync, renameSync } from 'node:fs';
import path from 'node:path';

const RESULTS = 'allure-results';
const REPORT = 'allure-report';
const ARCHIVE_ROOT = path.join('reports', 'allure');
const HISTORY = path.join(ARCHIVE_ROOT, '_history');

const run = (cmd, args) => spawnSync(cmd, args, { stdio: 'inherit', shell: true });

// ── Preconditions ────────────────────────────────────────────
if (!existsSync(RESULTS) || readdirSync(RESULTS).length === 0) {
  console.error(
    `\n✖  ${RESULTS} is empty — run the suite first (e.g. "npm test"), then archive.\n`
  );
  process.exit(1);
}

if (run('java', ['-version']).status !== 0) {
  console.error(
    '\n✖  Java 8+ is required to generate Allure reports and was not found on PATH.' +
      '\n   Install it from https://adoptium.net/ and re-open your terminal.\n'
  );
  process.exit(1);
}

// A filesystem-safe local timestamp: 2026-08-10_14-32-07
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const stamp =
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
  `_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

mkdirSync(ARCHIVE_ROOT, { recursive: true });

// ── 1. Restore trend history so the report shows run-over-run change ──
if (existsSync(HISTORY)) {
  cpSync(HISTORY, path.join(RESULTS, 'history'), { recursive: true });
  console.log('↻  Restored trend history from previous runs');
} else {
  console.log('↻  No previous history yet — this run becomes the baseline');
}

// ── 2. Generate the browsable report ─────────────────────────
console.log('\n▶  Generating Allure report…');
if (run('npx', ['allure', 'generate', RESULTS, '--clean', '-o', REPORT]).status !== 0) {
  console.error('\n✖  allure generate failed.\n');
  process.exit(1);
}

// ── 3. Carry this run's history forward for the next archive ──
const generatedHistory = path.join(REPORT, 'history');
if (existsSync(generatedHistory)) {
  rmSync(HISTORY, { recursive: true, force: true });
  cpSync(generatedHistory, HISTORY, { recursive: true });
}

// ── 4. Archive the full report under its timestamp ───────────
const archiveDir = path.join(ARCHIVE_ROOT, stamp);
cpSync(REPORT, archiveDir, { recursive: true });

// ── 5. Single-file report — the shareable artefact ───────────
// `--single-file` inlines everything into one index.html that works
// over file://, which the multi-file report does not.
console.log('\n▶  Building single-file report for sharing…');
const singleTmp = path.join(ARCHIVE_ROOT, '_single-tmp');
rmSync(singleTmp, { recursive: true, force: true });

let singleFile = null;
const single = run('npx', [
  'allure', 'generate', RESULTS, '--clean', '--single-file', '-o', singleTmp,
]);

if (single.status === 0 && existsSync(path.join(singleTmp, 'index.html'))) {
  singleFile = path.join(ARCHIVE_ROOT, `${stamp}.html`);
  renameSync(path.join(singleTmp, 'index.html'), singleFile);
  rmSync(singleTmp, { recursive: true, force: true });
} else {
  rmSync(singleTmp, { recursive: true, force: true });
  console.warn(
    '⚠  Could not build the single-file report (this Allure version may not support --single-file).' +
      '\n   The archived folder is still available; zip it to share.'
  );
}

// ── 6. Report what was produced ──────────────────────────────
const archives = readdirSync(ARCHIVE_ROOT)
  .filter((f) => /^\d{4}-\d{2}-\d{2}_/.test(f) && !f.endsWith('.html'))
  .sort();

console.log('\n✔  Archived');
console.log(`   live report   : ${REPORT}/            (npm run allure:open)`);
console.log(`   archived copy : ${archiveDir}/`);
if (singleFile) console.log(`   share this    : ${singleFile}`);
console.log(`\n   ${archives.length} archived report(s) in ${ARCHIVE_ROOT}/`);
if (archives.length > 1) {
  console.log(`   previous      : ${archives[archives.length - 2]}`);
  console.log('   Trend charts on the report Overview compare it with earlier runs.');
}
