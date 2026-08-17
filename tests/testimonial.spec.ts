// tests/testimonial.spec.ts
// ─────────────────────────────────────────────────────────────
// Testimonial section suite.
//
// Fourth section, and the first that runs on ALL FOUR stores — also
// the first where a preset ships the section TWICE (dense has two).
// Every check therefore walks each section the manifest declares,
// rather than assuming there is only one.
//
//              khajal   doll   dense    moonlight
//   sections   1        1      2        1
//   cards      7        3      4 + 4    6
//   images     yes      NO     yes      yes
//   2nd block  NO       yes    yes      yes
//   arrows     no       no     no       yes
//
// One trap worth knowing: the card's two text blocks carry GENERATED
// class names ("__heading" / "__description") whose MEANING differs by
// preset — doll puts the quote in the heading and the author in the
// description; dense puts a headline in the heading and the quote in
// the description. Nothing here may assume which is which, so the
// content checks work on whole-card text.
//
// Nothing above is branched on in this file. It is declared in
// data/presets.json and gated in playwright.config.ts, so each store
// collects only the checks that apply to it.
//
// Demo support is wired in from the start: the narrator names each
// check, `spot()` highlights what it inspects, and `spotVerdicts()`
// paints a green or red result per element.
// ─────────────────────────────────────────────────────────────

import { test, expect, sectionCount } from '../utils/fixtures';
import AxeBuilder from '@axe-core/playwright';
import { TestimonialPage } from '../pages/TestimonialPage.js';
import { mountNarrator, spot, spotVerdicts } from '../utils/demo-hud.js';
import { checksFor } from '../utils/slideshow-checks.js';

const SECTION = 'testimonial';

const { assertRenderHealth, expectNoMissingTranslations, assertNoDeadOrUnsafeLinks,
        assertNoPageOverflow, expectNoPlaceholderText } = checksFor('TS');

