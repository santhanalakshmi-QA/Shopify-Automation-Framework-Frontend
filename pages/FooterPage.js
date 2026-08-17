// pages/FooterPage.js
// ─────────────────────────────────────────────────────────────
// Page Object for the site footer.
//
// Like the header, the footer is a GLOBAL region rather than a
// home-page section: it is present on every preset and is not listed
// in `sections`, so the spec never gates on section counts — only on
// the `footer` capability block in data/presets.json.
//
// Verified layout, identical markup on all four stores:
//
//              khajal   doll   dense   moonlight
//   columns    3        3      3       3
//   links      5/5/5    6/6/6  3/3/3   7/7/7
//   newsletter yes      NO     yes     yes
//   social     NO       4      NO      NO
//   brand logo NO       yes    yes     NO
//
// Two structural details worth knowing:
//
//  1. Columns are native <details>/<summary>. On desktop they render
//     open; below the breakpoint they collapse to accordions. So
//     "is this column open" is the `open` attribute, never a class.
//
//  2. Block-scoped classes carry a generated suffix, e.g.
//     `footer-menu__list-AV05Ba...__footer_menu_2`. Every selector
//     here matches the stable BEM root only.
// ─────────────────────────────────────────────────────────────

import { BasePage } from './BasePage.js';

export class FooterPage extends BasePage {

  constructor(page, preset = null) {
    super(page, preset);
    this.f = this.locators.footer;
  }

  // ── Root ────────────────────────────────────────────────────

  root()  { return this.page.locator(this.f.root); }
  inner() { return this.root().locator(this.f.inner); }

  // ── Link columns ────────────────────────────────────────────

  columns()          { return this.root().locator(this.f.menu); }
  column(i = 0)      { return this.columns().nth(i); }
  columnTitles()     { return this.root().locator(this.f.menuTitle); }
  columnLinks(i = 0) { return this.column(i).locator(this.f.menuLink); }
  allLinks()         { return this.root().locator(this.f.menuLink); }

  // Accordion machinery
  details(i = 0)  { return this.column(i).locator(this.f.menuDetails).first(); }
  summary(i = 0)  { return this.column(i).locator(this.f.menuSummary).first(); }

  // ── Brand block ─────────────────────────────────────────────

  brandBlocks()  { return this.root().locator(this.f.brandBlock); }
  brandLogoImg() { return this.root().locator(this.f.brandLogoImg); }

  // ── Social ──────────────────────────────────────────────────

  socialLinks() { return this.root().locator(this.f.socialLink); }

  // ── Newsletter ──────────────────────────────────────────────

  newsletterForm()   { return this.root().locator(this.f.newsletterForm); }
  newsletterInput()  { return this.root().locator(this.f.newsletterInput); }
  newsletterSubmit() { return this.root().locator(this.f.newsletterSubmit); }

  // ── Actions ─────────────────────────────────────────────────

  async open() {
    await this.gotoHome();
    await this.root().waitFor({ state: 'visible', timeout: 30_000 });
    await this.scrollToFooter();
  }

