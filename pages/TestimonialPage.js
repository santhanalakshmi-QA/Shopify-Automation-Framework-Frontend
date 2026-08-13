// pages/TestimonialPage.js
// ─────────────────────────────────────────────────────────────
// Page Object for the home-page testimonial section.
//
// Fourth section, and the first that appears on ALL FOUR stores — and
// the first where a preset ships the section TWICE (dense has two).
// That is why nearly everything here takes a section index: the page
// object addresses "the nth testimonial section", and the spec loops
// over however many the manifest declares.
//
// Content differs sharply between stores while the markup does not:
//
//              khajal   doll   dense    moonlight
//   sections   1        1      2        1
//   cards      7        5      4 + 4    6
//   images     yes      NO     yes      yes
//   author     NO       yes    yes      yes
//   arrows     no       no     no       yes
//
// None of that is branched on here — it is declared in presets.json.
// ─────────────────────────────────────────────────────────────

import { BasePage } from './BasePage.js';

export class TestimonialPage extends BasePage {

  constructor(page, preset = null) {
    super(page, preset);
    this.t = this.locators.testimonials;
  }

  // ── Section getters ─────────────────────────────────────────

  sections()         { return this.page.locator(this.t.section); }
  section(index = 0) { return this.sections().nth(index); }

  // ── Card getters, scoped to one section ─────────────────────

  cards(index = 0)      { return this.section(index).locator(this.t.card); }
  cardAt(n, index = 0)  { return this.cards(index).nth(n); }
  images(index = 0)     { return this.section(index).locator(this.t.image); }
  ratings(index = 0)    { return this.section(index).locator(this.t.ratingStars); }
  nextArrow(index = 0)  { return this.section(index).locator(this.t.nextArrow).first(); }
  prevArrow(index = 0)  { return this.section(index).locator(this.t.prevArrow).first(); }

  // Quotes and authors live INSIDE cards; the section heading uses the
  // same "__heading" fragment, so card-scoping is what separates them.
  quotes(index = 0)  { return this.cards(index).locator(this.t.quote); }
  authors(index = 0) { return this.cards(index).locator(this.t.author); }

  // The section's own heading — the one that is not inside any card.
  sectionHeading(index = 0) {
    return this.section(index)
      .locator(`${this.t.quote}:not(${this.t.card} ${this.t.quote})`)
      .first();
  }

  // ── Actions ─────────────────────────────────────────────────

  async open() {
    await this.gotoHome();
    await this.section().waitFor({ state: 'visible', timeout: 30_000 });
    await this.scrollSectionIntoView(this.section());
  }

  // Bring the nth section into view — needed when a preset ships more
  // than one and the spec walks them.
  async focusSection(index = 0) {
    await this.scrollSectionIntoView(this.section(index));
  }

  // ── Queries ─────────────────────────────────────────────────

  async sectionCount() { return this.sections().count(); }
  async cardCount(index = 0) { return this.cards(index).count(); }

  async swiperState(index = 0) {
    return this.section(index)
      .locator('.swiper')
      .first()
      .evaluate((el) => {
        const sw = el.swiper;
        if (!sw) return null;
        return {
          loop: !!sw.params?.loop,
          autoplayEnabled: !!sw.params?.autoplay?.enabled,
          autoplayDelay: sw.params?.autoplay?.delay ?? null,
          realIndex: sw.realIndex,
        };
      });
  }

  async realIndex(index = 0) {
    return (await this.swiperState(index))?.realIndex ?? -1;
  }

  async hasVisibleArrows(index = 0) {
    return this.nextArrow(index).isVisible().catch(() => false);
  }

  // Star ratings are exposed to assistive tech as "Rating: 4.5 out of 5"
  // — there is no visible number, so the aria-label IS the value.
  async ratingLabels(index = 0) {
    return this.ratings(index).evaluateAll((els) =>
      els.map((e) => (e.getAttribute('aria-label') ?? '').trim())
    );
  }

  // Parse those labels into numbers, or null where unparseable.
  async ratingValues(index = 0) {
    const labels = await this.ratingLabels(index);
    return labels.map((l) => {
      const m = l.match(/([\d.]+)\s*out of\s*([\d.]+)/i);
      return m ? { value: Number(m[1]), outOf: Number(m[2]) } : null;
    });
  }

  // Full visible text of each card, with <style>/<script> stripped —
  // those sit inside the card body and would otherwise be picked up as
  // "content".
  //
  // Used instead of the quote block for duplicate detection, because
  // which block holds the quote is NOT consistent between presets:
  // doll puts the quote in "__heading" and the author in
  // "__description"; dense puts a headline in "__heading" and the quote
  // in "__description". Comparing whole cards sidesteps that entirely.
  async cardTexts(index = 0) {
    return this.cards(index).evaluateAll((els) =>
      els.map((el) => {
        const clone = el.cloneNode(true);
        clone.querySelectorAll('style, script').forEach((n) => n.remove());
        return (clone.textContent ?? '').trim().replace(/\s+/g, ' ');
      })
    );
  }

  async quoteTexts(index = 0) {
    return this.quotes(index).evaluateAll((els) =>
      els.map((e) => (e.textContent ?? '').trim().replace(/\s+/g, ' '))
    );
  }

  async authorTexts(index = 0) {
    return this.authors(index).evaluateAll((els) =>
      els.map((e) => (e.textContent ?? '').trim().replace(/\s+/g, ' '))
    );
  }
}

export default TestimonialPage;
