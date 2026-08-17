// tests/comparison-sliders.spec.ts
// ─────────────────────────────────────────────────────────────
// The theme's two comparison-slider sections.
//
//   IC   image_comparison   dense      5 sliders
//   BA   before_after       moonlight  3 sliders, each selling a product
//
// Different section types, different class names, identical mechanic:
// two images stacked, and a divider the shopper drags to reveal more
// of the one underneath.
//
// The drag is the whole section. A comparison slider that renders
// perfectly but does not move is a shopper looking at one photo with
// no idea a second one exists — and nothing on the page says so. That
// is why the checks below drive a real mouse rather than inspecting
// styles: a slider wired only to JavaScript state would pass a style
// assertion and still be dead under a finger.
//
// Both sections declare role="slider" on the container and neither
// carries aria-valuenow. That is asserted, not assumed.
// ─────────────────────────────────────────────────────────────

import { test, expect } from '../utils/fixtures';
import AxeBuilder from '@axe-core/playwright';
import { ComparisonSliderPage } from '../pages/ComparisonSliderPage.js';
import { rootSelector } from '../utils/simple-sections.js';
import { mountNarrator, spot, spotVerdicts } from '../utils/demo-hud.js';
import { checksFor } from '../utils/slideshow-checks.js';

const SECTIONS = [
  { kind: 'imageComparison', type: 'image_comparison', prefix: 'IC', label: 'Image comparison' },
  { kind: 'beforeAfter',     type: 'before_after',     prefix: 'BA', label: 'Before / after' },
] as const;

