// tests/footer.spec.ts
// ─────────────────────────────────────────────────────────────
// Footer suite.
//
// The footer is a GLOBAL region like the header, not a home-page
// section, so nothing here gates on `sections` — only on the
// `footer` capability block in data/presets.json.
//
//              khajal   doll   dense   moonlight
//   columns    3        3      3       3
//   links      5/5/5    6/6/6  3/3/3   7/7/7
//   newsletter yes      NO     yes     yes
//   social     NO       4      NO      NO
//   brand logo NO       yes    yes     NO
//
// Two things this suite exists to catch that nothing else can:
//
//  1. The footer is where "small" content rot collects — a link
//     pointing at a deleted collection, a column silently losing an
//     item, an accordion that stops opening on mobile. None of that
//     shows on the home page above the fold, so nobody notices.
//
//  2. Raw Liquid. Three presets ship
//     `class="newsletter__form newsletter__form--{{ block.id }}"`,
//     i.e. an un-rendered template variable that reached the browser.
//     FT-RENDER-06 fails on it deliberately.
//
// Demo support is wired in from the start: the narrator names each
// check, `spot()` highlights what it inspects, and `spotVerdicts()`
// paints a green or red result per element.
// ─────────────────────────────────────────────────────────────

import { test, expect } from '../utils/fixtures';
import AxeBuilder from '@axe-core/playwright';
import { mountNarrator, spot, spotVerdicts } from '../utils/demo-hud.js';
import { checksFor } from '../utils/slideshow-checks.js';

const { assertRenderHealth, expectNoMissingTranslations, assertNoDeadOrUnsafeLinks,
        assertNoPageOverflow } = checksFor('FT');

