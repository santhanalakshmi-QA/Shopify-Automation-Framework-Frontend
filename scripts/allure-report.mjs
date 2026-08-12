// scripts/allure-report.mjs
// ─────────────────────────────────────────────────────────────
// One-command Allure workflow:
//   1. Run the Playwright suite (the allure-playwright reporter writes
//      raw results to ./allure-results during the run).
//   2. Generate the browsable Allure report into ./allure-report.
//   3. Open the report in the default browser.
//
// Step 2/3 run even when tests fail, because a failing run is exactly
// when you want the report. Any CLI args are forwarded to Playwright,
// e.g.  npm run test:allure -- --project=desktop-chromium
// ─────────────────────────────────────────────────────────────
import { spawnSync } from 'node:child_process';

// `shell: true` lets the npx/allure resolution work identically on
// Windows (cmd) and POSIX shells.
const run = (cmd, args) =>
  spawnSync(cmd, args, { stdio: 'inherit', shell: true });

const forwarded = process.argv.slice(2);

console.log('▶  Running Playwright tests…');
const test = run('npx', ['playwright', 'test', ...forwarded]);

// The Allure command-line report generator is a JVM application and needs
// Java 8+ on the PATH. Fail loud and clear if it is missing rather than
// letting `allure` print an opaque error.
const hasJava = run('java', ['-version']).status === 0;
if (!hasJava) {
  console.error(
    '\n✖  Java was not found on your PATH, so the Allure HTML report cannot be generated.' +
      '\n   The test results ARE written to ./allure-results — install Java 8+ and run' +
      '\n   `npm run allure:report` to render them.' +
      '\n   Install Java: https://adoptium.net/  (then re-open your terminal)\n',
  );
  process.exit(test.status ?? 0);
}

console.log('\n▶  Generating Allure report…');
run('npx', ['allure', 'generate', 'allure-results', '--clean', '-o', 'allure-report']);

console.log('\n▶  Opening Allure report…');
run('npx', ['allure', 'open', 'allure-report']);

// Preserve the test run's exit code so CI still fails on test failures.
process.exit(test.status ?? 0);
