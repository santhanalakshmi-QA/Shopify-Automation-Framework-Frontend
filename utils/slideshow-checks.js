// utils/slideshow-checks.js
// ─────────────────────────────────────────────────────────────
// Shared assertions for the slideshow checklist
// (see slideshow-checklist.md). Each throws the namespaced message
// the checklist specifies, so a report can be grepped by category:
// SS-RENDER, SS-NAV, SS-LOOP, SS-DOT, SS-AUTO, SS-TOUCH, SS-LAYOUT,
// SS-MEDIA, SS-LINK, SS-A11Y, SS-PERF, SS-NEG.
//
// Kept generic so the other 24 section suites can reuse them.
// ─────────────────────────────────────────────────────────────

import { expect } from '@playwright/test';
import { spot } from './demo-hud.js';

// Every assertion below takes an options object carrying `prefix`, so the
// same helper serves any section suite: the slideshow passes "SS", a
// testimonial suite passes "TS", and each gets failure messages carrying
// its OWN check IDs. Without this a testimonial failure would print
// "SS-LAYOUT-01" and be untraceable to its checklist.
const DEFAULT_PREFIX = 'SS';

/**
 * Bind a prefix once and get the whole assertion set back, so a section
 * suite does not repeat it at every call site:
 *   const { assertNoPageOverflow } = checksFor('TS');
 */
export function checksFor(prefix = DEFAULT_PREFIX) {
  return {
    assertRenderHealth: (items, opts = {}) => assertRenderHealth(items, { ...opts, prefix }),
    expectNoMissingTranslations: (scope, opts = {}) =>
      expectNoMissingTranslations(scope, { ...opts, prefix }),
    assertNoDeadOrUnsafeLinks: (scope, opts = {}) =>
      assertNoDeadOrUnsafeLinks(scope, { ...opts, prefix }),
    assertNoPageOverflow: (page, opts = {}) => assertNoPageOverflow(page, { ...opts, prefix }),
    assertContentInsideBox: (container, children, opts = {}) =>
      assertContentInsideBox(container, children, { ...opts, prefix }),
    expectNoPlaceholderText: (scope, opts = {}) =>
      expectNoPlaceholderText(scope, { ...opts, prefix }),
  };
}

// ── <PREFIX>-RENDER-04 / 05 — geometry and image health ────────────
// A collapsed slide still passes toBeVisible(); this is the check
// that catches it.
export async function assertRenderHealth(items, { minHeight = 40, requireImages = false, prefix = DEFAULT_PREFIX } = {}) {
  await spot(items);
  const count = await items.count();

  for (let i = 0; i < count; i++) {
    const item = items.nth(i);
    if (!(await item.isVisible())) continue;

    const box = await item.boundingBox();
    if (!box) continue;

    expect(
      box.height,
      `${prefix}-RENDER-04 / collapsed: "slide[${i}]" is ${Math.round(box.width)}px wide but ` +
        `${Math.round(box.height)}px tall (minimum ${minHeight}px). ` +
        `The slide occupies horizontal space but no vertical space — usually an empty ` +
        `slide, or an image that failed to load with no height fallback.`
    ).toBeGreaterThanOrEqual(minHeight);

    if (!requireImages) continue;

    const broken = await item.locator('img').evaluateAll((imgs) =>
      imgs
        .filter((img) => img.complete && img.naturalWidth === 0)
        .map((img) => img.currentSrc || img.src)
    );

    expect(
      broken,
      `${prefix}-RENDER-05 / broken-image: "slide[${i}]" contains image(s) that failed to decode — ` +
        `the element renders as a broken-image placeholder:\n  ${broken.join('\n  ')}\n` +
        `The <img> is present and complete, but naturalWidth is 0.`
    ).toEqual([]);
  }
}

// ── <PREFIX>-RENDER-06 — missing translation keys ──────────────────
export async function expectNoMissingTranslations(scope, { prefix = DEFAULT_PREFIX } = {}) {
  const found = await scope.evaluate((el) =>
    (el.innerText.match(/Translation missing:[^\n]*/g) ?? []).map((s) => s.trim())
  );

  expect(
    found,
    `${prefix}-RENDER-06 / translation: the section rendered ${found.length} missing translation ` +
      `key(s) as visible text:\n  ${found.join('\n  ')}\n` +
      `Add the key to locales/en.default.json AND every other locale the theme ships.`
  ).toEqual([]);
}