test.describe('Footer', () => {

  test.beforeEach(async ({ page, preset, footerPage }, testInfo) => {
    await mountNarrator(page, {
      title: testInfo.title,
      preset: preset.key,
      spotlight: 'footer.footer',
    });
    await footerPage.open();
  });

  // ===========================================================
  // 1. Render & structure
  // ===========================================================
  test.describe('Render & structure', () => {

    test('FT-RENDER-01 — the footer is present and visible', async ({ footerPage }) => {
      await spot(footerPage.root());
      await expect(footerPage.root()).toBeVisible();
    });

    test('FT-RENDER-02 — it has the expected number of link columns', async ({ preset, footerPage }) => {
      const expected = preset.footer!.columns;
      await spot(footerPage.columns());
      expect(
        await footerPage.columnCount(),
        `FT-RENDER-02 / count: ${preset.label} should show ${expected} footer link ` +
          `column(s). A different number means a menu block was added, removed, or ` +
          `failed to render. If intended, update data/presets.json.`
      ).toBe(expected);
    });

    test('FT-RENDER-03 — each column holds the expected number of links', async ({ preset, footerPage }) => {
      const expected = preset.footer!.linksPerColumn;
      const actual = await footerPage.linksPerColumn();
      const verdicts = expected.map((n, i) => actual[i] === n);
      await spotVerdicts(footerPage.columns(), verdicts);

      expect(
        actual,
        `FT-RENDER-03 / link-count: footer columns should hold ` +
          `[${expected.join(', ')}] links but hold [${actual.join(', ')}]. ` +
          `A column quietly losing a link is exactly what this catches — nobody ` +
          `scrolls to the footer to check.`
      ).toEqual(expected);
    });

    test('FT-RENDER-04 — every column has a visible, non-empty title', async ({ footerPage }) => {
      const titles = await footerPage.titleTexts();
      const verdicts = titles.map((t) => t.length > 0);
      await spotVerdicts(footerPage.columnTitles(), verdicts);

      const empty = titles.map((t, i) => (t.length === 0 ? i + 1 : null)).filter(Boolean);
      expect(
        empty,
        `FT-RENDER-04 / empty-title: column(s) ${empty.join(', ')} have no heading. ` +
          `An untitled column of links tells the shopper nothing.`
      ).toEqual([]);
    });

    test('FT-RENDER-05 — no missing translation keys', async ({ footerPage }) => {
      await spot(footerPage.root());
      await expectNoMissingTranslations(footerPage.root());
    });

    test('FT-RENDER-06 — no raw Liquid reached the browser', async ({ footerPage }) => {
      await spot(footerPage.root());
      const leaks = await footerPage.liquidLeaks();
      expect(
        leaks,
        `FT-RENDER-06 / liquid-leak: un-rendered Liquid is present in the footer ` +
          `markup:\n  ${leaks.join('\n  ')}\n` +
          `A "{{ ... }}" that reaches the browser means the theme printed the ` +
          `template source instead of evaluating it. Harmless-looking in a class ` +
          `attribute, but it means any CSS targeting that block ID cannot match.`
      ).toEqual([]);
    });

    test('FT-RENDER-07 — the footer has not collapsed', async ({ footerPage }) => {
      await assertRenderHealth(footerPage.columns(), { minHeight: 40 });
    });

    test('FT-RENDER-08 — no JS errors when the footer loads', async ({ page, footerPage }) => {
      const errors: string[] = [];
      const failed: string[] = [];
      page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
      page.on('response', (r) => {
        if (r.status() >= 400) failed.push(`[request] ${r.status()} ${r.url()}`);
      });

      await footerPage.open();
      await page.waitForTimeout(1500);

      const issues = [...errors, ...failed];
      expect(
        issues,
        `FT-RENDER-08 / runtime: the page reported issues attributable to theme code:\n` +
          `  ${issues.join('\n  ')}`
      ).toEqual([]);
    });
  });

  // ===========================================================
  // 2. Links
  // ===========================================================
  test.describe('Links', () => {

    test('FT-LINK-01/03/04 — no dead, unsafe or unlabelled links', async ({ footerPage }) => {
      await spot(footerPage.allLinks());
      await assertNoDeadOrUnsafeLinks(footerPage.root());
    });

    test('FT-LINK-02 — every footer link still resolves', async ({ page, footerPage }) => {
      const links = await footerPage.linkHrefs();
      const broken: string[] = [];

      for (const { text, href } of links) {
        if (!href || href.startsWith('#') || href.startsWith('mailto:') ||
            href.startsWith('tel:')) continue;
        const url = new URL(href, page.url()).toString();
        const res = await page.request.get(url, { failOnStatusCode: false }).catch(() => null);
        const status = res?.status() ?? 0;
        if (status >= 400 || status === 0) broken.push(`"${text}" -> ${url} (${status || 'unreachable'})`);
      }

      expect(
        broken,
        `FT-LINK-02 / dead-link: footer link(s) point at pages that no longer ` +
          `exist:\n  ${broken.join('\n  ')}\n` +
          `Deleting a collection or page does not clean up the menu that links to it.`
      ).toEqual([]);
    });

    test('FT-LINK-06 — footer links point somewhere real', async ({ footerPage }) => {
      // FT-LINK-02 deliberately SKIPS href="#" because there is nothing
      // to fetch. That left a hole: a menu where every entry is a
      // placeholder passed every link check. This closes it.
      const links = await footerPage.linkHrefs();
      const isPlaceholder = (h: string | null) => !h || h === '#' || h.trim() === '';
      const verdicts = links.map((l) => !isPlaceholder(l.href));
      await spotVerdicts(footerPage.allLinks(), verdicts);

      const dead = links
        .filter((l) => isPlaceholder(l.href))
        .map((l) => `"${l.text}"`);

      expect(
        dead,
        `FT-LINK-06 / placeholder: ${dead.length} of ${links.length} footer link(s) have ` +
          `href="#" and navigate nowhere: ${dead.join(', ')}.\n` +
          `These look and behave like real links to a shopper — cursor changes, they are ` +
          `clickable — but nothing happens. Either point them at real pages or remove them.`
      ).toEqual([]);
    });

    test('FT-LINK-05 — every link has visible text', async ({ footerPage }) => {
      const links = await footerPage.linkHrefs();
      const verdicts = links.map((l) => l.text.length > 0);
      await spotVerdicts(footerPage.allLinks(), verdicts);

      const blank = links
        .map((l, i) => (l.text.length === 0 ? `#${i + 1} (${l.href})` : null))
        .filter(Boolean);
      expect(
        blank,
        `FT-LINK-05 / empty-label: footer link(s) render no text: ${blank.join(', ')}. ` +
          `An invisible link is unclickable in practice and unreadable to a screen reader.`
      ).toEqual([]);
    });
  });

  // ===========================================================
  // 3. Accordion behaviour (columns are <details>/<summary>)
  // ===========================================================
  test.describe('Accordion', () => {

    test('FT-ACC-01 — columns are open on desktop', async ({ footerPage }) => {
      await footerPage.setDesktopView();
      await footerPage.scrollToFooter();
      const total = await footerPage.columnCount();

      const states: boolean[] = [];
      for (let i = 0; i < total; i++) states.push(await footerPage.isColumnOpen(i));
      await spotVerdicts(footerPage.columns(), states);

      const shut = states.map((open, i) => (open ? null : i + 1)).filter(Boolean);
      expect(
        shut,
        `FT-ACC-01 / collapsed-on-desktop: column(s) ${shut.join(', ')} are collapsed at ` +
          `1440px. On a wide screen the links should already be showing — a shopper ` +
          `should not have to click to see a footer menu.`
      ).toEqual([]);
    });

    test('FT-ACC-02 — a column toggles when its heading is clicked', async ({ footerPage }) => {
      await footerPage.setMobileView();
      await footerPage.scrollToFooter();
      await spot(footerPage.summary(0));

      const { before, after } = await footerPage.toggleColumn(0);
      expect(
        after,
        `FT-ACC-02 / no-toggle: clicking the first footer column heading did not change ` +
          `its state (open was ${before}, still ${after}). On mobile the columns are ` +
          `accordions — if they do not open, those links are unreachable on a phone.`
      ).not.toBe(before);
    });

    test('FT-ACC-03 — the toggle is operable by keyboard', async ({ page, footerPage }) => {
      await footerPage.setMobileView();
      await footerPage.scrollToFooter();
      const summary = footerPage.summary(0);
      await spot(summary);

      const before = await footerPage.isColumnOpen(0);
      await summary.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      expect(
        await footerPage.isColumnOpen(0),
        `FT-ACC-03 / keyboard: pressing Enter on the focused column heading did not ` +
          `toggle it. Native <details> gives this for free — losing it means the theme ` +
          `has overridden the default behaviour with JavaScript.`
      ).not.toBe(before);
    });
  });

  // ===========================================================
  // 4. Newsletter signup
  // ===========================================================
  test.describe('Newsletter', () => {

    test('FT-NEWS-01 — the signup form and email field are present', async ({ footerPage }) => {
      await spot(footerPage.newsletterForm());
      await expect(footerPage.newsletterForm()).toBeVisible();
      await expect(footerPage.newsletterInput()).toBeVisible();
    });

    test('FT-NEWS-02 — the email field is a real email input', async ({ footerPage }) => {
      const input = footerPage.newsletterInput();
      await spot(input);
      expect(
        await input.getAttribute('type'),
        `FT-NEWS-02 / input-type: the newsletter field should be type="email" so phones ` +
          `show the @ keyboard and the browser validates the address before submitting.`
      ).toBe('email');
      expect(
        await input.getAttribute('name'),
        `FT-NEWS-02 / input-name: Shopify only records the signup when the field is ` +
          `named contact[email].`
      ).toBe('contact[email]');
    });

    test('FT-NEWS-03 — the email field has an accessible name', async ({ footerPage }) => {
      const input = footerPage.newsletterInput();
      await spot(input);
      const name = await input.evaluate((el: HTMLInputElement) => {
        const byLabel = el.labels?.[0]?.textContent?.trim();
        return (byLabel || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim();
      });
      expect(
        name.length,
        `FT-NEWS-03 / unlabelled: the newsletter email field has no label, aria-label ` +
          `or placeholder, so a screen reader announces it only as "edit text".`
      ).toBeGreaterThan(0);
    });

    test('FT-NEWS-04 — the submit control has an accessible name', async ({ footerPage }) => {
      const btn = footerPage.newsletterSubmit();
      await spot(btn);
      const name = await btn.evaluate((el) =>
        ((el.textContent ?? '') + ' ' + (el.getAttribute('aria-label') ?? '') +
         ' ' + (el.getAttribute('title') ?? '')).trim()
      );
      expect(
        name.length,
        `FT-NEWS-04 / unnamed-button: the newsletter submit button exposes no text or ` +
          `aria-label. It is an arrow icon — a screen reader announces it as just "button".`
      ).toBeGreaterThan(0);
    });

    test('FT-NEWS-05 — malformed addresses are rejected', async ({ footerPage }) => {
      await spot(footerPage.newsletterInput());

      // Deliberately NOT including "a@b": a single-label domain is
      // VALID per the HTML spec and every browser accepts it. Asserting
      // otherwise would fail on a correctly built form.
      const bad = ['not-an-email', 'a@', '@b.com', 'a b@c.com', 'two@@at.com'];
      const accepted: string[] = [];

      for (const value of bad) {
        const { valid } = await footerPage.emailValidity(value);
        if (valid) accepted.push(value);
      }

      expect(
        accepted,
        `FT-NEWS-05 / no-validation: the signup form accepts ${accepted.map((v) => `"${v}"`).join(', ')} ` +
          `as valid email address(es). Browser validation should reject these before the ` +
          `request is ever sent, otherwise the mailing list fills with addresses that ` +
          `can never receive anything.`
      ).toEqual([]);
    });

    test('FT-NEWS-06 — an empty signup cannot be submitted', async ({ footerPage }) => {
      await spot(footerPage.newsletterInput());
      const attrs = await footerPage.newsletterFieldAttrs();

      expect(
        attrs.required,
        `FT-NEWS-06 / not-required: the email field is not marked required, so the form ` +
          `can be submitted completely empty. That posts a blank signup to Shopify.`
      ).toBe(true);

      const { valid } = await footerPage.emailValidity('');
      expect(
        valid,
        `FT-NEWS-06 / empty-accepted: an empty email field passes validation.`
      ).toBe(false);
    });

    test('FT-NEWS-07 — a genuine address is accepted', async ({ footerPage }) => {
      await spot(footerPage.newsletterInput());

      // The mirror of FT-NEWS-05. Without this, a form that rejected
      // EVERYTHING would still pass the rejection checks.
      const good = ['test@example.com', 'TEST@EXAMPLE.CO.UK', 'first.last+tag@sub.domain.org'];
      const rejected: string[] = [];

      for (const value of good) {
        const { valid, message } = await footerPage.emailValidity(value);
        if (!valid) rejected.push(`"${value}" (${message})`);
      }

      expect(
        rejected,
        `FT-NEWS-07 / over-strict: the form rejects valid address(es): ${rejected.join(', ')}. ` +
          `Over-strict validation silently loses real subscribers, and nobody reports it ` +
          `because the shopper just gives up.`
      ).toEqual([]);
    });

    test('FT-NEWS-08 — the field autofills as an email', async ({ footerPage }) => {
      await spot(footerPage.newsletterInput());
      const attrs = await footerPage.newsletterFieldAttrs();
      expect(
        attrs.autocomplete,
        `FT-NEWS-08 / no-autocomplete: the email field has no autocomplete="email", so ` +
          `phones and password managers will not offer to fill it in. Small thing, ` +
          `measurable drop-off.`
      ).toBe('email');
    });
  });

  // ===========================================================
  // 5b. Alignment
  // ===========================================================
  // These are REGRESSION GUARDS. Every one passes today — measured on
  // all four stores. They exist so that a padding or flex change that
  // knocks the footer out of line fails a test instead of shipping.
  test.describe('Alignment', () => {

    test('FT-ALIGN-01 — column headings sit on the same line', async ({ footerPage }) => {
      const boxes = await footerPage.titleBoxes();
      const tops = boxes.map((b) => Math.round(b.top));
      const highest = Math.min(...tops);
      const verdicts = tops.map((t) => Math.abs(t - highest) <= 2);
      await spotVerdicts(footerPage.columnTitles(), verdicts);

      const offset = tops.map((t, i) =>
        Math.abs(t - highest) > 2 ? `column ${i + 1} is ${Math.abs(t - highest)}px lower` : null
      ).filter(Boolean);

      expect(
        offset,
        `FT-ALIGN-01 / heading-misaligned: ${offset.join(', ')}. The column headings ` +
          `should share one top edge — a heading sitting lower than its neighbours is ` +
          `the most visible way a footer looks broken.`
      ).toEqual([]);
    });

    test('FT-ALIGN-02 — links in a column are flush with each other', async ({ footerPage }) => {
      const total = await footerPage.columnCount();
      const ragged: string[] = [];

      for (let i = 0; i < total; i++) {
        const edges = await footerPage.linkLeftEdges(i);
        // A tidy left-aligned column yields exactly one left edge.
        if (edges.length > 1) {
          ragged.push(`column ${i + 1} has ${edges.length} different left edges (${edges.join(', ')}px)`);
        }
      }

      expect(
        ragged,
        `FT-ALIGN-02 / ragged-column: ${ragged.join('; ')}. Every link in a column should ` +
          `start at the same x position. Different left edges means one link is indented ` +
          `relative to the others.`
      ).toEqual([]);
    });

    test('FT-ALIGN-03 — the columns are evenly sized', async ({ footerPage }) => {
      const boxes = await footerPage.columnBoxes();
      const widths = boxes.map((b) => Math.round(b.width));
      const widest = Math.max(...widths);
      const narrowest = Math.min(...widths);

      expect(
        widest - narrowest,
        `FT-ALIGN-03 / uneven-columns: footer columns measure [${widths.join(', ')}]px — ` +
          `a ${widest - narrowest}px spread. They share one grid, so unequal widths mean ` +
          `a column has picked up padding the others do not have.`
      ).toBeLessThanOrEqual(2);
    });

    test('FT-ALIGN-04 — the signup button is centred in the field', async ({ footerPage }) => {
      const a = await footerPage.newsletterButtonAlignment();
      await spot(footerPage.newsletterSubmit());

      expect(
        a,
        `FT-ALIGN-04 / missing: could not measure the newsletter button against its field.`
      ).not.toBeNull();

      // Ask the question that fits the arrangement. Asserting "centred
      // in the field" against a stacked layout would fail a perfectly
      // correct design — dense does exactly that on mobile.
      if (a!.layout === 'stacked') {
        expect(
          Math.round(a!.leftOffset),
          `FT-ALIGN-04 / stacked-misaligned: the submit button sits on its own line below ` +
            `the email field, but its left edge is ${Math.round(a!.leftOffset)}px off the ` +
            `field's. Stacked controls should line up down the left.`
        ).toBeLessThanOrEqual(2);
      } else {
        expect(
          Math.round(a!.offset),
          `FT-ALIGN-04 / off-centre: the submit button's centre is ${Math.round(a!.offset)}px ` +
            `off the email field's centre (button ${Math.round(a!.buttonCentreY)}px, field ` +
            `${Math.round(a!.inputCentreY)}px). It shares the field's row, so any height ` +
            `change leaves it floating high or low.`
        ).toBeLessThanOrEqual(2);
      }

      // Containment is only a fair question for the overlay layout.
      if (a!.layout === 'overlay') {
        expect(
          a!.insideInput,
          `FT-ALIGN-04 / outside-field: the submit button is positioned absolutely over ` +
            `the email field but is no longer horizontally contained by it.`
        ).toBe(true);
      }
    });

    test('FT-ALIGN-05 — the button label is centred inside the button', async ({ footerPage }) => {
      const a = await footerPage.newsletterButtonAlignment();
      await spot(footerPage.newsletterSubmit());

      const centred = a!.justifyContent === 'center' || a!.textAlign === 'center';
      expect(
        centred,
        `FT-ALIGN-05 / label-not-centred: the submit button's content is aligned ` +
          `justify-content:${a!.justifyContent} / text-align:${a!.textAlign}. The label ` +
          `should be centred in the button, otherwise it sits against one edge.`
      ).toBe(true);

      expect(
        a!.alignItems,
        `FT-ALIGN-05 / label-not-centred-vertically: the button uses ` +
          `align-items:${a!.alignItems}, so its label is not vertically centred.`
      ).toBe('center');
    });

    test('FT-ALIGN-06 — no footer text is cut off', async ({ footerPage }) => {
      const clipped = await footerPage.clippedText();
      expect(
        clipped,
        `FT-ALIGN-06 / clipped: footer text is wider than the space it is given and is ` +
          `being cut off rather than wrapped:\n  ${clipped.join('\n  ')}\n` +
          `Long menu labels are the usual cause.`
      ).toEqual([]);
    });
  });

  // ===========================================================
  // 5. Brand block and social
  // ===========================================================
  test.describe('Brand & social', () => {

    test('FT-BRAND-01 — the brand block is present', async ({ preset, footerPage }) => {
      await spot(footerPage.brandBlocks());
      expect(
        await footerPage.brandBlocks().count(),
        `FT-BRAND-01 / count: ${preset.label} should show ` +
          `${preset.footer!.brandBlocks} brand block(s) in the footer.`
      ).toBe(preset.footer!.brandBlocks);
    });

    test('FT-BRAND-02 — the footer logo has alt text', async ({ footerPage }) => {
      const img = footerPage.brandLogoImg().first();
      await spot(img);
      const alt = await img.getAttribute('alt');
      expect(
        (alt ?? '').trim().length,
        `FT-BRAND-02 / missing-alt: the footer logo has no alt text. If the image fails ` +
          `to load, or a screen reader reads the page, there is nothing to announce.`
      ).toBeGreaterThan(0);
    });

    test('FT-SOCIAL-01 — the expected social icons are present', async ({ preset, footerPage }) => {
      await spot(footerPage.socialLinks());
      expect(
        await footerPage.socialLinks().count(),
        `FT-SOCIAL-01 / count: ${preset.label} should show ${preset.footer!.social} ` +
          `social icon(s) in the footer.`
      ).toBe(preset.footer!.social);
    });

    test('FT-SOCIAL-02 — every social icon is labelled and points off-site', async ({ footerPage }) => {
      const socials = await footerPage.socialHrefs();
      const verdicts = socials.map((s) => s.label.length > 0 && !!s.href && /^https?:/.test(s.href));
      await spotVerdicts(footerPage.socialLinks(), verdicts);

      const bad = socials
        .map((s, i) => (verdicts[i] ? null : `#${i + 1} href=${s.href} label="${s.label}"`))
        .filter(Boolean);
      expect(
        bad,
        `FT-SOCIAL-02 / unlabelled-or-broken: social icon(s) ${bad.join(', ')} either have ` +
          `no accessible name or do not link to a real external profile. These are ` +
          `icon-only links — without a label a screen reader says only "link".`
      ).toEqual([]);
    });
  });

  // ===========================================================
  // 6. Layout
  // ===========================================================
  test.describe('Layout', () => {

    test('FT-LAYOUT-01 — no horizontal page overflow', async ({ page }) => {
      await assertNoPageOverflow(page);
    });

    test('FT-LAYOUT-02 — links stay inside the footer box', async ({ footerPage }) => {
      const total = await footerPage.columnCount();
      for (let i = 0; i < total; i++) {
        const links = footerPage.columnLinks(i);
        const overflowing = await links.evaluateAll((els) =>
          els
            .map((el, n) => {
              const parent = el.closest('.footer-menu');
              if (!parent) return null;
              const a = el.getBoundingClientRect();
              const b = parent.getBoundingClientRect();
              return a.right > b.right + 2 || a.left < b.left - 2 ? n + 1 : null;
            })
            .filter(Boolean)
        );
        expect(
          overflowing,
          `FT-LAYOUT-02 / spill: link(s) ${overflowing.join(', ')} in column ${i + 1} ` +
            `render outside their column box. Usually a long menu label that does not wrap.`
        ).toEqual([]);
      }
    });

    test('FT-LAYOUT-03 — the footer holds across the viewport matrix', async ({ page, footerPage }) => {
      for (const width of [1440, 1200, 1024, 768, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await footerPage.scrollToFooter();
        await expect(
          footerPage.root(),
          `FT-LAYOUT-03 / breakpoint: the footer stopped being visible at ${width}px.`
        ).toBeVisible();
        await assertNoPageOverflow(page);
      }
    });
  });

  // ===========================================================
  // 7. Accessibility
  // ===========================================================
  test.describe('Accessibility', () => {

    test('FT-A11Y-01 — no critical accessibility violations', async ({ page, footerPage }) => {
      await spot(footerPage.root());
      const results = await new AxeBuilder({ page })
        .include('footer.footer')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const critical = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );
      expect(
        critical.map((v) => `${v.id}: ${v.help} -> ${v.nodes[0]?.target?.join(' ')}`),
        `FT-A11Y-01 / axe: ${critical.length} critical violation(s) in the footer.`
      ).toEqual([]);
    });

    test('FT-A11Y-02 — text contrast is at least 4.5:1', async ({ page }) => {
      const results = await new AxeBuilder({ page })
        .include('footer.footer')
        .withRules(['color-contrast'])
        .analyze();

      expect(
        results.violations.flatMap((v) => v.nodes.map((n) => n.target.join(' '))),
        `FT-A11Y-02 / contrast: footer text fails the 4.5:1 minimum. Footers are ` +
          `commonly set in a muted grey on a dark band, which is exactly where this fails.`
      ).toEqual([]);
    });

    test('FT-A11Y-03 — the footer is a labelled landmark', async ({ footerPage }) => {
      const root = footerPage.root();
      await spot(root);
      const role = await root.evaluate((el) => {
        const explicit = el.getAttribute('role');
        // <footer> is only a contentinfo landmark when it is not nested
        // inside article/section/main.
        const nested = !!el.closest('article, section, main, aside');
        return { explicit, nested, tag: el.tagName.toLowerCase() };
      });
      expect(
        role.nested,
        `FT-A11Y-03 / landmark: the <footer> is nested inside ` +
          `article/section/main, so browsers do NOT expose it as the page's ` +
          `"contentinfo" landmark. Screen-reader users lose the shortcut that jumps ` +
          `straight to the footer.`
      ).toBe(false);
    });
  });
});