test.describe('Testimonials', () => {
  let ts: TestimonialPage;

  test.skip(
    ({ preset }) => sectionCount(preset, SECTION) === 0,
    'This preset does not ship a testimonial section.'
  );

  test.beforeEach(async ({ page, preset }, testInfo) => {
    ts = new TestimonialPage(page, preset);
    await mountNarrator(page, {
      title: testInfo.title,
      preset: preset.key,
      spotlight: '.testimonial',
    });
    await ts.open();
  });

  /** What the manifest declares for the nth section of this preset. */
  const capsFor = (preset: any, i: number) =>
    preset.testimonial?.sections?.[i] ?? {};

  /** Walk every testimonial section this preset declares. */
  const eachSection = async (preset: any, fn: (i: number) => Promise<void>) => {
    const total = sectionCount(preset, SECTION);
    for (let i = 0; i < total; i++) {
      await ts.focusSection(i);
      await fn(i);
    }
  };

  // ===========================================================
  // 1. Render & structure
  // ===========================================================
  test.describe('Render & structure', () => {

    test('TS-RENDER-01 — every declared section is present', async ({ preset }) => {
      await spot(ts.sections());
      expect(
        await ts.sectionCount(),
        `TS-RENDER-01 / count: the manifest declares ${sectionCount(preset, SECTION)} ` +
          `testimonial section(s) for ${preset.label}. Dense ships two — a second one ` +
          `going missing is exactly what this catches.`
      ).toBe(sectionCount(preset, SECTION));

      await expect(ts.section()).toBeVisible();
    });

    test('TS-RENDER-02 — each section holds the expected number of cards', async ({ preset }) => {
      await eachSection(preset, async (i) => {
        const expected = capsFor(preset, i).cards;
        await spot(ts.cards(i));
        expect(
          await ts.cardCount(i),
          `TS-RENDER-02 / count-mismatch: section ${i + 1} should hold ${expected} ` +
            `testimonial card(s). A different number means a quote was added, removed, or ` +
            `failed to render. If intended, update data/presets.json.`
        ).toBe(expected);
      });
    });

    test('TS-RENDER-03 — no card has collapsed', async ({ preset }) => {
      await eachSection(preset, async (i) => {
        await assertRenderHealth(ts.cards(i), { minHeight: 60 });
      });
    });

    test('TS-RENDER-04 — no missing translation keys', async () => {
      await spot(ts.section());
      await expectNoMissingTranslations(ts.section());
    });

    test('TS-CONTENT-05 — no theme placeholder text is left on the page', async ({ preset }) => {
      await eachSection(preset, async (i) => {
        await expectNoPlaceholderText(ts.section(i));
      });
    });

    test('TS-RENDER-05 — no JS errors on init', async ({ page }) => {
      const errors: string[] = [];
      const failed: string[] = [];
      page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
      page.on('response', (r) => {
        if (r.status() >= 400) failed.push(`[request] ${r.status()} ${r.url()}`);
      });

      await ts.open();
      await page.waitForTimeout(1500);

      const issues = [...errors, ...failed];
      expect(
        issues,
        `TS-RENDER-05 / runtime: the page reported issues attributable to theme code:\n` +
          `  ${issues.join('\n  ')}`
      ).toEqual([]);
    });
  });

  // ===========================================================
  // 2. Quote content
  // ===========================================================
  test.describe('Content', () => {

    test('TS-CONTENT-01 — every card renders text', async ({ preset }) => {
      await eachSection(preset, async (i) => {
        // Whole-card text, not the quote block: which block holds the
        // quote differs per preset (see TestimonialPage.cardTexts).
        const quotes = await ts.cardTexts(i);
        const verdicts = quotes.map((q) => q.length > 0);
        await spotVerdicts(ts.cards(i), verdicts);

        const empty = quotes.map((q, n) => (q.length === 0 ? n + 1 : null)).filter(Boolean);
        expect(
          empty,
          `TS-CONTENT-01 / empty-card: card(s) ${empty.join(', ')} in section ${i + 1} render ` +
            `no text at all. A testimonial with no words is just a photo.`
        ).toEqual([]);

        expect(
          quotes.length,
          `TS-CONTENT-01 / count-mismatch: section ${i + 1} reported ${quotes.length} card ` +
            `text(s) against ${await ts.cardCount(i)} card(s) counted.`
        ).toBe(await ts.cardCount(i));
      });
    });

    test('TS-CONTENT-02 — every card fills its secondary text block', async ({ preset }) => {
      await eachSection(preset, async (i) => {
        if (!capsFor(preset, i).secondaryText) return;
        const authors = await ts.authorTexts(i);
        const verdicts = authors.map((a) => a.length > 0);
        await spotVerdicts(ts.authors(i), verdicts);

        const empty = authors.map((a, n) => (a.length === 0 ? n + 1 : null)).filter(Boolean);
        expect(
          empty,
          `TS-CONTENT-02 / empty-block: card(s) ${empty.join(', ')} in section ${i + 1} leave ` +
            `their second text block empty. Which block that is varies by preset — the ` +
            `attribution on doll, the quote itself on dense — but either way an empty one ` +
            `renders as a blank gap inside the card.`
        ).toEqual([]);
      });
    });

    test('TS-CONTENT-03 — no card is an exact duplicate', async ({ preset }) => {
      await eachSection(preset, async (i) => {
        const quotes = await ts.cardTexts(i);
        const seen = new Map<string, number>();
        for (const q of quotes) if (q) seen.set(q, (seen.get(q) ?? 0) + 1);

        const verdicts = quotes.map((q) => (seen.get(q) ?? 0) <= 1);
        await spotVerdicts(ts.cards(i), verdicts);

        const dupes = [...seen.entries()]
          .filter(([, n]) => n > 1)
          .map(([q, n]) => `"${q.slice(0, 40)}…" x${n}`);

        expect(
          dupes,
          `TS-CONTENT-03 / duplicate: an identical card — same quote AND same attribution — ` +
            `appears more than once in section ${i + 1}:\n  ${dupes.join('\n  ')}\n` +
            `Usually the same testimonial block pasted twice.`
        ).toEqual([]);
      });
    });

    test('TS-CONTENT-04 — the section has a heading', async ({ preset }) => {
      await eachSection(preset, async (i) => {
        const heading = ts.sectionHeading(i);
        await spot(heading);

        await expect(
          heading,
          `TS-CONTENT-04 / no-heading: section ${i + 1} renders no heading, so shoppers get ` +
            `a row of quotes with no framing.`
        ).toBeVisible();

        const text = ((await heading.textContent()) ?? '').trim();
        expect(
          text.length,
          `TS-CONTENT-04 / empty-heading: section ${i + 1}'s heading element is present but empty.`
        ).toBeGreaterThan(0);
      });
    });
  });

  // ===========================================================
  // 3. Star ratings
  // ===========================================================
  test.describe('Ratings', () => {

    test('TS-RATING-01 — every card carries a star rating', async ({ preset }) => {
      await eachSection(preset, async (i) => {
        // dense section 2 ships no ratings at all — declared, not assumed.
        if (!capsFor(preset, i).rating) return;
        const cards = await ts.cardCount(i);
        const ratings = await ts.ratings(i).count();
        await spot(ts.ratings(i));

        expect(
          ratings,
          `TS-RATING-01 / missing-rating: section ${i + 1} has ${cards} card(s) but only ` +
            `${ratings} star rating(s).`
        ).toBe(cards);
      });
    });

    test('TS-RATING-02 — ratings are announced and within range', async ({ preset }) => {
      await eachSection(preset, async (i) => {
        if (!capsFor(preset, i).rating) return;
        const values = await ts.ratingValues(i);

        // The stars are decorative markup; the aria-label carries the
        // actual value, so an unreadable label means the rating is
        // invisible to assistive tech AND unverifiable here.
        const verdicts = values.map(
          (v) => v !== null && v.value >= 0 && v.value <= v.outOf
        );
        await spotVerdicts(ts.ratings(i), verdicts);

        const unreadable = values
          .map((v, n) => (v === null ? n + 1 : null))
          .filter(Boolean);
        expect(
          unreadable,
          `TS-RATING-02 / unlabelled: rating(s) ${unreadable.join(', ')} in section ${i + 1} ` +
            `carry no parseable "N out of M" label. A screen reader announces nothing, and ` +
            `there is no visible number to fall back on.`
        ).toEqual([]);

        const outOfRange = values
          .map((v, n) => (v && (v.value < 0 || v.value > v.outOf) ? `${n + 1}: ${v.value}/${v.outOf}` : null))
          .filter(Boolean);
        expect(
          outOfRange,
          `TS-RATING-02 / out-of-range: rating(s) claim a score outside their own scale:\n  ` +
            `${outOfRange.join('\n  ')}`
        ).toEqual([]);
      });
    });
  });

  // ===========================================================
  // 4. Images
  // ===========================================================
  test.describe('Images', () => {

    test('TS-MEDIA-01 — every card has an image', async ({ preset }) => {
      await eachSection(preset, async (i) => {
        if (!capsFor(preset, i).image) return;
        const cards = await ts.cardCount(i);
        const images = await ts.images(i).count();
        await spot(ts.images(i));

        expect(
          images,
          `TS-MEDIA-01 / missing-image: section ${i + 1} has ${cards} card(s) but ` +
            `${images} image(s).`
        ).toBeGreaterThanOrEqual(cards);
      });
    });

    test('TS-MEDIA-02 — every image has alt text', async ({ preset }) => {
      await eachSection(preset, async (i) => {
        if (!capsFor(preset, i).image) return;
        const alts = await ts.images(i).evaluateAll((imgs) =>
          imgs.map((im) => (im.getAttribute('alt') ?? '').trim())
        );
        const verdicts = alts.map((a) => a.length > 0);
        await spotVerdicts(ts.images(i), verdicts);

        const missing = alts
          .map((a, n) => (a.length === 0 ? `image ${n + 1}` : null))
          .filter(Boolean);
        expect(
          missing,
          `TS-MEDIA-02 / image-alt: ${missing.length} image(s) in section ${i + 1} have no ` +
            `alt text:\n  ${missing.join('\n  ')}`
        ).toEqual([]);
      });
    });

    test('TS-MEDIA-03 — all card images decoded', async ({ preset }) => {
      await eachSection(preset, async (i) => {
        if (!capsFor(preset, i).image) return;
        await assertRenderHealth(ts.cards(i), { minHeight: 60, requireImages: true });
      });
    });
  });

  // ===========================================================
  // 5. Carousel
  // ===========================================================
  test.describe('Carousel', () => {

    test('TS-NAV-01 — the next arrow moves the carousel', async () => {
      await spot(ts.nextArrow());
      const before = await ts.realIndex();
      await ts.nextArrow().click();
      await ts.page.waitForTimeout(900);

      expect(
        await ts.realIndex(),
        `TS-NAV-01 / no-move: clicking next left the carousel on card ${before + 1}. ` +
          `The arrow is visible but does nothing.`
      ).not.toBe(before);
    });

    test('TS-NAV-02 — arrows have accessible names', async () => {
      await spot(ts.nextArrow());
      const name =
        (await ts.nextArrow().getAttribute('aria-label')) ??
        (await ts.nextArrow().innerText().catch(() => '')) ??
        '';

      expect(
        name.trim().length,
        `TS-NAV-02 / unnamed-control: the next arrow has no accessible name — a screen ` +
          `reader announces "button" with no direction.`
      ).toBeGreaterThan(0);
    });
  });

  // ===========================================================
  // 6. Links, layout and accessibility
  // ===========================================================
  test.describe('Links', () => {

    test('TS-LINK-01/03/04 — no dead, unsafe or empty-shell anchors', async ({ preset }) => {
      await eachSection(preset, async (i) => {
        await assertNoDeadOrUnsafeLinks(ts.section(i));
      });
    });
  });

  test.describe('Layout', () => {

    test('TS-LAYOUT-01 — no horizontal page overflow', async ({ page }) => {
      await assertNoPageOverflow(page);
    });

    test('TS-LAYOUT-02 — layout holds across the viewport matrix', async ({ page, preset }) => {
      const broken: string[] = [];

      for (const width of [1440, 1200, 1024, 768, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.waitForTimeout(450);
        await ts.focusSection(0);

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        const box = await ts.section().boundingBox();
        const cards = await ts.cardCount(0);

        if (overflow > 2 || !box || box.height < 60 || cards === 0) {
          broken.push(
            `${width}px: overflow ${overflow}px, height ${Math.round(box?.height ?? 0)}px, ` +
              `${cards} card(s)`
          );
        }
      }

      expect(
        broken,
        `TS-LAYOUT-02 / responsive: the testimonial section broke at:\n  ${broken.join('\n  ')}`
      ).toEqual([]);
    });
  });

  test.describe('Accessibility', () => {

    test('TS-A11Y-01 — no critical accessibility violations', async ({ page }) => {
      const results = await new AxeBuilder({ page }).include('.testimonial').analyze();
      const critical = results.violations.filter((v) => v.impact === 'critical');

      expect(
        critical,
        `TS-A11Y-01 / axe: ${critical.length} critical violation(s):\n` +
          critical.map((v) => `  ${v.id}: ${v.help} → ${v.nodes[0]?.target}`).join('\n')
      ).toEqual([]);
    });

    test('TS-A11Y-02 — text contrast is at least 4.5:1', async ({ page, preset }) => {
      const results = await new AxeBuilder({ page })
        .include('.testimonial')
        .withRules(['color-contrast'])
        .analyze();

      expect(
        results.violations,
        `TS-A11Y-02 / contrast: text in the testimonial section fails the 4.5:1 minimum on ` +
          `"${preset.label}":\n` +
          results.violations.flatMap((v) => v.nodes.map((n) => `  ${n.target}`)).join('\n')
      ).toEqual([]);
    });
  });
});
