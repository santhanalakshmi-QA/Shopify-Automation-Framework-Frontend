// pages/RichTextPage.js
// ─────────────────────────────────────────────────────────────
// Page Object for the home-page rich-text section.
//
// Second section built on this framework, and deliberately so: it is
// the proof that the shared pieces generalise. It reuses BasePage,
// the preset fixtures, the section manifest and the assertion helpers
// unchanged — the only section-specific parts are the locators below
// and the copy-to-clipboard behaviour.
//
// On the Khajal presets this section is a promo banner: a line of copy,
// a discount code, and a button that copies the code. That copy button
// is the only real interaction, so it is where the behaviour tests are.
// ─────────────────────────────────────────────────────────────

import { BasePage } from './BasePage.js';

export class RichTextPage extends BasePage {

  constructor(page, preset = null) {
    super(page, preset);
    this.r = this.locators.richText;
  }

  // ── Section getters ─────────────────────────────────────────

  sections()         { return this.page.locator(this.r.section); }
  section(index = 0) { return this.sections().nth(index); }

  // ── Content getters, scoped to one section ──────────────────

  heading(index = 0)  { return this.section(index).locator(this.r.heading).first(); }
  body(index = 0)     { return this.section(index).locator(this.r.body); }
  links(index = 0)    { return this.section(index).locator('a'); }

  codeBox(index = 0)     { return this.section(index).locator(this.r.codeBox).first(); }
  codeText(index = 0)    { return this.section(index).locator(this.r.codeText).first(); }
  copyButton(index = 0)  { return this.section(index).locator(this.r.copyButton).first(); }
  defaultState(index = 0){ return this.section(index).locator(this.r.stateDefault).first(); }
  successState(index = 0){ return this.section(index).locator(this.r.stateSuccess).first(); }

  // ── Actions ─────────────────────────────────────────────────

  async open() {
    await this.gotoHome();
    await this.section().waitFor({ state: 'visible', timeout: 30_000 });

    // Bring it on screen — it sits ~4700px down the page, so without
    // this a headed run just shows the top and you never see what is
    // being tested. See BasePage.scrollSectionIntoView for why a plain
    // scrollIntoView is not enough here.
    await this.scrollSectionIntoView(this.section());
  }

  // ── Queries ─────────────────────────────────────────────────

  async sectionCount() {
    return this.sections().count();
  }

  async hasCopyCode(index = 0) {
    return (await this.copyButton(index).count()) > 0;
  }

  // The discount code as rendered, trimmed.
  async code(index = 0) {
    return ((await this.codeText(index).textContent()) ?? '').trim();
  }

  // Which of the two copy states is on screen. The theme swaps them by
  // toggling `display`, so visibility is the signal, not a class.
  async copyState(index = 0) {
    const success = await this.successState(index).isVisible().catch(() => false);
    return success ? 'success' : 'default';
  }

  // The alignment modifier the theme applied, e.g. "center" from
  // `rich-text--align-center`. Null when the theme sets none.
  async alignment(index = 0) {
    return this.section(index).evaluate((el) => {
      const cls = [...el.classList].find((c) => /--align-/.test(c));
      return cls ? cls.split('--align-')[1] : null;
    });
  }

  // What the browser clipboard holds. Needs clipboard permissions on
  // the context, which the spec grants before calling this.
  async clipboardText() {
    return this.page.evaluate(async () => {
      try {
        return await navigator.clipboard.readText();
      } catch {
        return null;
      }
    });
  }

  async copyCode(index = 0) {
    await this.copyButton(index).click();
    await this.page.waitForTimeout(600); // state swap + clipboard write
  }
}

export default RichTextPage;