// ── <PREFIX>-LINK-01 / 03 / 04 — dead and unsafe anchors ───────────
export async function assertNoDeadOrUnsafeLinks(scope, { prefix = DEFAULT_PREFIX } = {}) {
  await spot(scope.locator('a'));
  const anchors = await scope.locator('a').evaluateAll((els) =>
    els.map((a) => ({
      href: a.getAttribute('href'),
      target: a.getAttribute('target'),
      rel: a.getAttribute('rel') ?? '',
      text: (a.textContent ?? '').trim().slice(0, 40),
      // An image link is NOT an empty shell: a screen reader announces
      // the image's alt text. Checking textContent alone flagged every
      // picture link on the collection list as unlabelled.
      ariaLabel: (a.getAttribute('aria-label') ?? '').trim(),
      title: (a.getAttribute('title') ?? '').trim(),
      imgAlt: [...a.querySelectorAll('img')]
        .map((i) => (i.getAttribute('alt') ?? '').trim())
        .filter(Boolean)
        .join(' ')
        .slice(0, 40),
      w: Math.round(a.getBoundingClientRect().width),
      h: Math.round(a.getBoundingClientRect().height),
    }))
  );

  // <PREFIX>-LINK-01 — anchors that go nowhere.
  const dead = anchors.filter((a) => a.href === null || a.href.trim() === '');
  expect(
    dead,
    `${prefix}-LINK-01 / dead-link: the section rendered ${dead.length} clickable anchor(s) that ` +
      `go nowhere:\n` +
      dead.map((a) => `  "${a.text}" → "${a.href ?? '(no href)'}" — clicking reloads the current page`).join('\n') +
      `\nA button with no link configured should render a <span>/<button>, or not render at all.`
  ).toEqual([]);

  // <PREFIX>-LINK-03 — tabnabbing risk.
  const unsafe = anchors.filter(
    (a) => a.target === '_blank' && !/noopener/.test(a.rel)
  );
  expect(
    unsafe,
    `${prefix}-LINK-03 / unsafe-target: ${unsafe.length} link(s) open a new tab without rel="noopener":\n` +
      unsafe.map((a) => `  "${a.text}" → ${a.href}`).join('\n') +
      `\nThe opened page gets a window.opener reference back to your store.`
  ).toEqual([]);

  // <PREFIX>-LINK-04 — rendered but genuinely unlabelled boxes.
  // "Labelled" means any of: visible text, aria-label, title, or an
  // image with alt text — all four are announced by a screen reader.
  const shells = anchors.filter(
    (a) => a.w > 0 && a.h > 0 && !a.text && !a.ariaLabel && !a.title && !a.imgAlt
  );
  expect(
    shells,
    `${prefix}-LINK-04 / empty-shell: ${shells.length} anchor(s) render a visible box with ` +
      `no text, no aria-label, no title and no image alt:\n` +
      shells.map((a) => `  ${a.w}x${a.h}px → ${a.href}`).join('\n') +
      `\nA clickable box with nothing to announce reads as "link" to a screen reader, and ` +
      `receives keyboard focus for no apparent reason.`
  ).toEqual([]);
}

// ── <PREFIX>-CONTENT — theme placeholder text left in production ───
/**
 * Every Shopify theme ships default copy in its settings so a section
 * is not empty in the editor — "Add a short description here.",
 * "Tell your story", and so on. It is meant to be replaced.
 *
 * When it is not, it goes live looking like real content: correctly
 * styled, correctly placed, and completely meaningless to a shopper.
 * Nothing errors and nothing looks broken, which is exactly why it
 * survives — the merchant filled in the heading, missed the subtitle,
 * and nobody scrolled back to check.
 *
 * Deliberately conservative: only strings that are unmistakably an
 * instruction to the merchant, and only in short text nodes, so real
 * copy that happens to contain the word "description" is not flagged.
 */
const PLACEHOLDER_COPY =
  /add (a )?(short )?(description|text|heading|title|content)|lorem ipsum|your text here|placeholder text|sample text|edit this text|tell your story|use this text to share/i;

export async function expectNoPlaceholderText(scope, { prefix = DEFAULT_PREFIX } = {}) {
  await spot(scope);

  const found = await scope.evaluate((el, source) => {
    const re = new RegExp(source, 'i');
    const out = [];
    for (const node of el.querySelectorAll('*')) {
      if (node.children.length) continue;          // leaf text only
      const text = (node.textContent ?? '').trim();
      if (!text || text.length > 90) continue;     // real copy is longer
      if (re.test(text)) {
        out.push(`<${node.tagName.toLowerCase()}> "${text.slice(0, 60)}"`);
      }
    }
    return [...new Set(out)];
  }, PLACEHOLDER_COPY.source);

  expect(
    found,
    `${prefix}-CONTENT / placeholder-copy: the theme's own default text is still on the ` +
      `live page:\n  ${found.join('\n  ')}\n` +
      `This is the prompt Shopify shows a merchant in the theme editor, not content. It ` +
      `renders to shoppers in the right font, in the right place, saying nothing.`
  ).toEqual([]);
}

// ── <PREFIX>-LAYOUT-01 — page-level horizontal overflow ────────────
/**
 * This one is PAGE-level, so it fails in every section suite at once
 * whenever any single section blows the page out sideways. That makes
 * it easy to misread as "the section under test is broken".
 *
 * So when it fails it also names the widest offending element and
 * which section owns it — enough for a defect report to land on the
 * right team's desk rather than on whoever's suite happened to run.
 */
