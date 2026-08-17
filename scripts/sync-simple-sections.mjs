// scripts/sync-simple-sections.mjs
// ─────────────────────────────────────────────────────────────
// Measures every "simple" home-page section on every preset and
// writes the result into data/presets.json as `simpleSections`.
//
//     npm run sync:simple
//
// Same principle as `sync:sections`: nobody hand-maintains these
// numbers. They are read from the live storefronts, so the expected
// values cannot quietly drift away from reality — and when a store
// genuinely changes, the diff on this file is the record of it.
//
// Requires the unlocked sessions in .auth/ (run `npm run unlock`).
// ─────────────────────────────────────────────────────────────

import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { SIMPLE_SECTIONS, rootSelector } from '../utils/simple-sections.js';
import 'dotenv/config';

const PRESETS_FILE = 'data/presets.json';
const data = JSON.parse(readFileSync(PRESETS_FILE, 'utf8'));
const browser = await chromium.launch();
let changed = 0;

for (const preset of data.presets) {
  const auth = `.auth/${preset.key}.json`;
  if (!existsSync(auth)) {
    console.error(`  ${preset.key}: missing ${auth} — run "npm run unlock" first. Skipped.`);
    continue;
  }

  const context = await browser.newContext({ storageState: auth, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(preset.url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // Same trap as sync:sections — an expired session in .auth/ lands on
  // the password gate, which has no sections, and an unguarded sync
  // records zeros over a good manifest.
  const gated = await page.evaluate(() => ({
    passwordForm: !!document.querySelector('form[action="/password"]'),
    path: location.pathname,
  }));
  if (gated.passwordForm || gated.path.startsWith('/password')) {
    console.error(
      `  ${preset.key}: storefront redirected to the password gate — the cached session ` +
      `in .auth/${preset.key}.json has expired.\n` +
      `             Run "npm run unlock" and try again. Manifest left untouched.`
    );
    await context.close();
    continue;
  }

  // Walk the whole page so lazy content below the fold renders before
  // anything is counted. Measuring too early is how a section gets
  // recorded with fewer items than it really has.
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(600);

  const measured = {};
  for (const section of SIMPLE_SECTIONS) {
    if (!preset.sections?.[section.type]) continue;

    measured[section.type] = await page.evaluate(
      ({ root, item }) =>
        [...document.querySelectorAll(root)].map((el) => ({
          items: item ? el.querySelectorAll(item).length : 0,
          images: el.querySelectorAll('img').length,
          links: el.querySelectorAll('a').length,
          headings: el.querySelectorAll('h1,h2,h3,h4').length,
        })),
      { root: rootSelector(section.type), item: section.item }
    );
  }

  const before = JSON.stringify(preset.simpleSections ?? null);
  if (before !== JSON.stringify(measured)) changed++;
  preset.simpleSections = measured;

  const summary = Object.entries(measured)
    .map(([t, list]) => `${t}(${list.map((m) => m.items || '-').join('/')})`)
    .join(' ');
  console.log(`  ${preset.key.padEnd(10)} ${Object.keys(measured).length} simple section type(s): ${summary}`);

  await context.close();
}

await browser.close();

if (changed) {
  writeFileSync(PRESETS_FILE, JSON.stringify(data, null, 2) + '\n');
  console.log(`\n  ${changed} preset(s) updated in ${PRESETS_FILE}`);
} else {
  console.log(`\n  ${PRESETS_FILE} already up to date.`);
}
