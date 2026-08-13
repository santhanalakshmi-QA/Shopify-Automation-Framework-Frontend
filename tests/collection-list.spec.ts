// tests/collection-list.spec.ts
// ─────────────────────────────────────────────────────────────
// Collection-list section suite.
//
// Third section on this framework, and the first that runs on TWO
// stores — which makes it the first genuine test of the capability
// manifest. khajal and doll render the same section very differently:
//
//              khajal            doll
//   cards      10                4
//   heading    none              "Shop by age"
//   counts     "5 Items"         none
//   arrows     visible           present but hidden
//   loop       on                off
//   autoplay   ON                off
//
// Not one of those is branched on below. Every difference is declared
// in data/presets.json and gates the checks in playwright.config.ts, so
// each store collects exactly the checks that apply to it.
//
// khajal is also the first preset anywhere with autoplay switched on,
// so CL-AUTO-* actually execute here rather than sitting dormant.
// ─────────────────────────────────────────────────────────────

import { test, expect, sectionCount } from '../utils/fixtures';
import AxeBuilder from '@axe-core/playwright';
import { CollectionListPage } from '../pages/CollectionListPage.js';
import { mountNarrator, spot, spotVerdicts } from '../utils/demo-hud.js';
import { checksFor } from '../utils/slideshow-checks.js';

const SECTION = 'collection_list';

// Shared assertions, CL-prefixed — the same helpers the slideshow and
// rich-text suites use.
const { assertRenderHealth, expectNoMissingTranslations, assertNoDeadOrUnsafeLinks,
        assertNoPageOverflow, assertContentInsideBox } = checksFor('CL');

