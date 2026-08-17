// tests/featured-collection.spec.ts
// ─────────────────────────────────────────────────────────────
// Featured collection suite — the product rows on the home page.
//
//              instances   cards      price     swatches
//   khajal     2           8, 15      yes*      no
//   doll       1           4          yes       no
//   moonlight  2           16, 16     NONE      yes
//
//   * khajal's second row has prices in the markup, but 10 of its 15
//     render at zero height.
//
// This is the first section where a defect costs money directly. A
// broken carousel is annoying; a product card with no price is a
// shopper who cannot decide whether to click. So price is checked
// three ways — present, visible, and non-empty — because it fails in
// three different ways across these stores.
//
// Price checks are deliberately NOT gated away for moonlight. Hiding
// them behind a capability flag would record "this store shows no
// prices" as expected behaviour, which is exactly the thing worth
// asking about.
// ─────────────────────────────────────────────────────────────

import { test, expect } from '../utils/fixtures';
import AxeBuilder from '@axe-core/playwright';
import { FeaturedCollectionPage } from '../pages/FeaturedCollectionPage.js';
import { rootSelector } from '../utils/simple-sections.js';
import { mountNarrator, spot, spotVerdicts } from '../utils/demo-hud.js';
import { checksFor } from '../utils/slideshow-checks.js';

const { assertRenderHealth, expectNoMissingTranslations, assertNoDeadOrUnsafeLinks,
        assertNoPageOverflow, assertContentInsideBox,
        expectNoPlaceholderText } = checksFor('FC');

