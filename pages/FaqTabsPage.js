// pages/FaqTabsPage.js
// ─────────────────────────────────────────────────────────────
// Page Object for the tabbed FAQ section.
//
// This is a SEPARATE section type from the plain FAQ, not a variant
// of it. dense ships both — the tabbed one at y≈3953 and a plain
// accordion at y≈7263 — so the two must never be tested by the same
// suite. The root selector excludes each from the other.
//
// Verified structure on dense:
//
//   tabs            3  ("Apply 5 To 10 Drops", "Spread Through
//                        Hair/Beard", "Always Massage Gently")
//   panels          3  (one per tab, only the active one has height)
//   questions       4 per panel, 12 total
//   open at load    the first question of each panel
//
// Two things the probe already showed, which the suite asserts:
//   * the tabs carry no aria-controls, so nothing connects a tab to
//     the panel it opens
//   * arrow keys do not move between tabs
// ─────────────────────────────────────────────────────────────

import { BasePage } from './BasePage.js';
import { rootSelector } from '../utils/simple-sections.js';

export class FaqTabsPage extends BasePage {

  constructor(page, preset = null) {
    super(page, preset);
    this.t = this.locators.faqTabs;
    this.rootSel = rootSelector('faq_with_tabs');
  }

  // ── Getters ─────────────────────────────────────────────────

  roots()         { return this.page.locator(this.rootSel); }
  root(index = 0) { return this.roots().nth(index); }

  tablist(index = 0) { return this.root(index).locator(this.t.tablist).first(); }
  tabs(index = 0)    { return this.root(index).locator(this.t.tab); }
  tab(n, index = 0)  { return this.tabs(index).nth(n); }
  tabLabels(index = 0) { return this.root(index).locator(this.t.tabLabel); }

  panels(index = 0)   { return this.root(index).locator(this.t.panel); }
  panel(n, index = 0) { return this.panels(index).nth(n); }
  panelHeadings(index = 0) { return this.root(index).locator(this.t.panelHeading); }

  /** Questions inside the nth panel. */
  items(panelIndex = 0, index = 0) {
    return this.panel(panelIndex, index).locator(this.t.item);
  }
  triggers(panelIndex = 0, index = 0) {
    return this.panel(panelIndex, index).locator(this.t.trigger);
  }

  // ── Actions ─────────────────────────────────────────────────

  async open() {
    await this.gotoHome();
    await this.root().waitFor({ state: 'attached', timeout: 30_000 });
    await this.focus(0);
  }

  async focus(index = 0) {
    await this.scrollSectionIntoView(this.root(index));
  }

  /**
   * Click the nth tab and wait for the switch to complete.
   *
   * Waits for the panel to actually gain height rather than sleeping:
   * the panels cross-fade, so a fixed delay is either too short (and
   * reads the outgoing panel) or wasteful.
   */
  async selectTab(n, index = 0) {
    await this.tab(n, index).click();
    await this.waitForPanel(n, index);
  }

  async waitForPanel(n, index = 0, timeout = 4000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const visible = await this.visiblePanels(index);
      if (visible.length === 1 && visible[0] === n) return true;
      await this.page.waitForTimeout(120);
    }
    return false;
  }

  /** Focus a tab and press a key — WAI-ARIA keyboard support. */
  async pressOnTab(n, key, index = 0) {
    await this.tab(n, index).focus();
    await this.page.keyboard.press(key);
    await this.page.waitForTimeout(700);
  }

  // ── Queries ─────────────────────────────────────────────────

  async tabCount(index = 0)   { return this.tabs(index).count(); }
  async panelCount(index = 0) { return this.panels(index).count(); }

  /** Index of the tab marked aria-selected, or -1. */
  async activeTab(index = 0) {
    return this.tabs(index).evaluateAll((els) =>
      els.findIndex((e) => e.getAttribute('aria-selected') === 'true')
    );
  }

  /** Indices of panels currently rendered with height. */
  async visiblePanels(index = 0) {
    return this.panels(index).evaluateAll((els) =>
      els.map((e, i) => (e.getBoundingClientRect().height > 10 ? i : -1)).filter((i) => i >= 0)
    );
  }

  async tabTexts(index = 0) {
    return this.tabLabels(index).evaluateAll((els) =>
      els.map((e) => (e.textContent ?? '').trim().replace(/\s+/g, ' '))
    );
  }

  async panelHeadingTexts(index = 0) {
    return this.panelHeadings(index).evaluateAll((els) =>
      els.map((e) => (e.textContent ?? '').trim().replace(/\s+/g, ' '))
    );
  }

  async questionsPerPanel(index = 0) {
    return this.panels(index).evaluateAll((els) =>
      els.map((p) => p.querySelectorAll('details.faq-item').length)
    );
  }

  /** How many questions are open inside each panel. */
  async openPerPanel(index = 0) {
    return this.panels(index).evaluateAll((els) =>
      els.map((p) => [...p.querySelectorAll('details.faq-item')].filter((q) => q.hasAttribute('open')).length)
    );
  }

  /** Does each tab reference the panel it controls? */
  async tabWiring(index = 0) {
    return this.tabs(index).evaluateAll((els) =>
      els.map((e, i) => ({
        n: i + 1,
        role: e.getAttribute('role'),
        ariaSelected: e.getAttribute('aria-selected'),
        ariaControls: e.getAttribute('aria-controls'),
        label: (e.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 30),
      }))
    );
  }

  /** Icon vs question geometry inside the active panel. */
  async iconAlignment(panelIndex = 0, index = 0) {
    return this.items(panelIndex, index).evaluateAll((els) =>
      els.map((it, i) => {
        const icon = it.querySelector('.faq-item__icon-wrap');
        const head = it.querySelector('.faq-heading');
        if (!icon || !head) return null;
        const ir = icon.getBoundingClientRect();
        const hr = head.getBoundingClientRect();
        return {
          q: i + 1,
          offsetY: Math.abs((ir.top + ir.height / 2) - (hr.top + hr.height / 2)),
          iconRight: ir.right,
          headLeft: hr.left,
        };
      }).filter(Boolean)
    );
  }

  /** Toggle a question inside a panel, waiting for it to settle. */
  async toggleQuestion(panelIndex, n, index = 0) {
    const item = this.items(panelIndex, index).nth(n);
    const was = await item.evaluate((el) => el.hasAttribute('open'));
    await this.triggers(panelIndex, index).nth(n).click();

    const started = Date.now();
    while (Date.now() - started < 4000) {
      if ((await item.evaluate((el) => el.hasAttribute('open'))) !== was) break;
      await this.page.waitForTimeout(100);
    }
    // Let the one-at-a-time close finish too.
    let previous = null, unchangedSince = Date.now();
    while (Date.now() - started < 6000) {
      const current = (await this.openPerPanel(index)).join(',');
      if (current !== previous) { previous = current; unchangedSince = Date.now(); }
      else if (Date.now() - unchangedSince >= 700) break;
      await this.page.waitForTimeout(120);
    }
  }
}

export default FaqTabsPage;
