// pages/HomePage.js
// ─────────────────────────────────────────────────────────────
// Page Object for the home page as a whole — the section inventory
// rather than any one section's behaviour.
//
// Shopify wraps every section in <div id="shopify-section-...">.
// Home-page sections carry a `template--<id>__<type>_<suffix>` id,
// while header / footer / drawer sections use `sections--...` or a
// bare name — so the pattern below deliberately matches only the
// home page. It mirrors scripts/sync-sections.mjs, which generates
// the manifest this inventory is compared against.
// ─────────────────────────────────────────────────────────────

import { BasePage } from './BasePage.js';

const HOME_SECTION_ID = /^template--\d+__(.+?)_[A-Za-z0-9]{5,}$/;

export class HomePage extends BasePage {

  constructor(page, preset = null) {
    super(page, preset);
    this.h = this.locators.home;
  }

  // ── Getters ─────────────────────────────────────────────────

  sectionWrappers() { return this.page.locator(this.h.sectionWrapper); }

  // ── Actions ─────────────────────────────────────────────────

  async open() {
    await this.gotoHome();
    await this.waitForPageLoad();
  }

  // ── Queries ─────────────────────────────────────────────────

  // Raw section ids currently rendered on the page.
  async sectionIds() {
    return this.sectionWrappers().evaluateAll((els) =>
      els.map((el) => el.id.replace('shopify-section-', ''))
    );
  }

  // Live home-page section inventory: { sectionType: count }.
  // Shape matches `preset.sections` in data/presets.json so the two
  // can be compared directly.
  async sectionInventory() {
    const ids = await this.sectionIds();
    const counts = {};
    for (const id of ids) {
      const match = HOME_SECTION_ID.exec(id);
      if (!match) continue;
      const type = match[1];
      counts[type] = (counts[type] ?? 0) + 1;
    }
    return Object.fromEntries(Object.keys(counts).sort().map((k) => [k, counts[k]]));
  }
}

export default HomePage;
