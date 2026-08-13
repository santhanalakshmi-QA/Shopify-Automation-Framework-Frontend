// tests/rich-text.spec.ts
// ─────────────────────────────────────────────────────────────
// Rich-text section suite.
//
// This is the SECOND section built on the framework, and its job is as
// much architectural as functional: it proves the shared pieces
// generalise beyond the slideshow. Everything below reuses existing
// machinery unchanged —
//
//   preset fixtures            utils/fixtures.ts
//   section manifest gating    sectionCount(preset, 'rich_text')
//   capability gating          data/presets.json -> richText
//   assertion helpers          checksFor('RT')  ← the important one
//
// `checksFor('RT')` is why the shared helpers were parameterised: the
// same assertions that print SS-LAYOUT-01 for the slideshow print
// RT-LAYOUT-01 here, so a failure is traceable to THIS section's
// checklist rather than the slideshow's.
//
// Only khajal ships a rich_text section today, so the whole file skips
// on the other three presets. On khajal the section is a promo banner:
// a line of copy, a discount code, and a copy-to-clipboard button.
// ─────────────────────────────────────────────────────────────

import { test, expect, sectionCount } from '../utils/fixtures';
import AxeBuilder from '@axe-core/playwright';
import { RichTextPage } from '../pages/RichTextPage.js';
import { mountNarrator, spot } from '../utils/demo-hud.js';
import { checksFor } from '../utils/slideshow-checks.js';

const SECTION = 'rich_text';

// Same helpers the slideshow uses; different prefix, so every message
// carries an RT- id.
const { assertRenderHealth, expectNoMissingTranslations, assertNoDeadOrUnsafeLinks,
        assertNoPageOverflow, assertContentInsideBox } = checksFor('RT');

/**
 * Ask for clipboard access, tolerating browsers that do not offer it.
 *
 * WebKit rejects the `clipboard-read`/`clipboard-write` permission names
 * outright, and Playwright's iPhone/iPad device descriptors default to
 * WebKit — so the mobile and tablet projects hit this too, not just the
 * webkit one. Only the check that inspects clipboard CONTENT needs the
 * permission; the UI-state and keyboard checks do not, so they must not
 * request it.
 */
async function tryGrantClipboard(context: any): Promise<boolean> {
  try {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    return true;
  } catch {
    return false;
  }
}