export async function assertNoPageOverflow(page, { tolerance = 2, prefix = DEFAULT_PREFIX } = {}) {
  const { scrollWidth, clientWidth, culprits } = await page.evaluate(() => {
    const clientWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;

    const culprits =
      scrollWidth - clientWidth <= 2
        ? []
        : [...document.querySelectorAll('body *')]
            .map((el) => ({ el, r: el.getBoundingClientRect() }))
            .filter(({ r }) => r.right > clientWidth + 2 && r.width > 40)
            .sort((a, b) => b.r.right - a.r.right)
            .slice(0, 3)
            .map(({ el, r }) => {
              const section = el.closest('[id^="shopify-section-"]');
              const type = section?.id.match(/__(.+?)_[A-Za-z0-9]{5,}$/)?.[1] ?? null;
              const cls = String(el.className).trim().split(/\s+/).slice(0, 2).join('.');
              return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''} reaches ${Math.round(r.right)}px` +
                (type ? `  (owned by the "${type}" section)` : '');
            });

    return { scrollWidth, clientWidth, culprits };
  });

  expect(
    scrollWidth - clientWidth,
    `${prefix}-LAYOUT-01 / page-blowout: the page renders ${scrollWidth}px wide inside a ` +
      `${clientWidth}px window (+${scrollWidth - clientWidth}px), so it can be dragged ` +
      `sideways into empty space.\n` +
      `Widest offender(s):\n  ${culprits.join('\n  ')}\n` +
      `NOTE: this is a PAGE-level measurement. If the section named above is not the one ` +
      `this suite covers, the defect belongs to that section — this check simply notices ` +
      `it first. Usually a full-bleed slide or marquee track missing overflow:hidden.`
  ).toBeLessThanOrEqual(tolerance);
}

// ── <PREFIX>-LAYOUT-02 — children escaping their container ─────────
/**
 * `onlyInView` exists because of carousels.
 *
 * In a Swiper track every slide is laid out on one long strip, so the
 * slides that are NOT currently showing sit far outside the visible
 * container by design — hundreds of pixels out. Measuring them against
 * the container reports a spill that no shopper can ever see, and does
 * it on every carousel-backed section at once.
 *
 * With `onlyInView`, a child is measured only when it actually overlaps
 * the container's visible box. That keeps the check meaningful — content
 * escaping the frame you can see is still caught — without inventing
 * failures for content parked off-stage.
 */
export async function assertContentInsideBox(container, children, { tolerance = 2, onlyInView = false, prefix = DEFAULT_PREFIX } = {}) {
  await spot(children);
  const outer = await container.boundingBox();
  if (!outer) return;

  // Measured in one pass in the browser so each child can be judged
  // against its own ancestor chain, not just the outer box.
  const offenders = await children.evaluateAll(
    (els, { outer, tolerance, onlyInView }) =>
      els
        .map((el, i) => {
          const box = el.getBoundingClientRect();
          if (!box.width || !box.height) return null;
          // Parity with the previous Playwright isVisible() gate: an
          // element hidden by `visibility` still has a box, and it was
          // never measured before. Keep it that way.
          if (getComputedStyle(el).visibility === 'hidden') return null;

          if (onlyInView) {
            // 1. Off-stage carousel slide — parked outside the frame on
            //    purpose, and no shopper can see it there.
            const overlaps = box.left < outer.x + outer.width && box.right > outer.x;
            if (!overlaps) return null;

            // 2. Clipped by an ancestor. The marquee strip, the logo
            //    carousel and the banner track all run content past
            //    their edge deliberately, with overflow:hidden doing
            //    its job. A spill nobody can see is not a defect — and
            //    if it ever forces the PAGE sideways, LAYOUT-01 has it.
            for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
              const o = getComputedStyle(n).overflowX;
              if (o === 'hidden' || o === 'clip' || o === 'auto' || o === 'scroll') return null;
            }
          }

          const overhang = Math.max(
            box.right - (outer.x + outer.width),
            outer.x - box.left
          );
          if (overhang <= tolerance) return null;

          const label = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 30) || `child[${i}]`;
          return { label, overhang: Math.round(overhang) };
        })
        .filter(Boolean),
    { outer, tolerance, onlyInView }
  );

  expect(
    offenders.map((o) => `"${o.label}" +${o.overhang}px`),
    `${prefix}-LAYOUT-02 / parent-escape: content extends past the edge of its container ` +
      `and is NOT clipped, so it is visibly cut off or overlapping at this viewport.`
  ).toEqual([]);
}

export default {
  assertRenderHealth,
  expectNoMissingTranslations,
  assertNoDeadOrUnsafeLinks,
  assertNoPageOverflow,
  assertContentInsideBox,
};
