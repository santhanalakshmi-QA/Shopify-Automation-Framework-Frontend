// pages/ComparisonSliderPage.js
// ─────────────────────────────────────────────────────────────
// One page object for both comparison-slider sections.
//
//   image_comparison  dense      5 sliders, profile thumbnails
//   before_after      moonlight  3 sliders, each selling a product
//
// They are different section types with different class prefixes but
// exactly the same mechanic: two images stacked, and a divider you
// drag left and right to reveal more of the one underneath. So the
// object is constructed with whichever locator set applies:
//
//     new ComparisonSliderPage(page, preset, 'imageComparison')
//
// Dragging is the whole point of these sections, and it is the part a
// screenshot can never verify. A slider that renders perfectly but
// does not move leaves the shopper looking at one image, unaware
// there is a second one behind it.
// ─────────────────────────────────────────────────────────────

import { BasePage } from './BasePage.js';
import { rootSelector } from '../utils/simple-sections.js';

export class ComparisonSliderPage extends BasePage {

  /** @param kind 'imageComparison' | 'beforeAfter' */
  constructor(page, preset, kind) {
    super(page, preset);
    this.kind = kind;
    this.c = this.locators[kind];
    this.type = kind === 'imageComparison' ? 'image_comparison' : 'before_after';
    this.rootSel = rootSelector(this.type);
  }

  // ── Getters ─────────────────────────────────────────────────

  roots()         { return this.page.locator(this.rootSel); }
  root(index = 0) { return this.roots().nth(index); }

  sliders(index = 0)   { return this.root(index).locator(this.c.slider); }
  slider(n, index = 0) { return this.sliders(index).nth(n); }
  dividers(index = 0)  { return this.root(index).locator(this.c.divider); }
  images(index = 0)    { return this.root(index).locator('img'); }
  labels(index = 0)    { return this.root(index).locator(this.c.label); }
  roleSliders(index = 0) { return this.root(index).locator(this.c.role); }

  // ── Actions ─────────────────────────────────────────────────

  async open() {
    await this.gotoHome();
    await this.root().waitFor({ state: 'attached', timeout: 30_000 });
    await this.focus(0);
  }

  async focus(index = 0) {
    await this.scrollSectionIntoView(this.root(index));
    await this.page.waitForTimeout(800);
  }

  /**
   * Drag the nth divider by `dx` pixels and report where it ended up.
   *
   * Uses real mouse events rather than setting a style, because the
   * point is to prove the section responds to a shopper's drag. A
   * slider driven only by JavaScript state would pass a style check
   * and still be broken under a finger.
   */
  handles(index = 0) { return this.root(index).locator(this.c.handle); }

  async dragDivider(n, dx, index = 0) {
    // Drag the HANDLE, and measure the DIVIDER.
    //
    // The two are different elements and it matters: the divider is
    // decorative and carries pointer-events:none, so dragging it can
    // never do anything on either section. The theme binds its drag to
    // [data-before-after-handle]. Measuring the divider's computed
    // `left` is the honest read of where the slider ended up, because
    // that is the property the theme moves.
    const handle = this.handles(index).nth(n);
    const divider = this.dividers(index).nth(n);
    await handle.scrollIntoViewIfNeeded().catch(() => {});
    await this.page.waitForTimeout(400);

    const readLeft = () =>
      divider.evaluate((el) => parseFloat(getComputedStyle(el).left) || 0).catch(() => 0);
    const leftBefore = await readLeft();

    const before = await handle.boundingBox();
    if (!before) return null;

    const y = before.y + before.height / 2;
    const startX = before.x + before.width / 2;

    // Playwright mouse events are real browser input: on a
    // touch-emulating project it dispatches touch alongside them. So
    // this one path represents what a shopper actually does.
    //
    // An earlier version added a JavaScript-synthesised touch
    // fallback when the mouse produced no movement. That was wrong:
    // dispatching touchstart/touchmove straight at the element proves
    // only that the handler exists, not that a finger or pointer can
    // reach it — and it turned a consistent, reproducible failure into
    // one that passed on two projects out of four.
    await this.page.mouse.move(startX, y);
    await this.page.mouse.down();
    for (const step of [0.25, 0.5, 0.75, 1]) {
      await this.page.mouse.move(startX + dx * step, y, { steps: 4 });
      await this.page.waitForTimeout(80);
    }
    await this.page.mouse.up();
    await this.page.waitForTimeout(800);

    const leftAfter = await readLeft();
    return {
      before: Math.round(leftBefore),
      after: Math.round(leftAfter),
      moved: Math.round(leftAfter - leftBefore),
      requested: dx,
    };
  }

  // ── Queries ─────────────────────────────────────────────────

  async sliderCount(index = 0)  { return this.sliders(index).count(); }
  async dividerCount(index = 0) { return this.dividers(index).count(); }

  async labelTexts(index = 0) {
    return this.labels(index).evaluateAll((els) =>
      els.map((e) => (e.textContent ?? '').trim())
    );
  }

  async imageData(index = 0) {
    return this.images(index).evaluateAll((els) =>
      els.map((img, i) => ({
        n: i + 1,
        alt: img.getAttribute('alt'),
        cls: String(img.className).trim().split(/\s+/)[0] ?? '',
        src: (img.getAttribute('src') ?? '').split('/').pop()?.split('?')[0] ?? '',
        broken: img.complete && img.naturalWidth === 0,
      }))
    );
  }

  /**
   * What each role="slider" element declares to assistive technology.
   *
   * The role is a promise: "this is a slider, here is its current
   * value, and here are its bounds". Declaring the role and then
   * omitting the value leaves a screen reader announcing "slider"
   * with nothing to say about where it sits or how to move it.
   */
  async sliderSemantics(index = 0) {
    return this.roleSliders(index).evaluateAll((els) =>
      els.map((e, i) => ({
        n: i + 1,
        role: e.getAttribute('role'),
        valueNow: e.getAttribute('aria-valuenow'),
        valueMin: e.getAttribute('aria-valuemin'),
        valueMax: e.getAttribute('aria-valuemax'),
        label: (e.getAttribute('aria-label') ?? '').trim(),
        tabindex: e.getAttribute('tabindex'),
        focusable: e.tabIndex >= 0,
      }))
    );
  }

  async linkHrefs(index = 0) {
    return this.root(index).locator('a').evaluateAll((els) =>
      els.map((a) => ({
        href: a.getAttribute('href'),
        text: (a.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 30),
      }))
    );
  }

  /** before_after only: the add-to-cart buttons under each slider. */
  async atcButtons(index = 0) {
    if (this.kind !== 'beforeAfter') return [];
    return this.root(index).locator(this.c.atc).evaluateAll((els) =>
      els.map((e, i) => ({
        n: i + 1,
        text: (e.textContent ?? '').trim().replace(/\s+/g, ' '),
        ariaLabel: (e.getAttribute('aria-label') ?? '').trim(),
        disabled: e.hasAttribute('disabled'),
      }))
    );
  }
}

export default ComparisonSliderPage;
