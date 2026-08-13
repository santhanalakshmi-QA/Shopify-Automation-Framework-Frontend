// pages/CollectionListPage.js
// ─────────────────────────────────────────────────────────────
// Page Object for the home-page collection-list section.
//
// Third section on this framework, and the first that appears on TWO
// stores — so it is also the first real test of whether the capability
// manifest earns its keep. khajal and doll differ a lot:
//
//              khajal            doll
//   cards      10                4
//   heading    none              "Shop by age"
//   counts     "5 Items"         none
//   arrows     visible           present but hidden
//   loop       on                off
//   autoplay   ON                off
//
// None of that is branched on in the page object — it all lives in
// data/presets.json and gates the checks.
//
// The carousel is Swiper again, same as the slideshow, so the same
// realIndex-based waiting applies: with loop enabled Swiper rotates
// slides through the DOM, and watching a DOM position never sees a
// change.
// ─────────────────────────────────────────────────────────────

import { BasePage } from './BasePage.js';

export class CollectionListPage extends BasePage {

  constructor(page, preset = null) {
    super(page, preset);
    this.c = this.locators.collectionList;
  }

  // ── Section getters ─────────────────────────────────────────

  sections()         { return this.page.locator(this.c.section); }
  section(index = 0) { return this.sections().nth(index); }

  // ── Content getters, scoped to one section ──────────────────

  heading(index = 0)  { return this.section(index).locator(this.c.heading).first(); }
  cards(index = 0)    { return this.section(index).locator(this.c.card); }
  cardAt(n, index = 0){ return this.cards(index).nth(n); }
  titleLinks(index = 0){ return this.section(index).locator(this.c.titleLink); }
  imageLinks(index = 0){ return this.section(index).locator(this.c.imageLink); }
  images(index = 0)   { return this.section(index).locator(this.c.image); }
  itemCounts(index = 0){ return this.section(index).locator(this.c.itemCount); }
  nextArrow(index = 0){ return this.section(index).locator(this.c.nextArrow).first(); }
  prevArrow(index = 0){ return this.section(index).locator(this.c.prevArrow).first(); }

  // ── Actions ─────────────────────────────────────────────────

  async open() {
    await this.gotoHome();
    await this.section().waitFor({ state: 'visible', timeout: 30_000 });
    // Sits well down the page; see BasePage for why a plain
    // scrollIntoView is not enough on this theme.
    await this.scrollSectionIntoView(this.section());
  }

  // ── Swiper introspection ────────────────────────────────────
  // Read the live config rather than assume it: khajal loops and
  // autoplays, doll does neither.

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
          slidesPerView: sw.params?.slidesPerView ?? null,
          realIndex: sw.realIndex,
        };
      });
  }

  async realIndex(index = 0) {
    return (await this.swiperState(index))?.realIndex ?? -1;
  }

  // Loop-safe: watches Swiper's realIndex, not a DOM position.
  async waitForIndexChange(index, before, timeout = 10_000) {
    await this.page.waitForFunction(
      ({ sectionSel, idx, prev }) => {
        const sec = document.querySelectorAll(sectionSel)[idx];
        const sw = sec?.querySelector('.swiper')?.swiper;
        return sw ? sw.realIndex !== prev : false;
      },
      { sectionSel: this.c.section, idx: index, prev: before },
      { timeout }
    );
    return this.realIndex(index);
  }

  // Halt the autoplay timer for tests that drive the carousel by hand.
  //
  // Without this, khajal's autoplay advances the carousel between a
  // next() and a prev() and the "did it return to the start" check
  // fails intermittently — a race against the theme, not a defect.
  // The autoplay behaviour itself is covered separately by CL-AUTO-*.
  async stopAutoplay(index = 0) {
    await this.section(index)
      .locator('.swiper')
      .first()
      .evaluate((el) => el.swiper?.autoplay?.stop?.())
      .catch(() => {
        /* no autoplay on this preset */
      });
  }

  async goToNext(index = 0) {
    const before = await this.realIndex(index);
    await this.nextArrow(index).click();
    return this.waitForIndexChange(index, before);
  }

  async goToPrev(index = 0) {
    const before = await this.realIndex(index);
    await this.prevArrow(index).click();
    return this.waitForIndexChange(index, before);
  }

  // ── Queries ─────────────────────────────────────────────────

  async sectionCount() { return this.sections().count(); }
  async cardCount(index = 0) { return this.cards(index).count(); }

  async hasVisibleArrows(index = 0) {
    return (await this.nextArrow(index).isVisible().catch(() => false));
  }

  // Collection titles in DOM order.
  async titles(index = 0) {
    return this.titleLinks(index).evaluateAll((els) =>
      els.map((a) => (a.textContent ?? '').trim())
    );
  }

  // Every distinct /collections/ destination the section links to.
  async collectionHrefs(index = 0) {
    const hrefs = await this.section(index)
      .locator('a[href*="/collections/"]')
      .evaluateAll((els) => els.map((a) => a.getAttribute('href')));
    return [...new Set(hrefs.filter(Boolean))];
  }

  // Accessible name of a control, however the theme supplies it.
  async accessibleName(locator) {
    return (
      (await locator.getAttribute('aria-label')) ??
      (await locator.getAttribute('title')) ??
      (await locator.innerText().catch(() => '')) ??
      ''
    );
  }
}

export default CollectionListPage;
