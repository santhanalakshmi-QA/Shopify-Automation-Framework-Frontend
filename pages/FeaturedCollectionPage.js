// pages/FeaturedCollectionPage.js
// ─────────────────────────────────────────────────────────────
// Page Object for the featured-collection row.
//
// Verified across five instances on three stores:
//
//              cards   price       swatches
//   khajal[0]  8       yes         no
//   khajal[1]  15      yes*        no
//   doll[0]    4       yes         no
//   moonlight  16, 16  NONE        yes
//
//   * present in the markup, but 10 of the 15 render at zero height.
//
// Two structural traps, both found by inspection rather than guessed:
//
//  1. Every card holds TWO anchors to the same product — the image
//     link, which has no text, and the title link, which has it.
//     Reading "the first product link" returns an empty title.
//
//  2. khajal nests a SECOND swiper inside each card for its image
//     thumbnails. So `.swiper` within this section is ambiguous, and
//     the product carousel is identified by the slides it contains.
// ─────────────────────────────────────────────────────────────

import { BasePage } from './BasePage.js';
import { rootSelector } from '../utils/simple-sections.js';

export class FeaturedCollectionPage extends BasePage {

  constructor(page, preset = null) {
    super(page, preset);
    this.f = this.locators.featuredCollection;
    this.rootSel = rootSelector('featured_collection');
  }

  // ── Getters ─────────────────────────────────────────────────

  roots()         { return this.page.locator(this.rootSel); }
  root(index = 0) { return this.roots().nth(index); }

  cards(index = 0)     { return this.root(index).locator(this.f.card); }
  card(n, index = 0)   { return this.cards(index).nth(n); }
  titles(index = 0)    { return this.root(index).locator(this.f.titleLink); }
  vendors(index = 0)   { return this.root(index).locator(this.f.vendor); }
  prices(index = 0)    { return this.root(index).locator(this.f.price); }
  images(index = 0)    { return this.root(index).locator(this.f.image); }
  swatches(index = 0)  { return this.root(index).locator(this.f.swatches); }
  carousel(index = 0)  { return this.root(index).locator(this.f.carousel).first(); }
  nextArrow(index = 0) { return this.carousel(index).locator(this.f.nextArrow).first(); }

  /**
   * Is the next arrow actually usable? Swiper adds
   * .swiper-button-disabled when there is nothing further to scroll —
   * doll's row of 4 fits on screen, so its arrow is present but inert.
   * Clicking it and expecting movement would be testing nothing.
   */
  async canAdvance(index = 0) {
    const arrow = this.nextArrow(index);
    if (!(await arrow.count())) return false;
    return arrow.evaluate((el) =>
      el.getBoundingClientRect().width > 0 && !el.classList.contains('swiper-button-disabled')
    );
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

  // ── Queries ─────────────────────────────────────────────────

  async instanceCount()      { return this.roots().count(); }
  async cardCount(index = 0) { return this.cards(index).count(); }

  /**
   * One record per card: everything the checks need, read in a single
   * pass so a 16-card row costs one round trip rather than sixteen.
   */
  async cardData(index = 0) {
    return this.cards(index).evaluateAll((els) =>
      els.map((card, i) => {
        const titleEl = card.querySelector('.product-title a');
        const priceEl = card.querySelector('.product-price');
        const nowEl = card.querySelector('.product-price__current');
        const img = card.querySelector('.product-card__img');
        const link = card.querySelector('a[href*="/products/"]');

        return {
          n: i + 1,
          title: (titleEl?.textContent ?? '').trim().replace(/\s+/g, ' '),
          href: link?.getAttribute('href') ?? null,
          vendor: (card.querySelector('.product-vendor')?.textContent ?? '').trim(),

          // Price is checked in three separate ways because it fails in
          // three different ways across these stores: absent entirely,
          // present but zero-height, present but empty.
          hasPriceEl: !!priceEl,
          priceVisible: !!priceEl && priceEl.getBoundingClientRect().height > 0,
          priceText: (nowEl?.textContent ?? '').trim(),

          hasImage: !!img,
          imgAlt: img?.getAttribute('alt') ?? null,
          imgBroken: !!img && img.complete && img.naturalWidth === 0,
          badges: card.querySelectorAll('.product-card__badge').length,
          swatches: card.querySelectorAll('.product-card__swatch').length,
        };
      })
    );
  }

  /** Products linked from this row, de-duplicated. */
  async productHrefs(index = 0) {
    return this.cards(index).evaluateAll((els) =>
      [...new Set(
        els.map((c) => c.querySelector('a[href*="/products/"]')?.getAttribute('href')).filter(Boolean)
      )]
    );
  }

  async carouselState(index = 0) {
    return this.carousel(index).evaluate((el) => {
      const sw = el.swiper;
      if (!sw) return null;
      return { realIndex: sw.realIndex, loop: !!sw.params?.loop, slides: sw.slides?.length ?? 0 };
    }).catch(() => null);
  }

  async clickNext(index = 0) {
    await this.nextArrow(index).click();
    await this.page.waitForTimeout(900);
  }

  /**
   * Misspelled class names shipped by the theme. `.swatch_contaier`
   * (sic) appears on khajal and moonlight. Harmless to look at, but
   * any stylesheet targeting the correctly-spelled name silently
   * matches nothing — so it is worth catching once rather than
   * debugging later.
   */
  async misspelledClasses(index = 0) {
    return this.root(index).evaluate((el) => {
      const known = { swatch_contaier: 'swatch_container' };
      const out = [];
      for (const [wrong, right] of Object.entries(known)) {
        const n = el.querySelectorAll(`.${wrong}`).length;
        if (n) out.push(`.${wrong} x${n}  (should be .${right})`);
      }
      return out;
    });
  }
}

export default FeaturedCollectionPage;
