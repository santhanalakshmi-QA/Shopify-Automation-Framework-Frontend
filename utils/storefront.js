// utils/storefront.js
// ─────────────────────────────────────────────────────────────
// Storefront password-gate helpers.
//
// The khajal preset stores are unpublished, so every request is
// answered with Shopify's /password page until the storefront
// password is submitted. Unlocking sets the `storefront_digest`
// cookie; caching that cookie in a storageState file means the
// gate is cleared once per preset instead of once per test.
// ─────────────────────────────────────────────────────────────

import LOCATORS from '../locators/shopify-locators.js';

// True when the current page is Shopify's storefront password gate.
export async function isPasswordGate(page) {
  if (/\/password(\?|$)/.test(page.url())) return true;
  return (await page.locator(LOCATORS.password.form).count()) > 0;
}

// Submit the storefront password for `preset` on the current context.
// Returns true when a gate was present and cleared, false when the
// store was already public (nothing to do).
export async function unlockStorefront(page, preset) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  if (!(await isPasswordGate(page))) return false;

  if (!preset.password) {
    throw new Error(
      [
        `Preset "${preset.key}" (${preset.url}) is password protected but no password is configured.`,
        `Add one to .env as PRESET_${preset.key.toUpperCase()}_PASSWORD=<storefront password>,`,
        `or set STOREFRONT_PASSWORD=<password> if all presets share one.`,
        `The storefront password is in Shopify admin under Online Store > Preferences > Restrict access.`,
      ].join('\n')
    );
  }

  await page.goto('/password', { waitUntil: 'domcontentloaded' });
  await page.locator(LOCATORS.password.input).first().fill(preset.password);
  await page.locator(LOCATORS.password.submit).first().click();
  await page.waitForLoadState('domcontentloaded');

  if (await isPasswordGate(page)) {
    const message = await page
      .locator(LOCATORS.password.error)
      .first()
      .innerText()
      .catch(() => '');
    throw new Error(
      `Storefront password rejected for preset "${preset.key}" (${preset.url}). ${message}`.trim()
    );
  }

  return true;
}

export default { isPasswordGate, unlockStorefront };