for (const section of SECTIONS) {
  const { kind, type, prefix, label } = section;

  const { assertRenderHealth, expectNoMissingTranslations, assertNoDeadOrUnsafeLinks,
          assertNoPageOverflow, expectNoPlaceholderText } = checksFor(prefix);

  test.describe(label, () => {
    let cs: ComparisonSliderPage;

    test.skip(({ preset }) => !(preset.sections?.[type] > 0),
      `This preset does not ship a ${label} section.`);

    test.beforeEach(async ({ page, preset }, testInfo) => {
      cs = new ComparisonSliderPage(page, preset, kind);
      await mountNarrator(page, {
        title: testInfo.title, preset: preset.key, spotlight: rootSelector(type),
      });
      await cs.open();
    });

    // =========================================================
    // Render
    // =========================================================
    test(`${prefix}-RENDER-01 — the section is present and visible`, async ({ preset }) => {
      await spot(cs.roots());
      expect(
        await cs.roots().count(),
        `${prefix}-RENDER-01 / count: ${preset.label} should render ` +
          `${preset.sections[type]} ${label} section(s).`
      ).toBe(preset.sections[type]);
      await expect(cs.root()).toBeVisible();
    });

    test(`${prefix}-RENDER-02 — it holds the expected number of sliders`, async ({ preset }) => {
      await spot(cs.sliders());
      expect(
        await cs.sliderCount(),
        `${prefix}-RENDER-02 / slider-count: expected ` +
          `${preset.comparisonSliders![type].sliders} comparison slider(s) but found ` +
          `${await cs.sliderCount()}.`
      ).toBe(preset.comparisonSliders![type].sliders);
    });

    test(`${prefix}-RENDER-03 — every slider has a draggable divider`, async () => {
      const sliders = await cs.sliderCount();
      const dividers = await cs.dividerCount();
      await spot(cs.dividers());
      expect(
        dividers,
        `${prefix}-RENDER-03 / no-divider: ${sliders} slider(s) but ${dividers} divider(s). ` +
          `Without the divider there is nothing to drag, and the second image is ` +
          `permanently hidden.`
      ).toBeGreaterThanOrEqual(sliders);
    });

    test(`${prefix}-RENDER-04 — nothing has collapsed`, async () => {
      await assertRenderHealth(cs.sliders(), { minHeight: 60 });
    });

    test(`${prefix}-RENDER-05 — no missing translation keys`, async () => {
      await expectNoMissingTranslations(cs.root());
    });

    test(`${prefix}-RENDER-06 — no theme placeholder text is left on the page`, async () => {
      await expectNoPlaceholderText(cs.root());
    });

    test(`${prefix}-CONTENT-01 — both sides are labelled`, async () => {
      const labels = await cs.labelTexts();
      await spotVerdicts(cs.labels(), labels.map((l) => l.length > 0));

      const blank = labels.map((l, i) => (l ? null : i + 1)).filter(Boolean);
      expect(
        blank,
        `${prefix}-CONTENT-01 / unlabelled: label(s) ${blank.join(', ')} are empty. ` +
          `"Before" and "After" are the only thing telling a shopper which half is which.`
      ).toEqual([]);

      const hasBoth = labels.some((l) => /before/i.test(l)) && labels.some((l) => /after/i.test(l));
      expect(
        hasBoth,
        `${prefix}-CONTENT-01 / missing-side: the section does not show both a "Before" and ` +
          `an "After" label (found: ${labels.join(', ')}).`
      ).toBe(true);
    });

    // =========================================================
    // The drag — the reason this section exists
    // =========================================================
    test(`${prefix}-DRAG-01 — the divider moves when dragged`, async () => {
      await spot(cs.dividers().first());
      const r = await cs.dragDivider(0, 160);

      expect(r, `${prefix}-DRAG-01 / no-divider: could not measure the divider.`).not.toBeNull();
      expect(
        Math.abs(r!.moved),
        `${prefix}-DRAG-01 / stuck: dragging the divider ${r!.requested}px moved it ` +
          `${r!.moved}px (from x=${r!.before} to x=${r!.after}). The comparison is frozen — ` +
          `a shopper sees one image and has no way to reveal the other.`
      ).toBeGreaterThan(20);
    });

    test(`${prefix}-DRAG-02 — it can be dragged back the other way`, async () => {
      await spot(cs.dividers().first());
      await cs.dragDivider(0, 160);
      const back = await cs.dragDivider(0, -160);

      expect(
        back!.moved,
        `${prefix}-DRAG-02 / one-way: the divider moved right but not back left ` +
          `(${back!.moved}px). A comparison you cannot reverse is half a comparison.`
      ).toBeLessThan(-20);
    });

    // =========================================================
    // Media
    // =========================================================
    test(`${prefix}-MEDIA-01 — every image has alt text`, async () => {
      const imgs = await cs.imageData();
      await spotVerdicts(cs.images(), imgs.map((i) => !!(i.alt ?? '').trim()));

      const missing = imgs
        .filter((i) => !(i.alt ?? '').trim())
        .map((i) => `#${i.n} .${i.cls} (${i.src}) alt=${JSON.stringify(i.alt)}`);
      expect(
        missing,
        `${prefix}-MEDIA-01 / missing-alt: ${missing.length} image(s) have no alt text:\n  ` +
          `${missing.join('\n  ')}\n` +
          `In a before/after section the images ARE the content — with no alt there is ` +
          `nothing at all for a screen reader to convey.`
      ).toEqual([]);
    });

    test(`${prefix}-MEDIA-02 — no image is broken`, async () => {
      const imgs = await cs.imageData();
      const broken = imgs.filter((i) => i.broken).map((i) => `#${i.n} (${i.src})`);
      expect(broken, `${prefix}-MEDIA-02 / broken-image: ${broken.join(', ')}.`).toEqual([]);
    });

    // =========================================================
    // Accessibility
    // =========================================================
    test(`${prefix}-A11Y-01 — the slider role carries a value`, async () => {
      const sem = await cs.sliderSemantics();
      test.skip(!sem.length, 'This section declares no role="slider".');
      await spot(cs.roleSliders());
      await spotVerdicts(cs.roleSliders(), sem.map((s) => !!s.valueNow));

      const incomplete = sem
        .filter((s) => !s.valueNow)
        .map((s) => `slider ${s.n} (valuenow=${s.valueNow}, min=${s.valueMin}, max=${s.valueMax})`);
      expect(
        incomplete,
        `${prefix}-A11Y-01 / role-without-value: ${incomplete.join(', ')} declare ` +
          `role="slider" but no aria-valuenow.\n` +
          `The role is a promise — "this is a slider, here is where it sits, here are its ` +
          `bounds". Declaring it and omitting the value leaves a screen reader announcing ` +
          `"slider" with nothing to say about position, and no way to report movement.`
      ).toEqual([]);
    });

    test(`${prefix}-A11Y-02 — the slider can be reached by keyboard`, async () => {
      const sem = await cs.sliderSemantics();
      test.skip(!sem.length, 'This section declares no role="slider".');

      const unreachable = sem.filter((s) => !s.focusable).map((s) => `slider ${s.n}`);
      expect(
        unreachable,
        `${prefix}-A11Y-02 / not-focusable: ${unreachable.join(', ')} cannot take keyboard ` +
          `focus (no tabindex). A shopper who cannot use a mouse has no way to move the ` +
          `divider at all, so the second image is unreachable for them.`
      ).toEqual([]);
    });

    test(`${prefix}-A11Y-03 — no critical accessibility violations`, async ({ page }) => {
      const id = await cs.root().getAttribute('id');
      const results = await new AxeBuilder({ page })
        .include(`#${id}`).withTags(['wcag2a', 'wcag2aa']).analyze();
      const critical = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
      expect(
        critical.map((v) => `${v.id}: ${v.help} -> ${v.nodes[0]?.target?.join(' ')}`),
        `${prefix}-A11Y-03 / axe: ${critical.length} critical violation(s).`
      ).toEqual([]);
    });

    test(`${prefix}-A11Y-04 — text contrast is at least 4.5:1`, async ({ page }) => {
      const id = await cs.root().getAttribute('id');
      const results = await new AxeBuilder({ page })
        .include(`#${id}`).withRules(['color-contrast']).analyze();
      expect(
        results.violations.flatMap((v) => v.nodes.map((n) => n.target.join(' '))),
        `${prefix}-A11Y-04 / contrast: the Before/After labels sit over photographs, which ` +
          `is where contrast most often fails.`
      ).toEqual([]);
    });

    // =========================================================
    // Links & layout
    // =========================================================
    test(`${prefix}-LINK-01 — links point somewhere real`, async () => {
      const links = await cs.linkHrefs();
      test.skip(!links.length, 'This section renders no links.');
      await spot(cs.root().locator('a'));

      const isPlaceholder = (h: string | null) => !h || h === '#' || h.trim() === '';
      const dead = links.filter((l) => isPlaceholder(l.href)).map((l) => `"${l.text || '(no text)'}"`);
      expect(
        dead,
        `${prefix}-LINK-01 / placeholder: ${dead.length} of ${links.length} link(s) have an ` +
          `empty href and navigate nowhere: ${dead.join(', ')}.`
      ).toEqual([]);
    });

    test(`${prefix}-LINK-02 — no dead, unsafe or unlabelled links`, async () => {
      await assertNoDeadOrUnsafeLinks(cs.root());
    });

    test(`${prefix}-LAYOUT-01 — no horizontal page overflow`, async ({ page }) => {
      await assertNoPageOverflow(page);
    });

    test(`${prefix}-LAYOUT-02 — it holds across the viewport matrix`, async ({ page }) => {
      for (const width of [1440, 1200, 1024, 768, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await cs.focus(0);
        await expect(
          cs.root(),
          `${prefix}-LAYOUT-02 / breakpoint: the ${label} section stopped being visible at ${width}px.`
        ).toBeVisible();
        await assertNoPageOverflow(page);
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════
// before_after only: each slider sells a product
// ═══════════════════════════════════════════════════════════
test.describe('Before / after — product', () => {
  let ba: ComparisonSliderPage;

  test.skip(({ preset }) => !(preset.sections?.before_after > 0),
    'This preset does not ship a before/after section.');

  test.beforeEach(async ({ page, preset }, testInfo) => {
    ba = new ComparisonSliderPage(page, preset, 'beforeAfter');
    await mountNarrator(page, {
      title: testInfo.title, preset: preset.key, spotlight: rootSelector('before_after'),
    });
    await ba.open();
  });

  test('BA-PRODUCT-01 — every add-to-cart button has a label', async () => {
    const btns = await ba.atcButtons();
    test.skip(!btns.length, 'This section renders no add-to-cart buttons.');

    const unnamed = btns.filter((b) => !b.text && !b.ariaLabel).map((b) => `button ${b.n}`);
    expect(
      unnamed,
      `BA-PRODUCT-01 / unnamed-button: ${unnamed.join(', ')} show no text and carry no ` +
        `aria-label. This is the buy button — a shopper cannot tell what it does.`
    ).toEqual([]);
  });

  test('BA-PRODUCT-02 — every linked product still exists', async ({ page }) => {
    const links = await ba.linkHrefs();
    const hrefs = ([...new Set(links.map((l: any) => l.href))] as (string | null)[])
      .filter((h): h is string => !!h && h.includes('/products/'));
    test.skip(!hrefs.length, 'This section links to no products.');

    const broken: string[] = [];
    for (const href of hrefs) {
      const url = new URL(href, page.url()).toString();
      const res = await page.request.get(url, { failOnStatusCode: false }).catch(() => null);
      const status = res?.status() ?? 0;
      if (status >= 400 || status === 0) broken.push(`${url} (${status || 'unreachable'})`);
    }
    expect(
      broken,
      `BA-PRODUCT-02 / dead-product: the section sells product(s) whose page no longer ` +
        `exists:\n  ${broken.join('\n  ')}`
    ).toEqual([]);
  });
});