test.describe('Rich text', () => {
  let rt: RichTextPage;

  test.skip(
    ({ preset }) => sectionCount(preset, SECTION) === 0,
    'This preset does not ship a rich-text section.'
  );

  test.beforeEach(async ({ page, preset }, testInfo) => {
    rt = new RichTextPage(page, preset);

    // Demo runs only: banner naming the check, and a ring around THIS
    // section rather than the slideshow. No-op in normal runs.
    await mountNarrator(page, {
      title: testInfo.title,
      preset: preset.key,
      spotlight: '.rich-text',
    });

    await rt.open();
  });

  // ===========================================================
  // 1. Render & structure
  // ===========================================================
  test.describe('Render & structure', () => {

    test('RT-RENDER-01 — section present, and as many as the manifest declares', async ({ preset }) => {
      await spot(rt.section());
      await expect(
        rt.section(),
        `RT-RENDER-01 / missing: no rich-text section matched ".rich-text" on ${preset.url}.`
      ).toBeVisible();

      expect(
        await rt.sectionCount(),
        `RT-RENDER-01 / count: the manifest declares ${sectionCount(preset, SECTION)} rich-text ` +
          `section(s) for ${preset.label}.`
      ).toBe(sectionCount(preset, SECTION));
    });

    test('RT-RENDER-02 — the section renders visible copy', async () => {
      await spot(rt.section());
      const text = ((await rt.section().innerText()) ?? '').trim();
      expect(
        text.length,
        `RT-RENDER-02 / empty: the rich-text section renders no visible text at all. ` +
          `An empty band on the page is worse than no section.`
      ).toBeGreaterThan(0);
    });

    test('RT-RENDER-03 — the section has a real box', async () => {
      // Shared helper, RT- prefixed: catches a section that is present
      // and "visible" but collapsed to no height.
      await assertRenderHealth(rt.sections(), { minHeight: 24 });
    });

    test('RT-RENDER-04 — no missing translation keys', async () => {
      await spot(rt.section());
      await expectNoMissingTranslations(rt.section());
    });

    test('RT-RENDER-05 — no JS errors on init', async ({ page }) => {
      const errors: string[] = [];
      const failed: string[] = [];
      page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
      page.on('response', (r) => {
        if (r.status() >= 400) failed.push(`[request] ${r.status()} ${r.url()}`);
      });

      await rt.open();
      await page.waitForTimeout(1500);

      const issues = [...errors, ...failed];
      expect(
        issues,
        `RT-RENDER-05 / runtime: the page reported issues attributable to theme code:\n` +
          `  ${issues.join('\n  ')}`
      ).toEqual([]);
    });
  });

  // ===========================================================
  // 2. Discount code and copy-to-clipboard
  // ===========================================================
  // The only real interaction in this section. Gated by
  // `richText.copyCode` so a rich-text variant without a code box
  // never collects these.
  test.describe('Discount code', () => {

    test('RT-COPY-01 — a discount code is rendered', async () => {
      const code = await rt.code();
      expect(
        code.length,
        `RT-COPY-01 / empty-code: the code box is rendered but contains no code. ` +
          `A visitor sees an empty box with a copy button beside it.`
      ).toBeGreaterThan(0);

      expect(
        /\s/.test(code),
        `RT-COPY-01 / malformed-code: the code "${code}" contains whitespace. ` +
          `Discount codes cannot contain spaces, so this one would be rejected at checkout.`
      ).toBeFalsy();
    });

    test('RT-COPY-02 — the copy button has an accessible name', async () => {
      await spot(rt.copyButton());
      const button = rt.copyButton();
      const name =
        (await button.getAttribute('aria-label')) ??
        (await button.getAttribute('title')) ??
        (await button.innerText());

      expect(
        (name ?? '').trim().length,
        `RT-COPY-02 / unnamed: the copy button has no accessible name, so a screen reader ` +
          `announces only "button" with no indication of what it does.`
      ).toBeGreaterThan(0);
    });

    test('RT-COPY-03 — clicking copies the code to the clipboard', async ({ context }) => {
      const granted = await tryGrantClipboard(context);
      test.skip(!granted, 'This browser does not expose clipboard permissions (WebKit).');

      const code = await rt.code();
      await rt.copyCode();

      const clipboard = await rt.clipboardText();
      test.skip(clipboard === null, 'Clipboard access was denied by the browser.');

      expect(
        clipboard,
        `RT-COPY-03 / not-copied: clicked the copy button but the clipboard holds ` +
          `"${clipboard}" instead of the code "${code}". The button looks like it worked ` +
          `and the visitor pastes the wrong thing — or nothing — at checkout.`
      ).toBe(code);
    });

    test('RT-COPY-04 — clicking shows the confirmation state', async ({ context }) => {
      // Best-effort: Chromium needs the permission for the theme's
      // clipboard write to resolve. WebKit refuses the permission name
      // but may allow the write on a user gesture — so proceed either
      // way and let the result speak.
      await tryGrantClipboard(context);

      expect(
        await rt.copyState(),
        'RT-COPY-04 / wrong-initial-state: the section loads already showing the "copied" ' +
          'confirmation, before anything was clicked.'
      ).toBe('default');

      await rt.copyCode();

      expect(
        await rt.copyState(),
        `RT-COPY-04 / no-feedback: after clicking, the button still shows its default state. ` +
          `The visitor gets no confirmation the code was copied and will click repeatedly.`
      ).toBe('success');
    });

    test('RT-COPY-05 — the copy button works from the keyboard', async ({ context }) => {
      await spot(rt.copyButton());
      await tryGrantClipboard(context);

      const button = rt.copyButton();
      await button.focus();
      await expect(
        button,
        'RT-COPY-05 / not-focusable: the copy button cannot receive keyboard focus.'
      ).toBeFocused();

      await rt.page.keyboard.press('Enter');
      await rt.page.waitForTimeout(600);

      expect(
        await rt.copyState(),
        `RT-COPY-05 / keyboard: the button took focus but pressing Enter did not copy. ` +
          `Keyboard users cannot claim the discount.`
      ).toBe('success');
    });
  });

  // ===========================================================
  // 3. Layout
  // ===========================================================
  test.describe('Layout', () => {

    test('RT-LAYOUT-01 — no horizontal page overflow', async ({ page }) => {
      await assertNoPageOverflow(page);
    });

    test('RT-LAYOUT-02 — content stays inside the section', async () => {
      await assertContentInsideBox(rt.section(), rt.body());
    });

    test('RT-LAYOUT-03 — the configured alignment is applied', async () => {
      await spot(rt.section());
      const align = await rt.alignment();
      test.skip(!align, 'This section sets no alignment modifier.');

      const inner = rt.section().locator('.rich-text__inner').first();
      const outerBox = await rt.section().boundingBox();
      const innerBox = await inner.boundingBox();
      test.skip(!outerBox || !innerBox, 'Could not measure the section.');

      const leftGap = innerBox!.x - outerBox!.x;
      const rightGap = (outerBox!.x + outerBox!.width) - (innerBox!.x + innerBox!.width);

      if (align === 'center') {
        // Centred content sits with roughly equal space either side.
        expect(
          Math.abs(leftGap - rightGap),
          `RT-LAYOUT-03 / alignment: the section is marked "${align}" but its content sits ` +
            `${Math.round(leftGap)}px from the left and ${Math.round(rightGap)}px from the ` +
            `right. Centred content should have equal gaps.`
        ).toBeLessThanOrEqual(4);
      }
    });

    test('RT-LAYOUT-04 — layout holds across the viewport matrix', async ({ page }) => {
      await spot(rt.section());
      const broken: string[] = [];
      for (const width of [1440, 1200, 1024, 768, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.waitForTimeout(450);

        // Re-centre after every resize. Narrowing the viewport reflows
        // everything above, which pushes this section off screen — at
        // 390px it ends up ~780px ABOVE the fold. Without this the
        // section is measured off-screen and, on a headed run, you
        // cannot see the width being tested.
        await rt.scrollSectionIntoView(rt.section());

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        const box = await rt.section().boundingBox();

        if (overflow > 2 || !box || box.height < 24) {
          broken.push(
            `${width}px: overflow ${overflow}px, height ${Math.round(box?.height ?? 0)}px`
          );
        }
      }

      expect(
        broken,
        `RT-LAYOUT-04 / responsive: the rich-text section broke at:\n  ${broken.join('\n  ')}`
      ).toEqual([]);
    });
  });

  // ===========================================================
  // 4. Links
  // ===========================================================
  test.describe('Links', () => {

    test('RT-LINK-01/03/04 — no dead, unsafe or empty-shell anchors', async () => {
      // Passes trivially while the section has no links, and starts
      // guarding the moment a merchant adds one.
      await assertNoDeadOrUnsafeLinks(rt.section());
    });
  });

  // ===========================================================
  // 5. Accessibility
  // ===========================================================
  test.describe('Accessibility', () => {

    test('RT-A11Y-01 — no critical accessibility violations', async ({ page }) => {
      const results = await new AxeBuilder({ page }).include('.rich-text').analyze();
      const critical = results.violations.filter((v) => v.impact === 'critical');

      expect(
        critical,
        `RT-A11Y-01 / axe: ${critical.length} critical violation(s):\n` +
          critical.map((v) => `  ${v.id}: ${v.help} → ${v.nodes[0]?.target}`).join('\n')
      ).toEqual([]);
    });

    test('RT-A11Y-02 — text contrast is at least 4.5:1', async ({ page, preset }) => {
      const results = await new AxeBuilder({ page })
        .include('.rich-text')
        .withRules(['color-contrast'])
        .analyze();

      expect(
        results.violations,
        `RT-A11Y-02 / contrast: text in the rich-text section fails the 4.5:1 minimum on ` +
          `"${preset.label}":\n` +
          results.violations
            .flatMap((v) => v.nodes.map((n) => `  ${n.target}`))
            .join('\n')
      ).toEqual([]);
    });

    test('RT-A11Y-03 — the copy button shows a visible focus indicator', async () => {
      await spot(rt.copyButton());
      const button = rt.copyButton();
      const style = (el: Element) => {
        const s = getComputedStyle(el);
        return `${s.outlineWidth}|${s.outlineStyle}|${s.boxShadow}|${s.borderColor}|${s.backgroundColor}`;
      };

      const before = await button.evaluate(style);
      await button.focus();
      const after = await button.evaluate(style);

      expect(
        after,
        `RT-A11Y-03 / no-focus-ring: the copy button looks identical when focused. ` +
          `A keyboard user cannot tell they have landed on it.`
      ).not.toBe(before);
    });
  });
});
