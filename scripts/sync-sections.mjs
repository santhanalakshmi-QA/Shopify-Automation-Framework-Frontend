// scripts/sync-sections.mjs
// ─────────────────────────────────────────────────────────────
// Reads every preset storefront and writes the home-page section
// inventory back into data/presets.json as `sections: { type: count }`.
//
// Run it whenever a store's home page changes:
//     npm run sync:sections
//
// Nobody hand-maintains the section list — it is generated from the
// live stores, so the manifest cannot silently drift out of date.
// The drift test (tests/home-sections.spec.js) fails when it does.
//
// Requires the unlocked sessions in .auth/, so run `npm run unlock`
// first (or just `npm test`, which unlocks as a setup project).
// ─────────────────────────────────────────────────────────────

import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import 'dotenv/config';

const PRESETS_FILE = 'data/presets.json';

// Shopify wraps every section in <div id="shopify-section-...">.
// Home-page sections carry a `template--<id>__<type>_<suffix>` id;
// header/footer/drawer sections use `sections--...` or a bare name,
// so this pattern deliberately matches only the home page.
const HOME_SECTION_ID = /^template--\d+__(.+?)_[A-Za-z0-9]{5,}$/;

function sectionTypesFrom(ids) {
  const counts = {};
  for (const id of ids) {
    const match = HOME_SECTION_ID.exec(id);
    if (!match) continue;
    const type = match[1];
    counts[type] = (counts[type] ?? 0) + 1;
  }
  // Stable alphabetical key order so re-runs produce clean diffs.
  return Object.fromEntries(Object.keys(counts).sort().map((k) => [k, counts[k]]));
}

const data = JSON.parse(readFileSync(PRESETS_FILE, 'utf8'));
const browser = await chromium.launch();
let changed = 0;

for (const preset of data.presets) {
  const auth = `.auth/${preset.key}.json`;
  if (!existsSync(auth)) {
    console.error(`  ${preset.key}: missing ${auth} — run "npm run unlock" first. Skipped.`);
    continue;
  }

  const context = await browser.newContext({
    storageState: auth,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.goto(preset.url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const ids = await page.evaluate(() =>
    [...document.querySelectorAll('[id^="shopify-section-"]')].map((el) =>
      el.id.replace('shopify-section-', '')
    )
  );

  const sections = sectionTypesFrom(ids);
  const before = JSON.stringify(preset.sections ?? {});
  preset.sections = sections;
  if (before !== JSON.stringify(sections)) changed++;

  const total = Object.values(sections).reduce((a, b) => a + b, 0);
  console.log(
    `  ${preset.key.padEnd(10)} ${String(Object.keys(sections).length).padStart(2)} types / ${String(total).padStart(2)} sections`
  );

  await context.close();
}

await browser.close();

writeFileSync(PRESETS_FILE, JSON.stringify(data, null, 2) + '\n');
console.log(
  changed
    ? `\nUpdated ${PRESETS_FILE} (${changed} preset(s) changed).`
    : `\n${PRESETS_FILE} already up to date.`
);
