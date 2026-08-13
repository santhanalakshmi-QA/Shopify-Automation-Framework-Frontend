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

// ── <PREFIX>-LAYOUT-01 — page-level horizontal overflow ────────────
export async function assertNoPageOverflow(page, { tolerance = 2, prefix = DEFAULT_PREFIX } = {}) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  expect(
    scrollWidth - clientWidth,
    `${prefix}-LAYOUT-01 / page-blowout: document scrollWidth is ${scrollWidth}px against a ` +
      `${clientWidth}px viewport (+${scrollWidth - clientWidth}px). ` +
      `Usually a full-bleed slide missing overflow:hidden, or a negative margin.`
  ).toBeLessThanOrEqual(tolerance);
}

// ── <PREFIX>-LAYOUT-02 — children escaping their container ─────────
export async function assertContentInsideBox(container, children, { tolerance = 2, prefix = DEFAULT_PREFIX } = {}) {
  await spot(children);
  const outer = await container.boundingBox();
  if (!outer) return;

  const count = await children.count();
  for (let i = 0; i < count; i++) {
    const child = children.nth(i);
    if (!(await child.isVisible())) continue;

    const box = await child.boundingBox();
    if (!box) continue;

    const overhangRight = box.x + box.width - (outer.x + outer.width);
    const overhangLeft = outer.x - box.x;
    const label = (await child.innerText().catch(() => '')).trim().slice(0, 30) || `child[${i}]`;

    expect(
      Math.max(overhangRight, overhangLeft),
      `${prefix}-LAYOUT-02 / parent-escape: "${label}" extends ` +
        `${Math.round(Math.max(overhangRight, overhangLeft))}px past the edge of its ` +
        `slide container. At this viewport the content is cut off or overlapping.`
    ).toBeLessThanOrEqual(tolerance);
  }
}

export default {
  assertRenderHealth,
  expectNoMissingTranslations,
  assertNoDeadOrUnsafeLinks,
  assertNoPageOverflow,
  assertContentInsideBox,
};
