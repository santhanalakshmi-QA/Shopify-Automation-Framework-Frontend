// tests/slideshow.spec.ts
// ─────────────────────────────────────────────────────────────
// Slideshow suite, written against slideshow-checklist.md.
//
// Test titles carry the checklist ID (SS-RENDER-01 …) and failures use
// the namespaced messages the checklist specifies, so a report can be
// grepped by category.
//
// PRESET-DRIVEN, not store-specific: the file runs unchanged against
// every preset that ships a slideshow and skips itself on any that
// does not. Where a check depends on configuration (loop on/off,
// autoplay on/off, arrows present), the config is read from the live
// Swiper instance rather than assumed — so a preset with the feature
// switched off skips with a reason instead of failing.
//
// NOT COVERED — needs content provisioning we cannot do against fixed
// live stores:
//   SS-NEG-01/02/03/04/06/07/08/09/10  (zero slides, one slide, missing
//     image/text, 100-char heading, max blocks, CJK/RTL, XSS probe)
//   SS-LAYOUT-04 (long-text fixtures), SS-LAYOUT-06/07 partially,
//   SS-MEDIA-05 (overlay opacity setting), SS-DOT-05 (no fraction UI),
//   SS-CROSS-02 (no preset renders two slideshows on one page),
//   SS-PERF-01/03 (frame timing is advisory; heap needs CDP).
//
// DELIBERATELY REMOVED — implemented, then deleted because they can
// never fire against these four stores as configured. Re-add them if
// the corresponding setting changes:
//   SS-AUTO-01/02/04..09  autoplay is disabled on all four presets
//   SS-LOOP-05            loop is enabled on all four, so the carousel
//                         never parks on a boundary
//   SS-RENDER-08          the single-slide case; every preset has 2-3
//   SS-LINK-05/06         folded into SS-LINK-01 (empty-shell anchors
//                         already catch an unlabelled CTA) and
//                         SS-LINK-02 (which now also clicks through)
// ─────────────────────────────────────────────────────────────

import { test, expect, sectionCount } from '../utils/fixtures';
import AxeBuilder from '@axe-core/playwright';
import { SlideshowPage } from '../pages/SlideshowPage.js';
import { mountNarrator, spot } from '../utils/demo-hud.js';
import {
  assertRenderHealth,
  expectNoMissingTranslations,
  assertNoDeadOrUnsafeLinks,
  assertNoPageOverflow,
  assertContentInsideBox,
} from '../utils/slideshow-checks.js';

const SECTION = 'slideshow';

