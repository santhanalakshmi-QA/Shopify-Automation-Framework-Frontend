// pages/SimpleSectionPage.js
// ─────────────────────────────────────────────────────────────
// One page object for ELEVEN home-page sections.
//
// The sections in utils/simple-sections.js present content without
// interactive state — brand logos, a marquee, stat counters, icon
// rows, banners, galleries. They differ in what they contain, not in
// how you address them, so a single generic object serves all of
// them rather than eleven near-identical files.
//
// It is constructed with a section descriptor:
//
//     new SimpleSectionPage(page, preset, { type: 'image_gallery',
//                                           prefix: 'IG',
//                                           item: '.gallery-card' })
//
// Everything below is scoped to that descriptor, so the same methods
// mean "the gallery tiles" or "the stat cards" depending on what it
// was given.
// ─────────────────────────────────────────────────────────────

import { BasePage } from './BasePage.js';
import { rootSelector } from '../utils/simple-sections.js';

export class SimpleSectionPage extends BasePage {

  constructor(page, preset, section) {
    super(page, preset);
    this.section = section;
    this.rootSel = rootSelector(section.type);
  }

  // ── Getters ─────────────────────────────────────────────────

  roots()            { return this.page.locator(this.rootSel); }
  root(index = 0)    { return this.roots().nth(index); }

  /** The repeating unit, or an empty locator for single-block sections. */
  items(index = 0) {
    if (!this.section.item) return this.root(index).locator('__none__');
    return this.root(index).locator(this.section.item);
  }

  images(index = 0)   { return this.root(index).locator('img'); }
  links(index = 0)    { return this.root(index).locator('a'); }
  headings(index = 0) { return this.root(index).locator('h1, h2, h3, h4'); }

  // ── Actions ─────────────────────────────────────────────────

  async open() {
    await this.gotoHome();
    await this.root().waitFor({ state: 'attached', timeout: 30_000 });
    await this.focus(0);
  }

  /**
   * Scroll the nth instance into view. These sections sit below the
   * fold and several lazy-load their images, so nothing is measured
   * until the browser has actually been asked to draw it.
   */
  async focus(index = 0) {
    await this.scrollSectionIntoView(this.root(index));
  }

  // ── Queries ─────────────────────────────────────────────────

  async instanceCount() { return this.roots().count(); }
  async itemCount(index = 0) {
    return this.section.item ? this.items(index).count() : 0;
  }
  async imageCount(index = 0) { return this.images(index).count(); }
  async linkCount(index = 0) { return this.links(index).count(); }

  /** Alt text of every image, in document order. */
  async imageAlts(index = 0) {
    return this.images(index).evaluateAll((els) =>
      els.map((e) => ({
        alt: e.getAttribute('alt'),
        src: (e.getAttribute('src') ?? '').split('/').pop()?.split('?')[0] ?? '',
      }))
    );
  }

  async linkHrefs(index = 0) {
    return this.links(index).evaluateAll((els) =>
      els.map((a) => ({
        text: (a.textContent ?? '').trim().replace(/\s+/g, ' '),
        href: a.getAttribute('href'),
        labelled:
          !!(a.textContent ?? '').trim() ||
          !!a.getAttribute('aria-label') ||
          !!a.getAttribute('title') ||
          !!a.querySelector('img[alt]:not([alt=""])'),
      }))
    );
  }

  /** Text of each repeating item, with style/script stripped. */
  async itemTexts(index = 0) {
    if (!this.section.item) return [];
    return this.items(index).evaluateAll((els) =>
      els.map((el) => {
        const clone = el.cloneNode(true);
        clone.querySelectorAll('style, script').forEach((n) => n.remove());
        return (clone.textContent ?? '').trim().replace(/\s+/g, ' ');
      })
    );
  }

  /** Un-rendered Liquid that reached the browser, in attributes or text. */
  async liquidLeaks(index = 0) {
    return this.root(index).evaluate((el) => {
      const leaks = [];
      for (const node of el.querySelectorAll('*')) {
        for (const attr of node.attributes) {
          if (/\{\{|\{%/.test(attr.value)) {
            leaks.push(`<${node.tagName.toLowerCase()} ${attr.name}="${attr.value.slice(0, 70)}">`);
          }
        }
      }
      const clone = el.cloneNode(true);
      clone.querySelectorAll('style, script').forEach((n) => n.remove());
      const text = clone.textContent ?? '';
      if (/\{\{|\{%/.test(text)) {
        leaks.push(`visible text: ${(text.match(/.{0,30}(\{\{|\{%).{0,30}/) ?? [''])[0]}`);
      }
      return leaks;
    });
  }

  /** Images that failed to decode — the broken-image icon case. */
  async brokenImages(index = 0) {
    return this.images(index).evaluateAll((els) =>
      els
        .filter((e) => e.complete && e.naturalWidth === 0)
        .map((e) => (e.getAttribute('src') ?? '').split('/').pop()?.split('?')[0] ?? '(no src)')
    );
  }
}

export default SimpleSectionPage;