  // The footer only lays out correctly once it is actually on screen
  // (lazy images, sticky offsets), so every check scrolls first.
  async scrollToFooter() {
    await this.page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })
    );
    await this.page.waitForTimeout(600);
  }

  // ── Queries ─────────────────────────────────────────────────

  async columnCount() { return this.columns().count(); }

  async linksPerColumn() {
    const total = await this.columnCount();
    const counts = [];
    for (let i = 0; i < total; i++) counts.push(await this.columnLinks(i).count());
    return counts;
  }

  async titleTexts() {
    return this.columnTitles().evaluateAll((els) =>
      els.map((e) => (e.textContent ?? '').trim().replace(/\s+/g, ' '))
    );
  }

  /** Is the nth column's <details> currently open? */
  async isColumnOpen(i = 0) {
    return this.details(i).evaluate((el) => el.hasAttribute('open'));
  }

  /** Click a column heading and report whether it toggled. */
  async toggleColumn(i = 0) {
    const before = await this.isColumnOpen(i);
    await this.summary(i).click();
    await this.page.waitForTimeout(500);
    return { before, after: await this.isColumnOpen(i) };
  }

  async linkHrefs() {
    return this.allLinks().evaluateAll((els) =>
      els.map((a) => ({
        text: (a.textContent ?? '').trim().replace(/\s+/g, ' '),
        href: a.getAttribute('href'),
      }))
    );
  }

  async socialHrefs() {
    return this.socialLinks().evaluateAll((els) =>
      els.map((a) => ({
        href: a.getAttribute('href'),
        label: (a.getAttribute('aria-label') ?? a.title ?? '').trim(),
      }))
    );
  }

  // ── Geometry (alignment checks) ─────────────────────────────

  /** Bounding box of every column heading. */
  async titleBoxes() {
    return this.columnTitles().evaluateAll((els) =>
      els.map((e) => {
        const b = e.getBoundingClientRect();
        return { top: b.top, left: b.left, width: b.width, height: b.height };
      })
    );
  }

  /** Bounding box of every column. */
  async columnBoxes() {
    return this.columns().evaluateAll((els) =>
      els.map((e) => {
        const b = e.getBoundingClientRect();
        return { top: b.top, left: b.left, width: b.width, height: b.height };
      })
    );
  }

  /**
   * The distinct left edges of the links inside one column, rounded.
   * A tidy column produces exactly ONE value — anything more means the
   * links are not flush with each other.
   */
  async linkLeftEdges(i = 0) {
    return this.columnLinks(i).evaluateAll((els) =>
      [...new Set(els.map((e) => Math.round(e.getBoundingClientRect().left)))]
    );
  }

  /**
   * Is the submit control centred inside the email field? The button is
   * absolutely positioned over the input's right edge, so a change to
   * either one's height knocks it off centre without anything else
   * looking wrong.
   */
  async newsletterButtonAlignment() {
    const input = await this.newsletterInput().first().boundingBox();
    const btn = await this.newsletterSubmit().first().boundingBox();
    if (!input || !btn) return null;
    const style = await this.newsletterSubmit().first().evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        textAlign: s.textAlign,
        justifyContent: s.justifyContent,
        alignItems: s.alignItems,
        // The theme uses `position-md-absolute`: the button only sits
        // INSIDE the field from the md breakpoint up. Below that it is
        // static and sits beside the field. Verified on the live
        // stores — so "is it inside" is only a fair question when the
        // overlay layout is actually active.
        position: s.position,
      };
    });
    // The theme lays this control out THREE different ways, all
    // intentional and all verified on the live stores:
    //
    //   overlay   button absolutely positioned inside the field (desktop)
    //   inline    button beside the field, sharing its row  (khajal/moonlight mobile)
    //   stacked   button on its own line below the field     (dense mobile)
    //
    // Each needs a different alignment question asked of it, so the
    // arrangement is reported rather than assumed.
    const sameRow = Math.abs(input.y - btn.y) <= 2;
    const layout = style.position === 'absolute' ? 'overlay' : sameRow ? 'inline' : 'stacked';

    return {
      layout,
      inputCentreY: input.y + input.height / 2,
      buttonCentreY: btn.y + btn.height / 2,
      /** Vertical centre offset — only meaningful for overlay/inline. */
      offset: Math.abs((input.y + input.height / 2) - (btn.y + btn.height / 2)),
      /** Left-edge offset — the meaningful one when stacked. */
      leftOffset: Math.abs(input.x - btn.x),
      insideInput: btn.x >= input.x - 2 && btn.x + btn.width <= input.x + input.width + 2,
      ...style,
    };
  }

  /**
   * Footer text that is being clipped by its own box — i.e. the
   * rendered content is wider than the space it is given, so the end
   * is cut off rather than wrapped.
   */
  async clippedText() {
    return this.root().evaluate((foot) => {
      const out = [];
      const targets = foot.querySelectorAll('.footer-menu__title, a.footer-menu__link');
      for (const el of targets) {
        if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
          out.push(`"${(el.textContent ?? '').trim().slice(0, 30)}" ${el.scrollWidth}px in ${el.clientWidth}px`);
        }
      }
      return out;
    });
  }

  // ── Newsletter validation ───────────────────────────────────

  /** Field attributes that drive browser-native validation. */
  async newsletterFieldAttrs() {
    return this.newsletterInput().first().evaluate((el) => ({
      required: el.hasAttribute('required'),
      type: el.type,
      autocomplete: el.getAttribute('autocomplete'),
    }));
  }

  /**
   * Type `value` into the email field and report whether the browser
   * considers it submittable. Uses checkValidity() rather than clicking
   * submit, so nothing is ever actually posted to the store.
   */
  async emailValidity(value) {
    return this.newsletterInput().first().evaluate((el, val) => {
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return { valid: el.checkValidity(), message: el.validationMessage };
    }, value);
  }

  /**
   * Raw Liquid that reached the browser — `{{ ... }}` or `{% ... %}`
   * left in an attribute or in visible text means the theme failed to
   * render it. Confirmed present on three presets in the newsletter
   * form's class attribute.
   */
  async liquidLeaks() {
    return this.root().evaluate((el) => {
      const leaks = [];
      for (const node of el.querySelectorAll('*')) {
        for (const attr of node.attributes) {
          if (/\{\{|\{%/.test(attr.value)) {
            leaks.push(`<${node.tagName.toLowerCase()} ${attr.name}="${attr.value}">`);
          }
        }
      }
      const clone = el.cloneNode(true);
      clone.querySelectorAll('style, script').forEach((n) => n.remove());
      const text = (clone.textContent ?? '');
      if (/\{\{|\{%/.test(text)) {
        leaks.push(`visible text: ${(text.match(/.{0,30}(\{\{|\{%).{0,30}/) ?? [''])[0]}`);
      }
      return leaks;
    });
  }
}

export default FooterPage;
