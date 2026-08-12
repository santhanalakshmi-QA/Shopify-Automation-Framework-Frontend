// scripts/allure-list.mjs
// Lists archived Allure reports, newest first, so you can pick one to
// open or send on.  Usage:  npm run allure:list
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.join('reports', 'allure');

if (!existsSync(ROOT)) {
  console.log('No archived reports yet — run "npm run allure:archive" after a test run.');
  process.exit(0);
}

const entries = readdirSync(ROOT)
  .filter((f) => /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/.test(f))
  .sort()
  .reverse();

if (entries.length === 0) {
  console.log('No archived reports yet — run "npm run allure:archive" after a test run.');
  process.exit(0);
}

console.log(`\n${entries.length} archived report(s) in ${ROOT}/\n`);
console.log('  when'.padEnd(24) + 'folder'.padEnd(10) + 'single file');
console.log('  ' + '-'.repeat(58));

for (const name of entries) {
  const single = path.join(ROOT, `${name}.html`);
  const sizeMb = existsSync(single)
    ? (statSync(single).size / 1e6).toFixed(1) + ' MB'
    : '—';
  console.log(`  ${name.replace('_', '  ').replace(/-/g, ':').replace(/^(\d+):(\d+):(\d+)/, '$1-$2-$3').padEnd(24)}yes       ${sizeMb}`);
}

console.log(`\n  open a folder : npx allure open ${ROOT}/<when>`);
console.log(`  share a file  : ${ROOT}/<when>.html\n`);
