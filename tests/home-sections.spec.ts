// tests/home-sections.spec.ts
// ─────────────────────────────────────────────────────────────
// Drift detection for the section manifest.
//
// Without this, a merchant adding a section in Shopify admin would
// silently go untested — the section specs only cover types listed in
// data/presets.json, so an unlisted section is invisible to the suite.
// This test compares the live home page against the manifest and fails
// with the exact diff when they disagree.
//
// Fixing a failure is one command: `npm run sync:sections`, then write
// the spec for whatever new section type appeared.
// ─────────────────────────────────────────────────────────────

import { test, expect } from '../utils/fixtures';
import { mountNarrator, spot } from '../utils/demo-hud.js';
import { HomePage } from '../pages/HomePage.js';

test.describe('Home page — section manifest', () => {
  let home: HomePage;

  test.beforeEach(async ({ page, preset }, testInfo) => {
    await mountNarrator(page, {
      title: testInfo.title,
      preset: preset.key,
      spotlight: '[id^="shopify-section-"]',
    });
    home = new HomePage(page, preset);
    await home.open();
  });

  test('live sections match the generated manifest', async ({ preset }) => {
    const live = await home.sectionInventory();
    const declared = preset.sections ?? {};

    const added = Object.keys(live).filter((t) => !(t in declared));
    const removed = Object.keys(declared).filter((t) => !(t in live));
    const changed = Object.keys(live)
      .filter((t) => t in declared && live[t] !== declared[t])
      .map((t) => `${t}: manifest ${declared[t]} vs live ${live[t]}`);

    const drift = [
      added.length ? `added: ${added.join(', ')}` : null,
      removed.length ? `removed: ${removed.join(', ')}` : null,
      changed.length ? `count changed: ${changed.join('; ')}` : null,
    ].filter(Boolean);

    expect(
      drift,
      `${preset.label} home page drifted from data/presets.json.\n` +
        `Run "npm run sync:sections" to update the manifest, then add specs for any new section type.`
    ).toEqual([]);
  });

  // NOTE: "every declared section type is actually present" was removed
  // as a duplicate — the drift test above already reports a declared
  // section missing from the page via its `removed:` branch.
});
