// tests/setup/storefront-unlock.setup.js
// ─────────────────────────────────────────────────────────────
// Setup project: clears the Shopify password gate once per preset
// and caches the unlocked session to .auth/<preset>.json.
//
// Every browser project declares `dependencies: ['<preset>-setup']`
// and `storageState: .auth/<preset>.json`, so the gate is submitted
// once per preset per run instead of once per test.
//
// The preset under test comes from the project metadata, so this
// single file serves all four presets.
// ─────────────────────────────────────────────────────────────

import { test as setup } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { getPreset, authFile } from '../../utils/presets.js';
import { unlockStorefront } from '../../utils/storefront.js';

setup('unlock storefront', async ({ page }, testInfo) => {
  const preset = getPreset(testInfo.project.metadata.presetKey);

  const wasLocked = await unlockStorefront(page, preset);
  testInfo.annotations.push({
    type: 'storefront',
    description: wasLocked
      ? `${preset.label} (${preset.url}) unlocked with the storefront password`
      : `${preset.label} (${preset.url}) is public — no password gate`,
  });

  const file = authFile(preset.key);
  mkdirSync(dirname(file), { recursive: true });
  await page.context().storageState({ path: file });
});