test.describe('Featured collection', () => {
  let fc: FeaturedCollectionPage;

  test.skip(({ preset }) => !(preset.sections?.featured_collection > 0),
    'This preset does not ship a featured collection section.');

  test.beforeEach(async ({ page, preset }, testInfo) => {
    fc = new FeaturedCollectionPage(page, preset);
    await mountNarrator(page, {
      title: testInfo.title,
      preset: preset.key,
      spotlight: rootSelector('featured_collection'),
    });
    await fc.open();
  });

  /** Walk every instance the preset declares. */
  const eachRow = async (preset: any, fn: (i: number, expected: any) => Promise<void>) => {
    const rows = preset.featuredCollection?.rows ?? [];
    for (let i = 0; i < rows.length; i++) {
      await fc.focus(i);
      await fn(i, rows[i]);
    }
  };

  // ===========================================================
  // 1. Render & structure
  // ===========================================================
  test.describe('Render & structure', () => {

    test('FC-RENDER-01 — every declared row is present', async ({ preset }) => {
      await spot(fc.roots());
      expect(
        await fc.instanceCount(),
        `FC-RENDER-01 / count: ${preset.label} should render ` +
          `${preset.sections.featured_collection} featured collection row(s).`
      ).toBe(preset.sections.featured_collection);
      await expect(fc.root()).toBeVisible();
    });

    test('FC-RENDER-02 — each row holds the expected number of products', async ({ preset }) => {
      await eachRow(preset, async (i, expected) => {
        await spot(fc.cards(i));
        expect(
          await fc.cardCount(i),
          `FC-RENDER-02 / card-count: row ${i + 1} should hold ${expected.cards} product ` +
            `card(s) but holds ${await fc.cardCount(i)}. A product dropping out of a ` +
            `featured row is invisible unless someone counts.`
        ).toBe(expected.cards);
      });
    });

    test('FC-RENDER-03 — no product card has collapsed', async ({ preset }) => {
      await eachRow(preset, async (i) => {
        await assertRenderHealth(fc.cards(i), { minHeight: 60 });
      });
    });

    test('FC-RENDER-04 — no missing translation keys', async ({ preset }) => {
      await eachRow(preset, async (i) => {
        await spot(fc.root(i));
        await expectNoMissingTranslations(fc.root(i));
      });
    });

    test('FC-RENDER-05 — no theme placeholder text is left on the page', async ({ preset }) => {
      await eachRow(preset, async (i) => {
        await expectNoPlaceholderText(fc.root(i));
      });
    });

    test('FC-RENDER-06 — no misspelled class names in the markup', async ({ preset }) => {
      await eachRow(preset, async (i) => {
        const typos = await fc.misspelledClasses(i);
        expect(
          typos,
          `FC-RENDER-06 / typo: the theme ships misspelled class name(s) in row ${i + 1}:\n` +
            `  ${typos.join('\n  ')}\n` +
            `Nothing looks wrong on screen, which is the problem: any stylesheet or script ` +
            `written against the correctly-spelled name matches nothing, silently.`
        ).toEqual([]);
      });
    });
  });

  // ===========================================================
  // 2. Product card content
  // ===========================================================
  test.describe('Product cards', () => {

    test('FC-CARD-01 — every card shows a product name', async ({ preset }) => {
      await eachRow(preset, async (i) => {
        const cards = await fc.cardData(i);
        const verdicts = cards.map((c) => c.title.length > 0);
        await spotVerdicts(fc.cards(i), verdicts);

        const blank = cards.filter((c) => !c.title).map((c) => `card ${c.n}`);
        expect(
          blank,
          `FC-CARD-01 / no-title: ${blank.join(', ')} in row ${i + 1} render no product ` +
            `name. The shopper sees a picture and a price with nothing to say what it is.`
        ).toEqual([]);
      });
    });

    test('FC-CARD-02 — every card links to a product', async ({ preset }) => {
      await eachRow(preset, async (i) => {
        const cards = await fc.cardData(i);
        const verdicts = cards.map((c) => !!c.href && c.href.includes('/products/'));
        await spotVerdicts(fc.cards(i), verdicts);

        const bad = cards.filter((c, n) => !verdicts[n]).map((c) => `card ${c.n} ("${c.title}") -> ${c.href}`);
        expect(
          bad,
          `FC-CARD-02 / no-link: ${bad.join(', ')} in row ${i + 1} do not link to a product ` +
            `page. The card is the only route to buying that item.`
        ).toEqual([]);
      });
    });

    test('FC-CARD-03 — every card shows an image', async ({ preset }) => {
      await eachRow(preset, async (i) => {
        const cards = await fc.cardData(i);
        const missing = cards.filter((c) => !c.hasImage).map((c) => `card ${c.n} ("${c.title}")`);
        expect(
          missing,
          `FC-CARD-03 / no-image: ${missing.join(', ')} in row ${i + 1} have no product ` +
            `image.`
        ).toEqual([]);
      });
    });

    test('FC-CARD-04 — every product image has alt text', async ({ preset }) => {
      await eachRow(preset, async (i) => {
        const cards = await fc.cardData(i);
        const verdicts = cards.map((c) => !!(c.imgAlt ?? '').trim());
        await spotVerdicts(fc.cards(i), verdicts);

        const missing = cards.filter((c, n) => c.hasImage && !verdicts[n]).map((c) => `card ${c.n} ("${c.title}")`);
        expect(
          missing,
          `FC-CARD-04 / missing-alt: ${missing.join(', ')} in row ${i + 1} have images with ` +
            `no alt text. On a slow connection the shopper sees an empty box where the ` +
            `product should be.`
        ).toEqual([]);
      });
    });

    test('FC-CARD-05 — no product image is broken', async ({ preset }) => {
      await eachRow(preset, async (i) => {
        const cards = await fc.cardData(i);
        const broken = cards.filter((c) => c.imgBroken).map((c) => `card ${c.n} ("${c.title}")`);
        expect(
          broken,
          `FC-CARD-05 / broken-image: ${broken.join(', ')} in row ${i + 1} show a ` +
            `broken-image icon.`
        ).toEqual([]);
      });
    });

    test('FC-CARD-06 — the same product is not listed twice', async ({ preset }) => {
      await eachRow(preset, async (i) => {
        const cards = await fc.cardData(i);
        const seen = new Map<string, number>();
        for (const c of cards) if (c.href) seen.set(c.href, (seen.get(c.href) ?? 0) + 1);

        const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([h, n]) => `${h} x${n}`);
        expect(
          dupes,
          `FC-CARD-06 / duplicate: row ${i + 1} lists the same product more than once: ` +
            `${dupes.join(', ')}. A featured row repeating an item wastes the slot.`
        ).toEqual([]);
      });
    });
  });

  // ===========================================================
  // 3. Price — checked three ways
  // ===========================================================
  test.describe('Price', () => {

    test('FC-PRICE-01 — every product card shows a price', async ({ preset }) => {
      await eachRow(preset, async (i) => {
        const cards = await fc.cardData(i);
        const verdicts = cards.map((c) => c.hasPriceEl);
        await spotVerdicts(fc.cards(i), verdicts);

        const missing = cards.filter((c) => !c.hasPriceEl).map((c) => `"${c.title}"`);
        expect(
          missing,
          `FC-PRICE-01 / no-price: ${missing.length} of ${cards.length} product card(s) in ` +
            `row ${i + 1} have no price element at all: ${missing.slice(0, 6).join(', ')}` +
            `${missing.length > 6 ? ', …' : ''}\n` +
            `Not hidden — absent from the markup. A shopper browsing this row cannot tell ` +
            `what anything costs without opening each product.\n` +
            `If this is a deliberate theme setting for this store, say so and it can be ` +
            `declared in data/presets.json so the check stops asking.`
        ).toEqual([]);
      });
    });

    test('FC-PRICE-02 — the price is actually visible', async ({ preset }) => {
      await eachRow(preset, async (i) => {
        const cards = await fc.cardData(i);
        const present = cards.filter((c) => c.hasPriceEl);
        test.skip(!present.length, `Row ${i + 1} has no price elements to measure.`);

        const invisible = present.filter((c) => !c.priceVisible).map((c) => `"${c.title}"`);
        expect(
          invisible,
          `FC-PRICE-02 / price-collapsed: ${invisible.length} of ${present.length} price(s) in ` +
            `row ${i + 1} are in the markup but render at zero height, so the shopper never ` +
            `sees them: ${invisible.slice(0, 6).join(', ')}${invisible.length > 6 ? ', …' : ''}\n` +
            `This is worse than a missing price: the page believes it is showing one.`
        ).toEqual([]);
      });
    });

    test('FC-PRICE-03 — the price reads as an amount', async ({ preset }) => {
      await eachRow(preset, async (i) => {
        const cards = await fc.cardData(i);
        const present = cards.filter((c) => c.hasPriceEl);
        test.skip(!present.length, `Row ${i + 1} has no price elements to read.`);

        const bad = present
          .filter((c) => !/\d/.test(c.priceText))
          .map((c) => `"${c.title}" shows "${c.priceText || '(empty)'}"`);
        expect(
          bad,
          `FC-PRICE-03 / price-empty: price element(s) in row ${i + 1} contain no number: ` +
            `${bad.join(', ')}.`
        ).toEqual([]);
      });
    });
  });

  // ===========================================================
  // 4. Links, carousel, layout, accessibility
  // ===========================================================
  test.describe('Links & carousel', () => {

    test('FC-LINK-01/03/04 — no dead, unsafe or unlabelled links', async ({ preset }) => {
      await eachRow(preset, async (i) => {
        await spot(fc.root(i));
        await assertNoDeadOrUnsafeLinks(fc.root(i));
      });
    });

    test('FC-LINK-02 — every product page still exists', async ({ page, preset }) => {
      await eachRow(preset, async (i) => {
        const hrefs = await fc.productHrefs(i);
        const broken: string[] = [];

        for (const href of hrefs) {
          const url = new URL(href, page.url()).toString();
          const res = await page.request.get(url, { failOnStatusCode: false }).catch(() => null);
          const status = res?.status() ?? 0;
          if (status >= 400 || status === 0) broken.push(`${url} (${status || 'unreachable'})`);
        }

        expect(
          broken,
          `FC-LINK-02 / dead-product: row ${i + 1} features product(s) whose page no longer ` +
            `exists:\n  ${broken.join('\n  ')}\n` +
            `Un-publishing a product does not remove it from a featured row.`
        ).toEqual([]);
      });
    });

    test('FC-NAV-01 — the carousel advances when you click next', async ({ preset }) => {
      await eachRow(preset, async (i) => {
        const before = await fc.carouselState(i);
        test.skip(!before, `Row ${i + 1} is not carousel-backed.`);
        // doll's four products fit on screen, so its arrow renders
        // disabled. Nothing to advance means nothing to assert.
        test.skip(!(await fc.canAdvance(i)),
          `Row ${i + 1} has nothing further to scroll at this viewport.`);

        await spot(fc.nextArrow(i));
        await fc.clickNext(i);
        const after = await fc.carouselState(i);

        expect(
          after!.realIndex,
          `FC-NAV-01 / no-advance: clicking next on row ${i + 1} left the carousel on ` +
            `slide ${before!.realIndex}. Products past the first few are unreachable.`
        ).not.toBe(before!.realIndex);
      });
    });
  });

  test.describe('Layout & accessibility', () => {

    test('FC-LAYOUT-01 — no horizontal page overflow', async ({ page }) => {
      await assertNoPageOverflow(page);
    });

    test('FC-LAYOUT-02 — card content stays inside the row', async ({ preset }) => {
      await eachRow(preset, async (i) => {
        await assertContentInsideBox(fc.root(i), fc.cards(i), { onlyInView: true });
      });
    });

    test('FC-LAYOUT-03 — it holds across the viewport matrix', async ({ page }) => {
      for (const width of [1440, 1200, 1024, 768, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await fc.focus(0);
        await expect(
          fc.root(),
          `FC-LAYOUT-03 / breakpoint: the featured collection stopped being visible at ${width}px.`
        ).toBeVisible();
        await assertNoPageOverflow(page);
      }
    });

    test('FC-A11Y-01 — no critical accessibility violations', async ({ page, preset }) => {
      await eachRow(preset, async (i) => {
        await spot(fc.root(i));
        const id = await fc.root(i).getAttribute('id');
        const results = await new AxeBuilder({ page })
          .include(`#${id}`)
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();

        const critical = results.violations.filter(
          (v) => v.impact === 'critical' || v.impact === 'serious'
        );
        expect(
          critical.map((v) => `${v.id}: ${v.help} -> ${v.nodes[0]?.target?.join(' ')}`),
          `FC-A11Y-01 / axe: ${critical.length} critical violation(s) in row ${i + 1}.`
        ).toEqual([]);
      });
    });

    test('FC-A11Y-02 — text contrast is at least 4.5:1', async ({ page, preset }) => {
      await eachRow(preset, async (i) => {
        const id = await fc.root(i).getAttribute('id');
        const results = await new AxeBuilder({ page })
          .include(`#${id}`)
          .withRules(['color-contrast'])
          .analyze();

        expect(
          results.violations.flatMap((v) => v.nodes.map((n) => n.target.join(' '))),
          `FC-A11Y-02 / contrast: product card text in row ${i + 1} fails the 4.5:1 minimum.`
        ).toEqual([]);
      });
    });
  });
});