test.describe('Collection list', () => {
  let cl: CollectionListPage;

  test.skip(
    ({ preset }) => sectionCount(preset, SECTION) === 0,
    'This preset does not ship a collection-list section.'
  );

  test.beforeEach(async ({ page, preset }, testInfo) => {
    cl = new CollectionListPage(page, preset);
    await mountNarrator(page, {
      title: testInfo.title,
      preset: preset.key,
      spotlight: '.collection-list',
    });
    await cl.open();
  });

  // ===========================================================
  // 1. Render & structure
  // ===========================================================
  test.describe('Render & structure', () => {

    test('CL-RENDER-01 — section present, and as many as the manifest declares', async ({ preset }) => {
      await spot(cl.section());
      await expect(
        cl.section(),
        `CL-RENDER-01 / missing: no collection list matched ".collection-list" on ${preset.url}.`
      ).toBeVisible();

      expect(
        await cl.sectionCount(),
        `CL-RENDER-01 / count: the manifest declares ${sectionCount(preset, SECTION)} ` +
          `collection-list section(s) for ${preset.label}.`
      ).toBe(sectionCount(preset, SECTION));
    });

    test('CL-RENDER-02 — the expected number of collection cards', async ({ preset }) => {
      await spot(cl.cards());
      // Expected count comes from the MANIFEST, not from the page. A
      // check that reads both numbers off the live DOM can never fail:
      // a vanished card drops both sides together.
      const expected = preset.collectionList?.cards;
      expect(
        await cl.cardCount(),
        `CL-RENDER-02 / count-mismatch: ${preset.label} should show ${expected} collection ` +
          `card(s). A different number means a collection was added, removed, or failed to ` +
          `render. If the change was intended, update data/presets.json.`
      ).toBe(expected);
    });

    test('CL-RENDER-03 — the section has a real box', async () => {
      await assertRenderHealth(cl.sections(), { minHeight: 80 });
    });

    test('CL-RENDER-04 — no missing translation keys', async () => {
      await spot(cl.section());
      await expectNoMissingTranslations(cl.section());
    });

    test('CL-RENDER-05 — no JS errors on init', async ({ page }) => {
      const errors: string[] = [];
      const failed: string[] = [];
      page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
      page.on('response', (r) => {
        if (r.status() >= 400) failed.push(`[request] ${r.status()} ${r.url()}`);
      });

      await cl.open();
      await page.waitForTimeout(1500);

      const issues = [...errors, ...failed];
      expect(
        issues,
        `CL-RENDER-05 / runtime: the page reported issues attributable to theme code:\n` +
          `  ${issues.join('\n  ')}`
      ).toEqual([]);
    });
  });

  // ===========================================================
  // 2. Card content
  // ===========================================================
  test.describe('Card content', () => {

    test('CL-CONTENT-01 — every card has a visible title', async () => {
      const titles = await cl.titles();

      // A title only counts if it has text AND is actually rendered —
      // text in a zero-size or display:none element is not "visible".
      const rendered = await cl.titleLinks().evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return getComputedStyle(el).visibility !== 'hidden' && r.width > 0 && r.height > 0;
        })
      );
      const verdicts = titles.map((t, i) => t.trim().length > 0 && rendered[i] === true);

      // Green on every title that passed, red on any that did not — so
      // the result is visible per card, not just a tick in the terminal.
      await spotVerdicts(cl.titleLinks(), verdicts);

      const blank = titles.map((t, i) => (t.length === 0 ? i + 1 : null)).filter(Boolean);

      const notRendered = verdicts
        .map((ok, i) => (ok ? null : i + 1))
        .filter((n) => n !== null && !blank.includes(n));
      expect(
        notRendered,
        `CL-CONTENT-01 / hidden-title: card(s) ${notRendered.join(', ')} have title text but ` +
          `it is not rendered — zero size, or hidden by CSS. The shopper sees a picture with ` +
          `no name even though the name exists in the markup.`
      ).toEqual([]);

      expect(
        blank,
        `CL-CONTENT-01 / empty-title: card(s) ${blank.join(', ')} render no collection name. ` +
          `A shopper sees a picture with nothing telling them what it is.`
      ).toEqual([]);

      expect(
        titles.length,
        `CL-CONTENT-01 / missing-titles: found ${titles.length} title link(s) for ` +
          `${await cl.cardCount()} card(s) — some cards have no title at all.`
      ).toBe(await cl.cardCount());
    });

    test('CL-CONTENT-02 — every card links to a collection', async () => {
      await spot(cl.titleLinks());
      const count = await cl.cardCount();
      const bad: string[] = [];

      for (let i = 0; i < count; i++) {
        const href = await cl.titleLinks().nth(i).getAttribute('href');
        if (!href || !href.includes('/collections/')) {
          bad.push(`card ${i + 1}: "${href ?? '(no href)'}"`);
        }
      }

      expect(
        bad,
        `CL-CONTENT-02 / wrong-destination: card(s) do not point at a collection:\n  ` +
          `${bad.join('\n  ')}\nClicking takes the shopper somewhere other than the ` +
          `collection they chose.`
      ).toEqual([]);
    });

    test('CL-CONTENT-03 — no collection appears twice', async () => {
      await spot(cl.titleLinks());
      const hrefs = await cl.titleLinks().evaluateAll((els) =>
        els.map((a) => a.getAttribute('href'))
      );
      const seen = new Map<string, number>();
      for (const h of hrefs) if (h) seen.set(h, (seen.get(h) ?? 0) + 1);
      const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([h, n]) => `${h} x${n}`);

      expect(
        dupes,
        `CL-CONTENT-03 / duplicate: the same collection is listed more than once:\n  ` +
          `${dupes.join('\n  ')}\nUsually a section configured with the same collection ` +
          `picked twice.`
      ).toEqual([]);
    });

    test('CL-CONTENT-04 — the section heading is present', async ({ preset }) => {
      await spot(cl.heading());
      const heading = cl.heading();
      await expect(
        heading,
        `CL-CONTENT-04 / no-heading: ${preset.label} declares a section heading but none ` +
          `rendered. Shoppers get a row of pictures with no explanation of what it is.`
      ).toBeVisible();

      const text = ((await heading.textContent()) ?? '').trim();
      expect(
        text.length,
        'CL-CONTENT-04 / empty-heading: the heading element rendered but contains no text.'
      ).toBeGreaterThan(0);
    });

    test('CL-CONTENT-05 — item counts are shown and numeric', async () => {
      await spot(cl.itemCounts());
      const counts = await cl.itemCounts().evaluateAll((els) =>
        els.map((e) => (e.textContent ?? '').trim().replace(/\s+/g, ' '))
      );

      expect(
        counts.length,
        `CL-CONTENT-05 / missing-counts: this preset shows an item count per card, but ` +
          `none rendered.`
      ).toBeGreaterThan(0);

      const bad = counts.filter((c) => !/\d/.test(c));
      expect(
        bad,
        `CL-CONTENT-05 / non-numeric: item count(s) contain no number: ${bad.join(', ')}. ` +
          `A count reading "Items" with no figure means the value never resolved.`
      ).toEqual([]);
    });
  });

  // ===========================================================
  // 3. Images
  // ===========================================================
  test.describe('Images', () => {

    test('CL-MEDIA-01 — every card has an image', async () => {
      await spot(cl.images());
      const cards = await cl.cardCount();
      const images = await cl.images().count();

      expect(
        images,
        `CL-MEDIA-01 / missing-image: ${cards} card(s) but only ${images} image(s). ` +
          `A collection card with no picture is an empty box.`
      ).toBeGreaterThanOrEqual(cards);
    });

    test('CL-MEDIA-02 — every image has alt text', async () => {
      await spot(cl.images());
      const missing = await cl.images().evaluateAll((imgs) =>
        imgs
          .filter((i) => (i.getAttribute('alt') ?? '').trim() === '')
          .map((i) => (i.getAttribute('src') ?? '').split('/').pop())
      );

      expect(
        missing,
        `CL-MEDIA-02 / image-alt: ${missing.length} collection image(s) have no alt text:\n  ` +
          `${missing.join('\n  ')}`
      ).toEqual([]);
    });

    test('CL-MEDIA-03 — images declare their dimensions', async () => {
      await spot(cl.images());
      const missing = await cl.images().evaluateAll((imgs) =>
        imgs
          .filter(
            (i) =>
              !(i.getAttribute('width') && i.getAttribute('height')) &&
              !getComputedStyle(i).aspectRatio.match(/\d/)
          )
          .map((i) => (i.getAttribute('src') ?? '').split('/').pop())
      );

      expect(
        missing,
        `CL-MEDIA-03 / no-dimensions: ${missing.length} image(s) declare neither width/height ` +
          `nor an aspect-ratio, so the browser cannot reserve space and the page jumps as ` +
          `they arrive:\n  ${missing.join('\n  ')}`
      ).toEqual([]);
    });

    test('CL-MEDIA-04 — all card images decoded', async () => {
      await assertRenderHealth(cl.cards(), { minHeight: 40, requireImages: true });
    });
  });

  // ===========================================================
  // 4. Carousel navigation
  // ===========================================================
  // Gated on `collectionList.arrows`: doll renders arrows in the DOM but
  // keeps them hidden, because 4 cards at 4-per-view leaves nothing to
  // scroll to.
  test.describe('Carousel', () => {

    // khajal autoplays, so an unattended timer would move the carousel
    // mid-test and make these race the theme rather than test it.
    test.beforeEach(async () => {
      await cl.stopAutoplay();
    });

    test('CL-NAV-01 — the next arrow moves the carousel', async () => {
      await spot(cl.nextArrow());
      const before = await cl.realIndex();
      const after = await cl.goToNext();

      expect(
        after,
        `CL-NAV-01 / no-move: clicking next left the carousel on card ${before + 1}. ` +
          `The arrow is visible but does nothing.`
      ).not.toBe(before);
    });

    test('CL-NAV-02 — next then prev returns to the start', async () => {
      const start = await cl.realIndex();
      await cl.goToNext();
      await cl.goToPrev();

      expect(
        await cl.realIndex(),
        `CL-NAV-02 / prev-broken: next then prev did not return to card ${start + 1}. ` +
          `Prev moves a different distance than next, or is not wired up.`
      ).toBe(start);
    });

    test('CL-NAV-03 — arrows have accessible names', async () => {
      await spot(cl.nextArrow());
      const unnamed: string[] = [];
      if ((await cl.accessibleName(cl.nextArrow())).trim() === '') unnamed.push('next');
      if ((await cl.accessibleName(cl.prevArrow())).trim() === '') unnamed.push('prev');

      expect(
        unnamed,
        `CL-NAV-03 / unnamed-controls: ${unnamed.join(' and ')} arrow(s) have no accessible ` +
          `name — a screen reader announces "button" with no direction.`
      ).toEqual([]);
    });
  });

  // ===========================================================
  // 5. Autoplay
  // ===========================================================
  // Gated on `collectionList.autoplay`. khajal is the first preset in
  // the whole suite with autoplay actually enabled.
  test.describe('Autoplay', () => {

    test('CL-AUTO-01 — the carousel advances on its own', async () => {
      const state = await cl.swiperState();
      const delay = state?.autoplayDelay ?? 3000;

      const before = await cl.realIndex();
      await cl.page.waitForTimeout(delay * 1.5);

      expect(
        await cl.realIndex(),
        `CL-AUTO-01 / no-advance: autoplay is enabled with a ${delay}ms interval, but the ` +
          `carousel never moved. The timer never started.`
      ).not.toBe(before);
    });

    test('CL-AUTO-02 — autoplay pauses while hovered', async () => {
      await spot(cl.section());
      const state = await cl.swiperState();
      const delay = state?.autoplayDelay ?? 3000;

      await cl.section().hover();
      const before = await cl.realIndex();
      await cl.page.waitForTimeout(delay * 1.6);

      expect(
        await cl.realIndex(),
        `CL-AUTO-02 / no-pause-on-hover: hovered the carousel for longer than its interval ` +
          `and it kept moving. Cards slide away from under the pointer as the shopper is ` +
          `about to click one.`
      ).toBe(before);
    });
  });

  // ===========================================================
  // 6. Links
  // ===========================================================
  test.describe('Links', () => {

    test('CL-LINK-01/03/04 — no dead, unsafe or empty-shell anchors', async () => {
      await assertNoDeadOrUnsafeLinks(cl.section());
    });

    test('CL-LINK-02 — every collection link resolves', async ({ page, preset }) => {
      await spot(cl.titleLinks());
      const hrefs = await cl.collectionHrefs();
      expect(hrefs.length, 'expected at least one collection link').toBeGreaterThan(0);

      // Checked over HTTP rather than by clicking each one: same answer
      // to "does this collection exist", without 10 navigations.
      // Caveat: a soft-404 (200 with "not found" content) is not caught.
      for (const href of hrefs) {
        const res = await page.request.get(href.startsWith('/') ? preset.url + href : href);
        expect(
          res.status(),
          `CL-LINK-02 / broken-link: "${href}" returned ${res.status()}. The collection was ` +
            `probably deleted or renamed while the section still points at it.`
        ).toBeLessThan(400);
      }
    });

    test('CL-LINK-05 — the image and the title lead to the same place', async () => {
      await spot(cl.cards());
      const count = await cl.cardCount();
      const mismatched: string[] = [];

      for (let i = 0; i < count; i++) {
        const card = cl.cardAt(i);
        const imageHref = await card.locator('a.cl-collection-image__media').first().getAttribute('href').catch(() => null);
        const titleHref = await card.locator('a.collection-title__link').first().getAttribute('href').catch(() => null);
        if (imageHref && titleHref && imageHref !== titleHref) {
          mismatched.push(`card ${i + 1}: image → ${imageHref}, title → ${titleHref}`);
        }
      }

      expect(
        mismatched,
        `CL-LINK-05 / split-destination: on some cards the picture and the name go to ` +
          `different collections:\n  ${mismatched.join('\n  ')}\nWhichever the shopper ` +
          `clicks changes where they land.`
      ).toEqual([]);
    });
  });

  // ===========================================================
  // 7. Layout
  // ===========================================================
  test.describe('Layout', () => {

    test('CL-LAYOUT-01 — no horizontal page overflow', async ({ page }) => {
      await assertNoPageOverflow(page);
    });

    test('CL-LAYOUT-02 — card content stays inside its card', async () => {
      const first = cl.cardAt(0);
      await assertContentInsideBox(first, first.locator(`${'.collection-title'}, a.collection-title__link`));
    });

    test('CL-LAYOUT-03 — layout holds across the viewport matrix', async ({ page }) => {
      await spot(cl.section());
      const broken: string[] = [];

      for (const width of [1440, 1200, 1024, 768, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.waitForTimeout(450);
        await cl.scrollSectionIntoView(cl.section());

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        const box = await cl.section().boundingBox();
        const visibleCards = await cl.cards().count();

        if (overflow > 2 || !box || box.height < 80 || visibleCards === 0) {
          broken.push(
            `${width}px: overflow ${overflow}px, height ${Math.round(box?.height ?? 0)}px, ` +
              `${visibleCards} card(s)`
          );
        }
      }

      expect(
        broken,
        `CL-LAYOUT-03 / responsive: the collection list broke at:\n  ${broken.join('\n  ')}`
      ).toEqual([]);
    });
  });

  // ===========================================================
  // 8. Accessibility
  // ===========================================================
  test.describe('Accessibility', () => {

    test('CL-A11Y-01 — no critical accessibility violations', async ({ page }) => {
      const results = await new AxeBuilder({ page }).include('.collection-list').analyze();
      const critical = results.violations.filter((v) => v.impact === 'critical');

      expect(
        critical,
        `CL-A11Y-01 / axe: ${critical.length} critical violation(s):\n` +
          critical.map((v) => `  ${v.id}: ${v.help} → ${v.nodes[0]?.target}`).join('\n')
      ).toEqual([]);
    });

    test('CL-A11Y-02 — text contrast is at least 4.5:1', async ({ page, preset }) => {
      const results = await new AxeBuilder({ page })
        .include('.collection-list')
        .withRules(['color-contrast'])
        .analyze();

      expect(
        results.violations,
        `CL-A11Y-02 / contrast: text in the collection list fails the 4.5:1 minimum on ` +
          `"${preset.label}":\n` +
          results.violations.flatMap((v) => v.nodes.map((n) => `  ${n.target}`)).join('\n')
      ).toEqual([]);
    });

    test('CL-A11Y-03 — every card link has an accessible name', async () => {
      await spot(cl.imageLinks());
      // The image link wraps a picture with no text of its own, so it
      // relies on the image's alt. If that is blank the link is
      // announced as just "link".
      const unnamed = await cl.section()
        .locator('a[href*="/collections/"]')
        .evaluateAll((els) =>
          els
            .filter((a) => {
              const text = (a.textContent ?? '').trim();
              const label = a.getAttribute('aria-label') ?? '';
              const alt = a.querySelector('img')?.getAttribute('alt') ?? '';
              return !text && !label && !alt.trim();
            })
            .map((a) => a.getAttribute('href'))
        );

      expect(
        unnamed,
        `CL-A11Y-03 / unnamed-link: ${unnamed.length} collection link(s) have no text, no ` +
          `aria-label and no image alt, so a screen reader announces only "link":\n  ` +
          `${unnamed.join('\n  ')}`
      ).toEqual([]);
    });
  });
});