test.describe('Slideshow', () => {
  let ss: SlideshowPage;

  test.skip(
    ({ preset }) => sectionCount(preset, SECTION) === 0,
    'This preset does not ship a slideshow section.'
  );

  test.beforeEach(async ({ slideshowPage, page, preset }, testInfo) => {
    ss = slideshowPage;

    // Demo runs only: put a banner on the page naming the check and what
    // it is doing, so the run can be watched instead of read. Registered
    // before navigating so it survives reloads. No-op in normal runs.
    await mountNarrator(page, { title: testInfo.title, preset: preset.key });

    await ss.open();
  });

  // ===========================================================
  // 1. Render & structure
  // ===========================================================
  test.describe('Render & structure', () => {

    test('SS-RENDER-01 — section present and visible', async ({ preset }) => {
      await spot(ss.section());
      await expect(
        ss.section(),
        `SS-RENDER-01 / missing: no slideshow root matched ".slideshow-section" on ${preset.url}.`
      ).toBeVisible();

      expect(
        await ss.sectionCount(),
        `SS-RENDER-01 / count: manifest declares ${sectionCount(preset, SECTION)} slideshow(s).`
      ).toBe(sectionCount(preset, SECTION));
    });

    test('SS-RENDER-02 — slide count in DOM matches visible count', async () => {
      const state = await ss.swiperState();
      const real = await ss.slideCount();
      const clones = (state?.slides ?? real) - real;

      expect(real, 'SS-RENDER-02 / count-mismatch: no real slides found').toBeGreaterThan(0);
      expect(
        clones,
        `SS-RENDER-02 / count-mismatch: found ${state?.slides} slide element(s) against ` +
          `${real} authored slide(s) — ${clones} are loop clones. A mismatch beyond the ` +
          `clone count means slides were dropped or duplicated.`
      ).toBeGreaterThanOrEqual(0);
    });

    test('SS-RENDER-03 — first slide visible on load', async () => {
      expect(
        await ss.realIndex(),
        `SS-RENDER-03 / wrong-start: on load the carousel is not parked on slide 1. ` +
          `initialSlide is misconfigured, or a loop offset is not accounted for.`
      ).toBe(0);
    });

    test('SS-RENDER-04 — no slide has a zero-size box', async () => {
      await assertRenderHealth(ss.slides(), { minHeight: 40 });
    });

    test('SS-RENDER-05 — all slide images decoded', async () => {
      await assertRenderHealth(ss.slides(), { requireImages: true });
    });

    test('SS-RENDER-06 — no missing translation keys', async () => {
      await spot(ss.section());
      await expectNoMissingTranslations(ss.section());
    });

    test('SS-RENDER-09 — only one slide is showing at a time', async () => {
      await spot(ss.section());
      await expect(
        ss.section().locator('.swiper-slide-active'),
        `SS-RENDER-09 / multiple-active: more than one slide is marked active. The carousel ` +
          `is showing two slides at once, or none at all.`
      ).toHaveCount(1);
    });

    test('SS-RENDER-10 — slides are in the order they were set', async () => {
      await spot(ss.slides());
      // Each slide advertises its own position ("1 / 3") for screen
      // readers. Those positions must ascend in DOM order — if they do
      // not, the carousel has reordered the merchant's slides.
      const positions = await ss.slides().evaluateAll((slides) =>
        slides.map((s) => {
          const label = s.getAttribute('aria-label') ?? '';
          const m = label.match(/(\d+)\s*\/\s*\d+/);
          return m ? Number(m[1]) : null;
        })
      );
      test.skip(positions.some((p) => p === null), 'Slides do not advertise a position label.');

      const expected = positions.map((_, i) => i + 1);
      expect(
        positions,
        `SS-RENDER-10 / wrong-order: slides appear in the order ${positions.join(', ')} ` +
          `but should be ${expected.join(', ')}. The slides have been reordered relative to ` +
          `how the merchant set them.`
      ).toEqual(expected);
    });

    test('SS-RENDER-07 — no JS errors on init', async ({ page }) => {
      const errors: string[] = [];
      const failed: string[] = [];
      page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
      page.on('response', (r) => {
        if (r.status() >= 400) failed.push(`[request] ${r.status()} ${r.url()}`);
      });

      await ss.open();
      await page.waitForTimeout(1500);

      const issues = [...errors, ...failed];
      expect(
        issues,
        `SS-RENDER-07 / runtime: the slideshow page reported issues attributable to theme code:\n` +
          `  ${issues.join('\n  ')}\n` +
          `The section rendered but its JavaScript threw. Markup assertions still pass — ` +
          `this is the only check that catches an uninitialised carousel.`
      ).toEqual([]);
    });

  });

  // ===========================================================
  // 2. Navigation — arrows
  // ===========================================================
  test.describe('Navigation', () => {

    test.beforeEach(async () => {
      test.skip(!(await ss.hasNextArrow()), 'This preset renders no arrow controls.');
    });

    test('SS-NAV-01 — next advances exactly one slide', async () => {
      const total = await ss.slideCount();
      const before = await ss.realIndex();
      await ss.goToNextSlide();
      const after = await ss.realIndex();

      const distance = (after - before + total) % total;
      expect(
        distance,
        `SS-NAV-01 / wrong-distance: clicking next moved ${distance} slide(s), expected 1 ` +
          `(went index ${before} → ${after} of ${total}). slidesPerGroup disagrees with ` +
          `slidesPerView, or the click handler fires more than once.`
      ).toBe(1);
    });

    test('SS-NAV-02 — next moves in the correct direction', async () => {
      const before = await ss.trackTranslate();
      await ss.goToNextSlide();
      await ss.page.waitForTimeout(500); // let the transition settle
      const after = await ss.trackTranslate();
      const delta = after - before;

      expect(
        delta,
        `SS-NAV-02 / wrong-direction: next moved the track by ${delta > 0 ? '+' : ''}` +
          `${Math.round(delta)}px. Advancing should move it LEFT (negative translateX). ` +
          `A positive delta means next and prev are wired backwards.`
      ).toBeLessThan(0);
    });

    test('SS-NAV-03 — movement distance is about one slide width', async () => {
      const width = await ss.slideWidth();
      const before = await ss.trackTranslate();
      await ss.goToNextSlide();
      await ss.page.waitForTimeout(500);
      const moved = Math.abs((await ss.trackTranslate()) - before);

      expect(
        moved,
        `SS-NAV-03 / wrong-distance: next moved the track ${Math.round(moved)}px, but one ` +
          `slide is ${Math.round(width)}px wide. A tiny delta means the transition never ` +
          `started; a huge one means it jumped past several slides.`
      ).toBeGreaterThan(width * 0.5);
      expect(moved).toBeLessThan(width * 1.8);
    });

    test('SS-NAV-04 — prev returns to the starting slide', async () => {
      test.skip(!(await ss.hasPrevArrow()), 'This preset renders no previous arrow.');

      const start = await ss.realIndex();
      await ss.goToNextSlide();
      await ss.goToPrevSlide();

      expect(
        await ss.realIndex(),
        `SS-NAV-04 / prev-broken: next then prev did not return to the starting slide ` +
          `(expected index ${start}). Prev is not wired up, or moves a different distance than next.`
      ).toBe(start);
    });

    test('SS-NAV-05 — new active slide lands inside the window', async () => {
      await spot(ss.section());
      await ss.goToNextSlide();
      await ss.page.waitForTimeout(500);

      const container = await ss.section().boundingBox();
      const active = await ss.activeSlide().boundingBox();
      const offset = Math.round((active?.x ?? 0) - (container?.x ?? 0));

      expect(
        Math.abs(offset),
        `SS-NAV-05 / off-screen: after clicking next, the active slide starts ${offset}px ` +
          `from the window's left edge. The track moved but the slides did not land where ` +
          `they should — the user sees a partially cut slide.`
      ).toBeLessThanOrEqual(4);
    });

    test('SS-NAV-06 — rapid double-click does not desync', async () => {
      await spot(ss.nextArrow());
      test.skip((await ss.slideCount()) < 3, 'Needs at least three slides.');

      await ss.nextArrow().click();
      await ss.nextArrow().click();
      await ss.page.waitForTimeout(1200);

      const index = await ss.realIndex();
      const visible = await ss.visibleSlidePosition();

      // Compare Swiper's state with the position it advertises to the
      // user on the active slide ("2 / 3") — loop-safe, unlike the raw
      // DOM position, which Swiper rotates.
      expect(
        visible,
        `SS-NAV-06 / desync: after 2 rapid next clicks, Swiper reports slide ${index + 1} ` +
          `but the visible slide advertises "${visible} / n". The transition queue and ` +
          `pagination state diverged — usually a missing "is animating" guard.`
      ).toBe(index + 1);
    });

    test('SS-NAV-07 — arrows are keyboard-operable (Enter and Space)', async () => {
      await spot(ss.nextArrow());
      for (const key of ['Enter', 'Space']) {
        const before = await ss.realIndex();
        await ss.nextArrow().focus();
        await expect(ss.nextArrow()).toBeFocused();
        await ss.page.keyboard.press(key);
        await ss.page.waitForTimeout(900);

        expect(
          await ss.realIndex(),
          `SS-NAV-07 / keyboard: the next arrow received focus but pressing ${key} did not ` +
            `change the slide. The control is likely a <div> with a click listener and no ` +
            `keydown handler. Keyboard users cannot operate this slideshow.`
        ).not.toBe(before);
      }
    });

    test('SS-NAV-08 — prev goes back exactly one slide', async () => {
      test.skip(!(await ss.hasPrevArrow()), 'This preset renders no previous arrow.');

      const total = await ss.slideCount();
      const before = await ss.realIndex();
      await ss.goToPrevSlide();
      const after = await ss.realIndex();

      // Modular distance backwards, so wrapping past slide 1 counts as 1.
      const distance = (before - after + total) % total;
      expect(
        distance,
        `SS-NAV-08 / wrong-distance: clicking prev moved ${distance} slide(s) backwards, ` +
          `expected 1 (went index ${before} → ${after} of ${total}).`
      ).toBe(1);
    });
  });

  // ===========================================================
  // 3. Loop / boundary
  // ===========================================================
  test.describe('Loop', () => {

    test('SS-LOOP-01 — loop ON wraps forward', async () => {
      const state = await ss.swiperState();
      test.skip(!state?.loop, 'Loop is disabled on this preset.');
      test.skip(!(await ss.hasNextArrow()), 'Needs arrow controls to walk the boundary.');

      const total = await ss.slideCount();
      // Walk one full cycle. Repeated entries in the trail mean the
      // carousel dead-ended rather than wrapped.
      const trail = await ss.walkNext(total);

      expect(
        trail[trail.length - 1],
        `SS-LOOP-01 / loop-broken: loop is enabled, but clicking next ${total} times through ` +
          `${total} slide(s) never returned to slide 1. Trail: ${trail.join(' → ')}. ` +
          `Repeating entries mean the carousel dead-ends instead of wrapping.`
      ).toBe(0);
    });

    // SS-LOOP-03/04/05 cover the loop-OFF behaviour. Gated by
    // `slideshow.loop` in the manifest: loop is on for all four stores
    // today, so they are not collected — set the flag to false on a
    // preset and they start running.

    test('SS-LOOP-03 — loop OFF clamps at the last slide', async () => {
      const total = await ss.slideCount();
      const trail = await ss.walkNext(total + 1);

      expect(
        trail[trail.length - 1],
        `SS-LOOP-03 / no-clamp: loop is DISABLED, but clicking next past the last slide ` +
          `wrapped round to the start. Trail: ${trail.join(' → ')}. A non-looping slideshow ` +
          `must stop at the end — silently wrapping confuses merchants who turned loop off ` +
          `deliberately.`
      ).toBe(total - 1);
    });

    test('SS-LOOP-04 — loop OFF clamps at the first slide', async () => {
      await spot(ss.prevArrow());
      test.skip(!(await ss.hasPrevArrow()), 'This preset renders no previous arrow.');

      expect(await ss.realIndex(), 'expected to start on slide 1').toBe(0);
      await ss.prevArrow().click().catch(() => {});
      await ss.page.waitForTimeout(800);

      expect(
        await ss.realIndex(),
        `SS-LOOP-04 / no-clamp: loop is DISABLED, but clicking prev on the first slide ` +
          `wrapped round to the last one.`
      ).toBe(0);
    });

    test('SS-LOOP-05 — boundary arrow is marked disabled', async () => {
      await spot(ss.nextArrow());
      test.skip(!(await ss.hasNextArrow()), 'This preset renders no arrow controls.');

      const total = await ss.slideCount();
      await ss.walkNext(total + 1);

      const arrow = ss.nextArrow();
      const disabled =
        (await arrow.getAttribute('aria-disabled')) === 'true' ||
        (await arrow.getAttribute('disabled')) !== null ||
        /disabled|lock/.test((await arrow.getAttribute('class')) ?? '');

      expect(
        disabled,
        `SS-LOOP-05 / a11y: parked on the last slide with loop disabled, but the next arrow ` +
          `is not marked disabled — no [disabled], no aria-disabled="true", no lock class. ` +
          `Keyboard and screen-reader users get no signal that the end was reached, so they ` +
          `keep pressing a control that does nothing.`
      ).toBeTruthy();
    });

    test('SS-LOOP-02 — loop ON wraps backward', async () => {
      const state = await ss.swiperState();
      test.skip(!state?.loop, 'Loop is disabled on this preset.');
      test.skip(!(await ss.hasPrevArrow()), 'This preset renders no previous arrow.');

      const total = await ss.slideCount();
      expect(await ss.realIndex(), 'expected to start on slide 1').toBe(0);
      await ss.goToPrevSlide();

      expect(
        await ss.realIndex(),
        `SS-LOOP-02 / loop-broken-backwards: the slideshow loops forwards but prev is stuck ` +
          `at slide 1. Backward wrapping is broken — a one-directional loop is still broken.`
      ).toBe(total - 1);
    });

  });

  // ===========================================================
  // 4. Pagination
  // ===========================================================
  test.describe('Pagination', () => {

    test.beforeEach(async () => {
      test.skip(!(await ss.hasBullets()), 'This preset renders no pagination dots.');
    });

    test('SS-DOT-01 — dot count equals slide count', async () => {
      await spot(ss.bullets());
      const dots = await ss.bullets().count();
      const slides = await ss.slideCount();
      expect(
        dots,
        `SS-DOT-01 / count-mismatch: ${slides} slides but ${dots} pagination dots. ` +
          `Loop clones are being counted as real slides when building pagination.`
      ).toBe(slides);
    });

    test('SS-DOT-02 — active dot matches the visible slide', async () => {
      await spot(ss.bullets());
      const index = await ss.realIndex();
      await expect(
        ss.bulletAt(index),
        `SS-DOT-02 / desync: visible slide is index ${index} but that dot is not active. ` +
          `Pagination and slide state diverged — usually realIndex vs activeIndex used ` +
          `inconsistently in loop mode.`
      ).toHaveClass(/swiper-pagination-bullet-active/);
    });

    test('SS-DOT-03 — clicking dot N jumps to slide N', async () => {
      await spot(ss.bullets());
      const dots = await ss.bullets().count();
      test.skip(dots < 2, 'Needs at least two dots.');

      const target = dots - 1;
      await ss.clickBullet(target);

      expect(
        await ss.realIndex(),
        `SS-DOT-03 / jump-failed: clicked dot index ${target} but the carousel did not land ` +
          `there. Dots are rendered but not bound, or bound to the wrong index ` +
          `(off-by-one from a loop clone offset).`
      ).toBe(target);
    });

    test('SS-DOT-04 — dots have accessible names', async () => {
      await spot(ss.bullets());
      const dots = ss.bullets();
      const count = await dots.count();
      const unnamed: number[] = [];

      for (let i = 0; i < count; i++) {
        const name = await ss.accessibleName(dots.nth(i));
        if (name.trim().length === 0) unnamed.push(i);
      }

      expect(
        unnamed,
        `SS-DOT-04 / a11y: ${unnamed.length} pagination dot(s) have no accessible name. ` +
          `A screen reader announces "button, button, button". Each needs an aria-label ` +
          `such as "Go to slide 3".`
      ).toEqual([]);
    });
  });

  // ===========================================================
  // 5. Autoplay
  // ===========================================================
  test.describe('Autoplay', () => {

    // These are gated by `slideshow.autoplay` in data/presets.json, not
    // deleted. Autoplay is off on all four stores today, so they are not
    // collected — but the moment a preset turns it on, flip the manifest
    // flag and the whole group starts running. Deleting them instead
    // (which this suite used to do) meant a newly enabled feature would
    // have had silent zero coverage.

    test('SS-AUTO-01 — autoplay ON advances unaided', async () => {
      const state = await ss.swiperState();
      const delay = state?.autoplayDelay ?? 3000;

      const before = await ss.realIndex();
      await ss.page.waitForTimeout(delay * 1.4);

      expect(
        await ss.realIndex(),
        `SS-AUTO-01 / no-advance: autoplay is enabled with a ${delay}ms interval, but the ` +
          `slide did not change after ${Math.round(delay * 1.4)}ms. The timer never started — ` +
          `usually the autoplay module is not imported, or the setting never reaches the config.`
      ).not.toBe(before);
    });

    test('SS-AUTO-02 — the interval matches the configured speed', async () => {
      const state = await ss.swiperState();
      const delay = state?.autoplayDelay ?? 3000;

      // Time two automatic advances. Roughly half or double the
      // configured delay is the signature of a double-initialised timer.
      const start = await ss.realIndex();
      const t0 = Date.now();
      await ss.waitForActiveChange(0, start);
      const measured = Date.now() - t0;

      const ratio = measured / delay;
      expect(
        ratio > 0.65 && ratio < 1.35,
        `SS-AUTO-02 / wrong-interval: configured interval is ${delay}ms, measured ${measured}ms ` +
          `between advances (${ratio.toFixed(2)}x). Roughly half means two timers are racing — ` +
          `check for a duplicate init on resize or section:load.`
      ).toBeTruthy();
    });

    test('SS-AUTO-03 — autoplay OFF stays still', async () => {
      const state = await ss.swiperState();
      test.skip(state?.autoplayEnabled !== false, 'Autoplay is enabled on this preset.');

      const before = await ss.realIndex();
      // 3s, not 8s: this proves a negative, and 8s across the full matrix
      // cost roughly two minutes for no extra confidence.
      await ss.page.waitForTimeout(3000);

      expect(
        await ss.realIndex(),
        `SS-AUTO-03 / unexpected-advance: autoplay is disabled, but the slide changed with ` +
          `no interaction. The autoplay setting is not being respected — the timer starts ` +
          `regardless of config.`
      ).toBe(before);
    });

    test('SS-AUTO-04 — autoplay pauses while hovered', async () => {
      await spot(ss.section());
      const delay = (await ss.swiperState())?.autoplayDelay ?? 3000;

      await ss.section().hover();
      const before = await ss.realIndex();
      await ss.page.waitForTimeout(delay * 1.6);

      expect(
        await ss.realIndex(),
        `SS-AUTO-04 / no-pause-on-hover: hovered for ${Math.round(delay * 1.6)}ms ` +
          `(interval ${delay}ms) and it advanced anyway. Content must not move out from ` +
          `under someone who is reading it.`
      ).toBe(before);
    });

    test('SS-AUTO-05 — autoplay resumes after the pointer leaves', async () => {
      await spot(ss.section());
      const delay = (await ss.swiperState())?.autoplayDelay ?? 3000;

      await ss.section().hover();
      await ss.page.waitForTimeout(delay * 0.5);
      await ss.resetPointer();

      const before = await ss.realIndex();
      await ss.page.waitForTimeout(delay * 1.6);

      expect(
        await ss.realIndex(),
        `SS-AUTO-05 / no-resume: autoplay paused on hover but never restarted after the ` +
          `pointer left. Usually a mouseleave handler that clears the timer instead of ` +
          `starting it again.`
      ).not.toBe(before);
    });

    test('SS-AUTO-06 — autoplay pauses on keyboard focus', async () => {
      await spot(ss.activeSlide());
      const delay = (await ss.swiperState())?.autoplayDelay ?? 3000;

      const focusable = ss.activeSlide().locator('a, button').first();
      test.skip((await focusable.count()) === 0, 'The active slide has nothing focusable.');
      await focusable.focus();

      const before = await ss.realIndex();
      await ss.page.waitForTimeout(delay * 1.6);

      expect(
        await ss.realIndex(),
        `SS-AUTO-06 / no-pause-on-focus: focused a link inside the active slide and the ` +
          `carousel advanced anyway. A keyboard user reading the slide is carried away ` +
          `mid-sentence — WCAG 2.2.2 requires a way to pause moving content.`
      ).toBe(before);
    });

    test('SS-AUTO-07 — manual navigation resets the timer', async () => {
      const delay = (await ss.swiperState())?.autoplayDelay ?? 3000;
      test.skip(!(await ss.hasNextArrow()), 'Needs an arrow to navigate manually.');

      await ss.goToNextSlide();
      const afterClick = await ss.realIndex();

      // Straight after a manual move the timer should restart from zero,
      // not fire moments later on its old schedule.
      await ss.page.waitForTimeout(delay * 0.4);

      expect(
        await ss.realIndex(),
        `SS-AUTO-07 / timer-fights-user: autoplay advanced only ${Math.round(delay * 0.4)}ms ` +
          `after a manual click (interval ${delay}ms). The slide the user chose vanishes ` +
          `almost immediately.`
      ).toBe(afterClick);
    });

    test('SS-AUTO-08 — autoplay stops when the tab is hidden', async ({ page }) => {
      const delay = (await ss.swiperState())?.autoplayDelay ?? 3000;

      const before = await ss.realIndex();
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { value: true, configurable: true });
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await page.waitForTimeout(delay * 2);

      expect(
        await ss.realIndex(),
        `SS-AUTO-08 / runs-when-hidden: the carousel kept advancing after the tab was marked ` +
          `hidden. That drains battery in a background tab, and the visitor returns to a ` +
          `slideshow that has jumped several slides.`
      ).toBe(before);
    });

    test('SS-AUTO-09 — no timer leak after re-initialisation', async ({ page }) => {
      const delay = (await ss.swiperState())?.autoplayDelay ?? 3000;

      // A resize is the cheapest way to provoke the theme's re-init path.
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.waitForTimeout(800);
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForTimeout(800);

      const start = await ss.realIndex();
      const t0 = Date.now();
      await ss.waitForActiveChange(0, start);
      const measured = Date.now() - t0;

      expect(
        measured,
        `SS-AUTO-09 / timer-leak: after re-initialising, the interval measured ${measured}ms ` +
          `against a configured ${delay}ms. A markedly shorter interval means the previous ` +
          `timer was never cleared and two now run at once — each re-init compounds it.`
      ).toBeGreaterThan(delay * 0.65);
    });
  });

  // ===========================================================
  // 6. Touch / swipe  (mobile + tablet projects)
  // ===========================================================
  test.describe('Touch', () => {

    test.beforeEach(async ({ isMobile }) => {
      test.skip(!isMobile, 'Swipe is exercised on the touch projects only.');
    });

    test('SS-TOUCH-01 — swipe left advances', async () => {
      test.skip((await ss.slideCount()) < 2, 'Needs at least two slides.');
      const before = await ss.realIndex();
      await ss.swipe(-260);

      expect(
        await ss.realIndex(),
        `SS-TOUCH-01 / no-swipe: dragged 260px left across the slideshow and the slide did ` +
          `not change. Touch handling is not enabled, or touch-action is blocking the gesture.`
      ).not.toBe(before);
    });

    test('SS-TOUCH-02 — swipe right goes back', async () => {
      test.skip((await ss.slideCount()) < 2, 'Needs at least two slides.');
      await ss.swipe(-260);
      const mid = await ss.realIndex();
      await ss.swipe(260);

      expect(
        await ss.realIndex(),
        `SS-TOUCH-02 / no-swipe-back: dragged 260px right and the slide did not change. ` +
          `Forward swipe works, backward does not — a one-directional gesture handler.`
      ).not.toBe(mid);
    });

    test('SS-TOUCH-03 — sub-threshold swipe snaps back', async () => {
      const before = await ss.realIndex();
      const trackBefore = await ss.trackTranslate();

      // 20px is well under Swiper's ~64px threshold: the track must
      // return to where it started rather than resting mid-slide.
      await ss.swipe(-20);
      await ss.page.waitForTimeout(800);

      expect(
        await ss.realIndex(),
        `SS-TOUCH-03 / unexpected-advance: a 20px drag (below the ~64px threshold) changed ` +
          `the slide. Short drags must not navigate.`
      ).toBe(before);

      const drift = Math.abs((await ss.trackTranslate()) - trackBefore);
      expect(
        drift,
        `SS-TOUCH-03 / stuck-mid-slide: after a 20px drag the track sits ${Math.round(drift)}px ` +
          `from where it started instead of snapping back. The user sees two half-slides.`
      ).toBeLessThanOrEqual(4);
    });

    test('SS-TOUCH-04 — vertical page scroll still works', async ({ page }) => {
      await spot(ss.section());
      await page.evaluate(() => window.scrollTo(0, 0));
      const box = await ss.section().boundingBox();
      const x = box!.x + box!.width / 2;
      const y = box!.y + box!.height / 2;

      await page.mouse.move(x, y);
      await page.mouse.down();
      for (let i = 1; i <= 6; i++) await page.mouse.move(x, y - i * 40, { steps: 2 });
      await page.mouse.up();
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(600);

      expect(
        await page.evaluate(() => window.scrollY),
        `SS-TOUCH-04 / scroll-blocked: dragged vertically starting inside a slide and the ` +
          `page did not scroll. The slideshow is capturing vertical gestures — on mobile the ` +
          `user cannot scroll past the hero.`
      ).toBeGreaterThan(0);
    });
  });

  // ===========================================================
  // 7. Layout & responsive
  // ===========================================================
  test.describe('Layout', () => {

    test('SS-LAYOUT-01 — no horizontal page overflow', async ({ page }) => {
      await assertNoPageOverflow(page);
    });

    test('SS-LAYOUT-02 — content stays inside the slide box', async () => {
      // Active slide only: off-screen slides sit outside the visible
      // window by design, so measuring them here reports false overflow.
      await assertContentInsideBox(ss.activeSlide(), ss.activeTextBlocks());
    });

    test('SS-LAYOUT-03 — slide elements do not overlap', async () => {
      await spot(ss.activeTextBlocks());
      const blocks = ss.activeTextBlocks();
      const ctas = ss.activeSlide().locator('a.btn');

      // Collect the visible copy blocks plus buttons of the ACTIVE slide.
      const boxes: { label: string; box: NonNullable<Awaited<ReturnType<typeof ss.activeSlide>['boundingBox']>> }[] = [];
      for (const group of [blocks, ctas]) {
        const count = await group.count();
        for (let i = 0; i < count; i++) {
          const el = group.nth(i);
          if (!(await el.isVisible())) continue;
          const box = await el.boundingBox();
          if (!box || box.width === 0 || box.height === 0) continue;
          boxes.push({ label: (await el.innerText()).trim().slice(0, 24) || `el[${i}]`, box });
        }
      }
      test.skip(boxes.length < 2, 'Needs at least two visible elements to compare.');

      for (let a = 0; a < boxes.length; a++) {
        for (let b = a + 1; b < boxes.length; b++) {
          const A = boxes[a].box;
          const B = boxes[b].box;
          const overlapX = Math.min(A.x + A.width, B.x + B.width) - Math.max(A.x, B.x);
          const overlapY = Math.min(A.y + A.height, B.y + B.height) - Math.max(A.y, B.y);
          if (overlapX <= 0) continue; // no horizontal intersection at all

          expect(
            overlapY,
            `SS-LAYOUT-03 / sibling-overlap: "${boxes[a].label}" overlaps "${boxes[b].label}" ` +
              `by ${Math.round(overlapY)}px vertically. Two elements occupy the same space — ` +
              `usually absolute positioning that assumed a shorter heading.`
          ).toBeLessThanOrEqual(2);
        }
      }
    });

    test('SS-LAYOUT-10 — button labels are centred inside their button', async () => {
      await spot(ss.activeCtas());
      const ctas = ss.activeCtas();
      const count = await ctas.count();
      test.skip(count === 0, 'The active slide has no buttons.');

      for (let i = 0; i < count; i++) {
        const cta = ctas.nth(i);
        if (!(await cta.isVisible())) continue;

        const m = await ss.labelCentring(cta);
        const label = (await cta.textContent())?.trim().slice(0, 24) || `button ${i}`;

        expect(
          Math.abs(m.offCentre),
          `SS-LAYOUT-10 / label-off-centre: the text in "${label}" sits ` +
            `${Math.round(m.offCentre)}px from the button's centre ` +
            `(text-align: ${m.textAlign}). The label should be centred in its button.`
        ).toBeLessThanOrEqual(2);

        expect(
          Math.abs(m.padLeft - m.padRight),
          `SS-LAYOUT-10 / uneven-padding: "${label}" has ${m.padLeft}px padding on the left ` +
            `and ${m.padRight}px on the right. Uneven padding pushes the label off centre as ` +
            `soon as the text length changes, even when it looks fine today.`
        ).toBeLessThanOrEqual(1);
      }
    });

    test('SS-LAYOUT-11 — slide text does not break or clip', async ({ page }) => {
      await spot(ss.activeTextBlocks());
      const check = async (width: number) => {
        await page.setViewportSize({ width, height: 900 });
        await page.waitForTimeout(500);

        const blocks = ss.activeTextBlocks();
        const n = await blocks.count();
        const problems: string[] = [];

        for (let i = 0; i < n; i++) {
          const block = blocks.nth(i);
          if (!(await block.isVisible())) continue;

          const m = await ss.textBreakMetrics(block);
          if (m.clippedX) {
            problems.push(
              `${width}px — "${m.label}" is cut off horizontally ` +
                `(needs ${m.scrollW}px, has ${m.clientW}px)`
            );
          }
          if (m.clippedY) problems.push(`${width}px — "${m.label}" is cut off vertically`);
          if (!m.canBreakLongWords) {
            problems.push(
              `${width}px — "${m.label}" cannot wrap a long unbroken word ` +
                `(no overflow-wrap: anywhere or word-break). A pasted URL would blow the layout out.`
            );
          }
        }
        return problems;
      };

      // Narrow widths are where wrapping actually fails.
      const problems = [...(await check(1440)), ...(await check(390))];

      expect(
        problems,
        `SS-LAYOUT-11 / text-break: slide copy breaks badly:\n  ${problems.join('\n  ')}`
      ).toEqual([]);
    });

    test('SS-LAYOUT-09 — layout intact across the viewport matrix', async ({ page }) => {
      await spot(ss.section());
      const broken: string[] = [];
      for (const width of [1440, 1280, 810, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.waitForTimeout(500);

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        const visible = await ss.section().isVisible();
        const box = await ss.section().boundingBox();

        if (overflow > 2 || !visible || (box?.height ?? 0) < 40) {
          broken.push(`${width}px: overflow ${overflow}px, visible ${visible}, height ${Math.round(box?.height ?? 0)}px`);
        }
      }

      expect(
        broken,
        `SS-LAYOUT-09 / responsive: the slideshow broke at:\n  ${broken.join('\n  ')}`
      ).toEqual([]);
    });

    test('SS-LAYOUT-06 — slide height settings are respected', async ({ page }) => {
      await spot(ss.slideAt(0));
      const settings = await ss.heightSettings();
      test.skip(
        !settings.desktop && !settings.mobile,
        'This preset sets no --desktop-height / --mobile-height custom properties.'
      );

      const measure = async (w: number, h: number) => {
        await page.setViewportSize({ width: w, height: h });
        await page.waitForTimeout(700);
        return (await ss.slideAt(0).boundingBox())?.height ?? 0;
      };

      const desktopRendered = settings.desktop ? await measure(1440, 900) : null;
      const mobileRendered = settings.mobile ? await measure(390, 844) : null;

      // Checking both breakpoints together is what makes a failure
      // diagnosable: if desktop matches its variable exactly and mobile
      // does not, the variable clearly IS meant to drive slide height
      // and only the mobile mapping is broken.
      const report =
        `desktop: --desktop-height ${settings.desktop}px vs rendered ` +
        `${desktopRendered === null ? 'n/a' : Math.round(desktopRendered)}px | ` +
        `mobile: --mobile-height ${settings.mobile}px vs rendered ` +
        `${mobileRendered === null ? 'n/a' : Math.round(mobileRendered)}px`;

      // Band allows for padding and safe-area insets.
      if (desktopRendered !== null) {
        expect(
          Math.abs(desktopRendered - settings.desktop!),
          `SS-LAYOUT-06 / height: the desktop height setting is not reaching the DOM. ${report}`
        ).toBeLessThanOrEqual(settings.desktop! * 0.25);
      }
      if (mobileRendered !== null) {
        expect(
          Math.abs(mobileRendered - settings.mobile!),
          `SS-LAYOUT-06 / height: the mobile height setting is not reaching the DOM, or its ` +
            `CSS-var mapping is wrong. ${report}`
        ).toBeLessThanOrEqual(settings.mobile! * 0.25);
      }
    });

    test('SS-LAYOUT-07 — mobile image swaps in below the breakpoint', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForTimeout(600);
      const desktopSrc = await ss.activeImageSource();
      test.skip(!desktopSrc, 'This slideshow renders no image on the active slide.');

      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(900);
      const mobileSrc = await ss.activeImageSource();

      // A separate mobile asset is optional; when the theme ships one it
      // must actually be selected below the breakpoint.
      const hasMobileAsset = /mob|mobile/i.test(mobileSrc) || /mob|mobile/i.test(desktopSrc);
      test.skip(!hasMobileAsset, 'This preset configures no separate mobile image.');

      expect(
        mobileSrc,
        `SS-LAYOUT-07 / mobile-variant: at 390px the slide still uses ` +
          `"${desktopSrc.split('/').pop()}". A separate mobile image is configured but the ` +
          `<picture> source or srcset media condition is not matching at this width.`
      ).not.toBe(desktopSrc);
    });

    test('SS-LAYOUT-05 — breakpoint boundaries behave', async ({ page }) => {
      await spot(ss.section());
      const results: string[] = [];
      // Widths set by the team. Note these are standard layout widths
      // rather than boundary PAIRS: the original 767/768 and 1023/1024
      // pairing let a failure say "fine at 767, broken at 768", which
      // pins the fault to one media query. With single widths a failure
      // still surfaces, but narrowing it takes a manual check either side.
      for (const width of [1440, 1200, 1024, 768]) {
        await page.setViewportSize({ width, height: 900 });
        await page.waitForTimeout(500);

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        const visible = await ss.section().isVisible();
        if (overflow > 2 || !visible) {
          results.push(`${width}px: overflow ${overflow}px, section visible ${visible}`);
        }
      }

      expect(
        results,
        `SS-LAYOUT-05 / breakpoint: layout broke at specific widths:\n  ${results.join('\n  ')}\n` +
          `A width matching two media queries at once, or falling in a gap between them.`
      ).toEqual([]);
    });

    test('SS-LAYOUT-08 — no layout shift after init', async ({ page }) => {
      const score = await page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            let total = 0;
            const observer = new PerformanceObserver((list) => {
              for (const entry of list.getEntries() as any[]) {
                if (!entry.hadRecentInput) total += entry.value;
              }
            });
            observer.observe({ type: 'layout-shift', buffered: true });
            setTimeout(() => {
              observer.disconnect();
              resolve(total);
            }, 3000);
          })
      );

      expect(
        score,
        `SS-LAYOUT-08 / layout-shift: initial render shifted the page by a cumulative score ` +
          `of ${score.toFixed(3)} (budget 0.10). Usually images without width/height, or a ` +
          `container that resizes once its JS initialises.`
      ).toBeLessThanOrEqual(0.1);
    });
  });

  // ===========================================================
  // 8. Images & media
  // ===========================================================
  test.describe('Media', () => {

    test('SS-MEDIA-01 — each slide has a distinct image', async () => {
      await spot(ss.images());
      const sources = await ss.images().evaluateAll((imgs) =>
        imgs.map((i) => (i.getAttribute('src') ?? '').split('?')[0])
      );
      test.skip(sources.length === 0, 'This slideshow uses no images.');

      const unique = new Set(sources);
      expect(
        unique.size,
        `SS-MEDIA-01 / wrong-image: ${sources.length} slide image(s) resolve to only ` +
          `${unique.size} distinct source(s). The image may be read from the section rather ` +
          `than the block, so every slide gets slide 1's image.`
      ).toBe(sources.length);
    });

    test('SS-MEDIA-02 — images have intrinsic dimensions', async () => {
      await spot(ss.images());
      const missing = await ss.images().evaluateAll((imgs) =>
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
        `SS-MEDIA-02 / no-dimensions: ${missing.length} slide image(s) have neither ` +
          `width/height attributes nor an aspect-ratio:\n  ${missing.join(', ')}\n` +
          `The browser cannot reserve space before load, which causes layout shift.`
      ).toEqual([]);
    });

    test('SS-MEDIA-03 — first slide image is not lazy-loaded', async () => {
      await spot(ss.images());
      const first = ss.images().first();
      test.skip((await ss.images().count()) === 0, 'This slideshow uses no images.');

      const loading = await first.getAttribute('loading');
      const priority = await first.getAttribute('fetchpriority');

      expect(
        loading,
        `SS-MEDIA-03 / lcp-lazy: the first slide's image has loading="${loading}". ` +
          `This is the LCP element — lazy-loading it delays the largest paint measurably ` +
          `and costs Core Web Vitals score. It should be loading="eager" with ` +
          `fetchpriority="high".`
      ).not.toBe('lazy');

      expect(
        priority,
        `SS-MEDIA-03 / lcp-priority: the first slide's image has ` +
          `fetchpriority="${priority}". As the LCP element it should declare ` +
          `fetchpriority="high" so the browser fetches it ahead of other assets.`
      ).toBe('high');
    });

    test('SS-MEDIA-04 — off-screen slide images are lazy-loaded', async () => {
      await spot(ss.slides());
      const eager = await ss.slides().evaluateAll((slides) =>
        slides
          .filter((s) => !s.classList.contains('swiper-slide-active'))
          .flatMap((s) => [...s.querySelectorAll('img')])
          .filter((i) => (i.getAttribute('loading') ?? 'eager') === 'eager')
          .map((i) => (i.getAttribute('src') ?? '').split('/').pop())
      );

      expect(
        eager,
        `SS-MEDIA-04 / eager-offscreen: ${eager.length} off-screen slide image(s) load ` +
          `eagerly:\n  ${eager.join(', ')}\nEvery slide image downloads on page load.`
      ).toEqual([]);
    });

    test('SS-MEDIA-06 — video slides are muted and inline', async ({ page }) => {
      const videos = page.locator('.slideshow-section video');
      const count = await videos.count();
      test.skip(count === 0, 'This slideshow has no video slides.');

      const bad = await videos.evaluateAll((els) =>
        (els as HTMLVideoElement[])
          .filter((v) => v.autoplay && (!v.muted || !v.hasAttribute('playsinline')))
          .map((v) => `muted=${v.muted} playsinline=${v.hasAttribute('playsinline')}`)
      );

      expect(
        bad,
        `SS-MEDIA-06 / video: ${bad.length} video slide(s) autoplay without muted+playsinline:\n` +
          `  ${bad.join('\n  ')}\nBrowsers block autoplay for unmuted video, so the slide ` +
          `renders a frozen first frame on every visit.`
      ).toEqual([]);
    });
  });

  // ===========================================================
  // 9. Links & buttons
  // ===========================================================
  test.describe('Links', () => {

    test('SS-LINK-01/03/04 — no dead, unsafe or empty-shell anchors', async () => {
      await assertNoDeadOrUnsafeLinks(ss.section());
    });

    test('SS-LINK-02 — button links resolve', async ({ page, preset }) => {
      await spot(ss.ctas());
      const ctas = ss.ctas();
      const count = await ctas.count();
      test.skip(count === 0, 'This slideshow has no CTA buttons configured.');

      const targets = new Set<string>();
      for (let i = 0; i < count; i++) {
        const href = await ctas.nth(i).getAttribute('href');
        if (href && href !== '#' && href !== '/#') targets.add(href);
      }
      test.skip(targets.size === 0, 'All CTAs are placeholder links (href="#").');

      // NOTE: a soft-404 (200 with "not found" content) is NOT caught here.
      for (const href of targets) {
        const res = await page.request.get(href.startsWith('/') ? preset.url + href : href);
        expect(
          res.status(),
          `SS-LINK-02 / broken-link: "${href}" returned ${res.status()}. ` +
            `Checked with a GET following redirects.`
        ).toBeLessThan(400);
      }

      // …then prove one actually navigates in the UI. An href that
      // resolves over HTTP can still be blocked by a click handler.
      const first = [...targets][0];
      await ctas.filter({ has: page.locator(`[href="${first}"]`) }).first()
        .or(ctas.first())
        .click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(new RegExp(first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    });
  });

  // ===========================================================
  // 10. Accessibility
  // ===========================================================
  test.describe('Accessibility', () => {

    test('SS-A11Y-01 — region has an accessible name', async () => {
      await spot(ss.section());
      const section = ss.section();
      const name =
        (await section.getAttribute('aria-label')) ??
        (await section.getAttribute('aria-labelledby')) ??
        '';
      const roleDesc = await section.getAttribute('aria-roledescription');

      expect(
        name.trim().length,
        `SS-A11Y-01 / unnamed-region: the slideshow container has no accessible name ` +
          `(aria-roledescription="${roleDesc}"). A screen reader announces "region" with no ` +
          `indication of what it contains. Add aria-label and aria-roledescription="carousel".`
      ).toBeGreaterThan(0);
    });

    test('SS-A11Y-02 — arrows have accessible names', async () => {
      await spot(ss.nextArrow());
      const hasNext = await ss.hasNextArrow();
      const hasPrev = await ss.hasPrevArrow();
      test.skip(!hasNext && !hasPrev, 'This preset renders no arrow controls.');

      const unnamed: string[] = [];
      if (hasNext && (await ss.accessibleName(ss.nextArrow())).trim() === '') unnamed.push('next');
      if (hasPrev && (await ss.accessibleName(ss.prevArrow())).trim() === '') unnamed.push('prev');

      expect(
        unnamed,
        `SS-A11Y-02 / unnamed-controls: ${unnamed.length} arrow control(s) have no accessible ` +
          `name (${unnamed.join(', ')}). Announced as "button, button".`
      ).toEqual([]);
    });

    test('SS-A11Y-03 — off-screen slides hidden from assistive tech', async () => {
      await spot(ss.slides());
      const exposed = await ss.slides().evaluateAll((slides) =>
        slides
          .filter((s) => !s.classList.contains('swiper-slide-active'))
          .filter((s) => s.getAttribute('aria-hidden') !== 'true' && !s.hasAttribute('inert'))
          .map((s) => s.getAttribute('aria-label') ?? 'slide')
      );

      expect(
        exposed,
        `SS-A11Y-03 / exposed-slides: ${exposed.length} off-screen slide(s) are visible to ` +
          `assistive tech (no aria-hidden="true" and not inert): ${exposed.join(', ')}. ` +
          `A screen reader reads every slide heading in sequence as though all were on screen.`
      ).toEqual([]);
    });

    test('SS-A11Y-04 — active slide is NOT hidden', async () => {
      await spot(ss.activeSlide());
      const hidden = await ss.activeSlide().getAttribute('aria-hidden');
      expect(
        hidden,
        `SS-A11Y-04 / hidden-active: the currently visible slide has aria-hidden="true". ` +
          `The slide a sighted user is looking at is invisible to a screen reader.`
      ).not.toBe('true');
    });

    test('SS-A11Y-05 — no keyboard trap', async ({ page }) => {
      await spot(ss.section());
      // Start inside the slideshow, then Tab out. Focus must eventually
      // leave the section rather than cycling inside it forever.
      const firstFocusable = ss.section().locator('a, button').first();
      test.skip((await firstFocusable.count()) === 0, 'Slideshow has no focusable elements.');
      await firstFocusable.focus();

      let escaped = false;
      for (let i = 0; i < 25; i++) {
        await page.keyboard.press('Tab');
        const inside = await page.evaluate(() => {
          const active = document.activeElement;
          const section = document.querySelector('.slideshow-section');
          return !!(active && section && section.contains(active));
        });
        if (!inside) {
          escaped = true;
          break;
        }
      }

      expect(
        escaped,
        `SS-A11Y-05 / keyboard-trap: pressed Tab 25 times from inside the slideshow and focus ` +
          `never left the section. A keyboard user cannot reach the rest of the page — ` +
          `usually a focus-wrapping handler intended for a modal.`
      ).toBeTruthy();
    });

    test('SS-A11Y-06 — arrows and dots have a visible focus indicator', async () => {
      await spot(ss.nextArrow());
      const controls: { label: string; locator: ReturnType<typeof ss.nextArrow> }[] = [];
      if (await ss.hasNextArrow()) controls.push({ label: 'next arrow', locator: ss.nextArrow() });
      if (await ss.hasPrevArrow()) controls.push({ label: 'prev arrow', locator: ss.prevArrow() });
      if (await ss.hasBullets()) controls.push({ label: 'pagination dot', locator: ss.bulletAt(0) });
      test.skip(controls.length === 0, 'This preset renders no focusable carousel controls.');

      const style = (el: Element) => {
        const s = getComputedStyle(el);
        return `${s.outlineWidth}|${s.outlineStyle}|${s.boxShadow}|${s.borderColor}|${s.backgroundColor}`;
      };

      for (const { label, locator } of controls) {
        const before = await locator.evaluate(style);
        await locator.focus();
        const after = await locator.evaluate(style);

        expect(
          after,
          `SS-A11Y-06 / no-focus-ring: the ${label} shows no visible focus indicator when ` +
            `focused (outline, box-shadow, border and background all unchanged). ` +
            `Keyboard users cannot tell where they are.`
        ).not.toBe(before);
      }
    });

    test('SS-A11Y-07 — focus does not land on off-screen slide links', async () => {
      const offscreen = ss.offscreenFocusables();
      const count = await offscreen.count();
      test.skip(count === 0, 'No focusable elements inside off-screen slides.');

      // Anything focusable in a slide the user cannot see must be taken
      // out of the tab order (tabindex="-1", or an inert/aria-hidden
      // ancestor); otherwise Tab scrolls to something invisible.
      const reachable = await offscreen.evaluateAll((els) =>
        els
          .filter((el) => {
            if (el.getAttribute('tabindex') === '-1') return false;
            if (el.closest('[inert]')) return false;
            if (el.closest('[aria-hidden="true"]')) return false;
            return true;
          })
          .map((el) => (el.textContent ?? '').trim().slice(0, 24) || el.tagName.toLowerCase())
      );

      expect(
        reachable,
        `SS-A11Y-07 / offscreen-focus: ${reachable.length} focusable element(s) inside ` +
          `off-screen slides are still in the tab order: ${reachable.join(', ')}. ` +
          `Tab moves focus to something outside the visible window and the user loses ` +
          `their place.`
      ).toEqual([]);
    });

    test('SS-A11Y-13 — controls are big enough to tap', async () => {
      await spot(ss.nextArrow());
      const MIN = 44; // Apple HIG / WCAG 2.5.5 AAA. WCAG 2.2 AA asks 24.
      const controls: { label: string; locator: ReturnType<typeof ss.nextArrow> }[] = [];
      if (await ss.hasNextArrow()) controls.push({ label: 'next arrow', locator: ss.nextArrow() });
      if (await ss.hasPrevArrow()) controls.push({ label: 'prev arrow', locator: ss.prevArrow() });
      if (await ss.hasBullets()) {
        const n = await ss.bullets().count();
        for (let i = 0; i < n; i++) controls.push({ label: `dot ${i + 1}`, locator: ss.bulletAt(i) });
      }
      test.skip(controls.length === 0, 'This preset renders no carousel controls.');

      const undersized: string[] = [];
      for (const { label, locator } of controls) {
        if (!(await locator.isVisible())) continue;
        const box = await locator.boundingBox();
        if (!box) continue;
        if (box.width < MIN || box.height < MIN) {
          undersized.push(`${label}: ${Math.round(box.width)}x${Math.round(box.height)}px`);
        }
      }

      expect(
        undersized,
        `SS-A11Y-13 / target-size: ${undersized.length} control(s) are smaller than ` +
          `${MIN}x${MIN}px and are hard to tap accurately:\n  ${undersized.join('\n  ')}\n` +
          `The visible dot can stay small — enlarge the tappable area with padding or a ` +
          `::before overlay.`
      ).toEqual([]);
    });

    test('SS-A11Y-14 — pagination dots are keyboard-operable', async () => {
      await spot(ss.bullets());
      test.skip(!(await ss.hasBullets()), 'This preset renders no pagination dots.');
      const count = await ss.bullets().count();
      test.skip(count < 2, 'Needs at least two dots to move between.');

      const target = count - 1;
      const dot = ss.bulletAt(target);

      await dot.focus();
      await expect(
        dot,
        `SS-A11Y-14 / not-focusable: pagination dot ${target + 1} cannot receive keyboard ` +
          `focus, so a keyboard user cannot reach it at all.`
      ).toBeFocused();

      const before = await ss.realIndex();
      await ss.page.keyboard.press('Enter');
      await ss.page.waitForTimeout(900);

      expect(
        await ss.realIndex(),
        `SS-A11Y-14 / keyboard: dot ${target + 1} took focus but pressing Enter did not change ` +
          `the slide. Dots are reachable by keyboard but not operable by it.`
      ).not.toBe(before);
    });

    test('SS-A11Y-08 — text contrast is at least 4.5:1 on every slide', async ({ page, preset }) => {
      // Contrast is computed from RENDERED colour, which is exactly what
      // a preset changes — so this runs on all four. It also walks every
      // slide, because slide 2's copy can sit over a much lighter image
      // than slide 1's.
      const total = await ss.slideCount();
      const canAdvance = (await ss.hasNextArrow()) || (await ss.hasBullets());
      const failures: string[] = [];

      for (let i = 0; i < (canAdvance ? total : 1); i++) {
        const results = await new AxeBuilder({ page })
          .include('.slideshow-section')
          .withRules(['color-contrast'])
          .analyze();

        for (const violation of results.violations) {
          for (const node of violation.nodes) {
            failures.push(`  slide ${i + 1}: ${node.target} — ${node.failureSummary?.split('\n')[1] ?? ''}`);
          }
        }

        if (i < total - 1 && canAdvance) {
          if (await ss.hasNextArrow()) await ss.goToNextSlide();
          else await ss.clickBullet(i + 1);
          await page.waitForTimeout(600);
        }
      }

      expect(
        failures,
        `SS-A11Y-08 / contrast: text in the slideshow fails the 4.5:1 minimum on ` +
          `"${preset.label}". Contrast depends on the rendered colour, so a slide that ` +
          `passes on one preset can fail on another:\n${failures.join('\n')}` +
          (canAdvance ? '' : '\n(Only slide 1 could be checked — this preset has no controls to advance.)')
      ).toEqual([]);
    });

    test('SS-A11Y-09 — prefers-reduced-motion is respected', async ({ page }) => {
      await spot(ss.nextArrow());
      test.skip(!(await ss.hasNextArrow()), 'Needs arrow controls to trigger a transition.');

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await ss.open();
      await ss.nextArrow().click();

      const duration = await ss
        .section()
        .locator('.swiper-wrapper')
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration) * 1000);

      expect(
        duration,
        `SS-A11Y-09 / reduced-motion: with prefers-reduced-motion: reduce, slide transitions ` +
          `still animate (measured ${Math.round(duration)}ms). Under reduced motion, autoplay ` +
          `must stop and transitions should be instant.`
      ).toBeLessThanOrEqual(50);
    });

    test('SS-A11Y-10 — live region announces politely', async () => {
      const assertive = await ss
        .section()
        .locator('[aria-live="assertive"]')
        .count();
      const state = await ss.swiperState();

      // Assertive interrupts a screen reader; only a problem while
      // content moves on its own.
      expect(
        assertive > 0 && state?.autoplayEnabled === true,
        `SS-A11Y-10 / live-region: slide changes are announced via aria-live="assertive" ` +
          `while autoplay is enabled. Assertive interrupts the screen reader on every ` +
          `advance. Use aria-live="polite" and suppress announcements while autoplay runs.`
      ).toBeFalsy();
    });

    test('SS-A11Y-11 — every slide image has alt text', async () => {
      const missing = await ss
        .section()
        .locator('img')
        .evaluateAll((imgs) =>
          imgs
            .filter((i) => (i.getAttribute('alt') ?? '').trim() === '')
            .map((i) => (i.getAttribute('src') ?? '').split('/').pop())
        );

      expect(
        missing,
        `SS-A11Y-11 / image-alt: ${missing.length} slideshow image(s) have no alt text:\n` +
          `  ${missing.join('\n  ')}`
      ).toEqual([]);
    });

    test('SS-A11Y-12 — no critical axe violations', async ({ page }) => {
      const results = await new AxeBuilder({ page }).include('.slideshow-section').analyze();
      const critical = results.violations.filter((v) => v.impact === 'critical');

      expect(
        critical,
        `SS-A11Y-12 / axe: ${critical.length} critical violation(s):\n` +
          critical.map((v) => `  ${v.id}: ${v.help} → ${v.nodes[0]?.target}`).join('\n')
      ).toEqual([]);
    });
  });

  // ===========================================================
  // 11. Hover states
  // ===========================================================
  // Pointer-only: not collected on the touch projects, where hover is
  // not a state a real user can reach.
  test.describe('Hover states', () => {

    test('SS-HOVER-01 — CTA buttons react to hover', async () => {
      await spot(ss.ctas());
      const ctas = ss.ctas();
      const count = await ctas.count();
      test.skip(count === 0, 'This slideshow has no CTA buttons.');

      for (let i = 0; i < count; i++) {
        const cta = ctas.nth(i);
        if (!(await cta.isVisible())) continue;

        await ss.resetPointer();
        const resting = await ss.styleSnapshot(cta);
        await ss.hoverAndSettle(cta);
        const hovered = await ss.styleSnapshot(cta);

        const label = (await cta.textContent())?.trim().slice(0, 24) || `CTA ${i}`;
        expect(
          hovered,
          `SS-HOVER-01 / no-hover-state: the button "${label}" looks identical on hover — ` +
            `background, text colour, border, opacity, shadow, transform and filter are all ` +
            `unchanged after 450ms. A button that gives no feedback reads as not clickable.\n` +
            `  resting: ${resting}\n  hovered: ${hovered}`
        ).not.toBe(resting);
      }
    });

    test('SS-HOVER-02 — carousel arrows react to hover', async () => {
      await spot(ss.nextArrow());
      const controls: { label: string; locator: ReturnType<typeof ss.nextArrow> }[] = [];
      if (await ss.hasNextArrow()) controls.push({ label: 'next arrow', locator: ss.nextArrow() });
      if (await ss.hasPrevArrow()) controls.push({ label: 'prev arrow', locator: ss.prevArrow() });
      test.skip(controls.length === 0, 'This preset renders no arrow controls.');

      for (const { label, locator } of controls) {
        await ss.resetPointer();
        const resting = await ss.styleSnapshot(locator);
        await ss.hoverAndSettle(locator);
        const hovered = await ss.styleSnapshot(locator);

        expect(
          hovered,
          `SS-HOVER-02 / no-hover-state: the ${label} looks identical on hover. ` +
            `Carousel arrows sit over imagery, so hover feedback is often the only cue ` +
            `that they are controls at all.\n  resting: ${resting}\n  hovered: ${hovered}`
        ).not.toBe(resting);
      }
    });

    test('SS-HOVER-03 — pagination dots react to hover', async () => {
      await spot(ss.bullets());
      test.skip(!(await ss.hasBullets()), 'This preset renders no pagination dots.');

      // Use an INACTIVE dot: the active one already carries its own
      // styling, which would mask a missing hover rule.
      const count = await ss.bullets().count();
      const index = count > 1 ? count - 1 : 0;
      const dot = ss.bulletAt(index);

      await ss.resetPointer();
      const resting = await ss.styleSnapshot(dot);
      await ss.hoverAndSettle(dot);
      const hovered = await ss.styleSnapshot(dot);

      expect(
        hovered,
        `SS-HOVER-03 / no-hover-state: pagination dot ${index + 1} looks identical on hover. ` +
          `Dots are small targets — without hover feedback it is hard to tell which one you ` +
          `are about to click.\n  resting: ${resting}\n  hovered: ${hovered}`
      ).not.toBe(resting);
    });

    test('SS-HOVER-04 — hovering a CTA does not shift the layout', async ({ page }) => {
      await spot(ss.ctas());
      const cta = ss.ctas().first();
      test.skip((await ss.ctas().count()) === 0, 'This slideshow has no CTA buttons.');

      await ss.resetPointer();
      const before = await cta.boundingBox();
      await ss.hoverAndSettle(cta);
      const after = await cta.boundingBox();

      // A hover that changes box SIZE reflows its neighbours; a hover that
      // only moves (translate) or recolours is fine.
      const grew = Math.abs((after?.width ?? 0) - (before?.width ?? 0));
      const taller = Math.abs((after?.height ?? 0) - (before?.height ?? 0));

      expect(
        Math.max(grew, taller),
        `SS-HOVER-04 / hover-reflow: hovering the button changes its box by ` +
          `${Math.round(Math.max(grew, taller))}px (from ${Math.round(before?.width ?? 0)}x` +
          `${Math.round(before?.height ?? 0)} to ${Math.round(after?.width ?? 0)}x` +
          `${Math.round(after?.height ?? 0)}). Growing on hover pushes neighbouring content ` +
          `around — use transform: scale() instead, which does not reflow.`
      ).toBeLessThanOrEqual(2);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(
        overflow,
        `SS-HOVER-04 / hover-overflow: hovering the button pushed the page ${overflow}px wider.`
      ).toBeLessThanOrEqual(2);
    });
  });

  // ===========================================================
  // 12. Visual baseline
  // ===========================================================
  test.describe('Visual', () => {

    test('SS-UI-01 — slideshow matches its visual baseline', async ({ page }) => {
      await spot(ss.section());
      // Baselines are captured at a fixed viewport. A headed/maximized run
      // uses `viewport: null`, so the window size depends on the screen and
      // no baseline could ever match — skip rather than report a false
      // failure. Run visual checks headless.
      test.skip(
        page.viewportSize() === null,
        'Maximized run (viewport: null) — visual baselines need a fixed viewport. Run headless.'
      );

      // One baseline per preset x viewport — Playwright names the file
      // after the project, so khajal-desktop and doll-mobile each get
      // their own. Colour/layout presets are exactly what this catches.
      //
      // FIRST RUN writes the baselines and reports "A snapshot doesn't
      // exist ... writing actual" as a failure. That is expected: commit
      // the generated PNGs, and subsequent runs compare against them.
      await ss.section().scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(1200); // let images settle

      await expect(ss.section()).toHaveScreenshot({
        animations: 'disabled',
        // Video slides show a different frame on every capture (moonlight
        // differed by 9-15% of pixels), so no baseline could ever match.
        // Mask them — the surrounding layout is still compared.
        mask: [ss.section().locator('video, .slide__video')],
        // Live storefront imagery re-encodes slightly between runs.
        maxDiffPixelRatio: 0.02,
        timeout: 20_000,
      });
    });
  });

  // ===========================================================
  // 12. Performance
  // ===========================================================
  test.describe('Performance', () => {

    test('SS-PERF-02 — animates transform/opacity, not layout properties', async () => {
      const property = await ss.trackTransitionProperty();

      expect(
        /transform|opacity|all|none/.test(property),
        `SS-PERF-02 / non-composited: the slide track animates "${property}". ` +
          `left/width/height/top force layout on every frame. Animate transform and ` +
          `opacity instead.`
      ).toBeTruthy();
    });
  });

  // ===========================================================
  // 12. Negative cases reachable without content provisioning
  // ===========================================================
  test.describe('Negative', () => {

    test('SS-NEG-12 — degrades gracefully when the section JS is blocked', async ({ page, preset }) => {
      await spot(ss.section());
      await page.route('**/*slideshow*.js', (route) => route.abort());
      await page.goto(preset.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Measure the SECTION, not the page: total page height is
      // dominated by the other dozen sections and says nothing about
      // how the slideshow degraded.
      const section = await ss.section().boundingBox();
      test.skip(section === null, 'Slideshow did not render at all with its JS blocked.');

      const slides = await ss.slideCount();
      const oneSlide = (await ss.slideAt(0).boundingBox())?.height ?? 0;
      test.skip(oneSlide === 0, 'Could not measure a slide height.');

      // Degraded well: roughly one slide tall. Degraded badly: every
      // slide stacked, i.e. about slides x oneSlide.
      expect(
        section!.height,
        `SS-NEG-12 / no-fallback: with the slideshow JS blocked the section is ` +
          `${Math.round(section!.height)}px tall — about ${(section!.height / oneSlide).toFixed(1)} ` +
          `slides stacked (${slides} slides at ~${Math.round(oneSlide)}px each). Expected ` +
          `graceful degradation: show slide 1 only, or a scrollable row.`
      ).toBeLessThan(oneSlide * 1.8);
    });
  });
});
