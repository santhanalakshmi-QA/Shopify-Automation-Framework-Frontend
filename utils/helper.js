// utils/Helper.js
// ─────────────────────────────────────────────────────────────
// Shared helper functions used across all test files.
// Import what you need in any test file like this:
//   import { addToCart, collectErrors } from '../utils/Helper.js';
// ─────────────────────────────────────────────────────────────
import { expect } from '@playwright/test';
import LOCATORS from '../locators/shopify-locators.js';

// ── URL constants ─────────────────────────────────────────────
export const URLS = {
  home:        '/',
  collections: '/collections/all',
  cart:        '/cart',
  contact:     '/pages/contact',
  blog:        '/blogs/news',
  search:      '/search',
  login:       '/account/login',
  register:    '/account/register',
  notFound:    '/this-page-does-not-exist-404',
};

// ── Breakpoints for responsive testing ───────────────────────
export const BREAKPOINTS = [
  { name: 'Mobile-S',  width: 375,  height: 812  },
  { name: 'Mobile-L',  width: 430,  height: 932  },
  { name: 'Tablet',    width: 768,  height: 1024 },
  { name: 'Desktop-S', width: 1024, height: 768  },
  { name: 'Desktop-L', width: 1440, height: 900  },
  { name: 'Wide',      width: 1920, height: 1080 },
];

// ── Navigate to a path and wait ───────────────────────────────
// Paths stay relative so Playwright resolves them against the running
// project's baseURL — that is what lets one helper serve every preset.
export async function gotoPage(page, path, waitUntil = 'domcontentloaded') {
  await page.goto(path, { waitUntil });
}

// ── Add first available product to cart ───────────────────────
// Used in cart and checkout tests
export async function addToCart(page) {
  await gotoPage(page, URLS.collections);

  // Click first product card
  await page.locator(LOCATORS.collection.productLink).first().click();
  await page.waitForLoadState('load');

  // Click Add to Cart button
  const atcBtn = page.locator(LOCATORS.product.atcButton).first();
  await atcBtn.waitFor({ state: 'visible', timeout: 8000 });
  await atcBtn.click();

  // Wait for cart drawer or notification to appear
  await page.locator(LOCATORS.cart.drawer).first()
    .waitFor({ state: 'visible', timeout: 8000 });
}

// ── URL matching ──────────────────────────────────────────────

// Escape a string so it can be embedded in a RegExp literally.
export function escapeForRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Pattern matching a store's home page — the origin, an optional
// trailing slash and an optional query string, nothing else. Built
// from the preset URL so it works for every preset store.
export function homeUrlPattern(storeUrl) {
  const origin = String(storeUrl).replace(/\/+$/, '');
  return new RegExp(`^${escapeForRegExp(origin)}/?(\\?.*)?$`);
}

// ── Collect JS console errors ─────────────────────────────────
// Call BEFORE page.goto() — returns array of errors found
export function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

// ── Collect failed network requests ──────────────────────────
// Flags any request returning 400+ status codes
export function collectFailedRequests(page) {
  const failed = [];
  page.on('response', (res) => {
    if (res.status() >= 400) {
      failed.push(`[${res.status()}] ${res.url()}`);
    }
  });
  return failed;
}

// ── Set viewport size ─────────────────────────────────────────
export async function setViewport(page, width, height) {
  await page.setViewportSize({ width, height });
}

// ── Take a screenshot ─────────────────────────────────────────
export async function takeScreenshot(page, fileName) {
  await page.screenshot({
    path: `screenshots/${fileName}.png`,
    fullPage: false,
  });
  console.log(`📸 Screenshot saved: screenshots/${fileName}.png`);
}

// ── Check if element is visible (safe — no error thrown) ──────
export async function isVisible(page, selector) {
  try {
    return await page.locator(selector).first().isVisible();
  } catch {
    return false;
  }
}

// ── Wait for element to appear ────────────────────────────────
export async function waitFor(page, selector, timeout = 8000) {
  await page.locator(selector).first().waitFor({
    state: 'visible',
    timeout,
  });
}

// ── Scroll down the page ──────────────────────────────────────
export async function scrollDown(page, pixels = 600) {
  await page.evaluate((px) => window.scrollBy(0, px), pixels);
  await page.waitForTimeout(300);
}

// ── Fill contact form fields ──────────────────────────────────
export async function fillContactForm(page, { name, email, message }) {
  await page.locator(LOCATORS.contact.nameInput).first().fill(name);
  await page.locator(LOCATORS.contact.emailInput).first().fill(email);
  await page.locator(LOCATORS.contact.msgInput).first().fill(message);
}

// ── Open search and type a query ──────────────────────────────
export async function searchFor(page, query) {
  await page.locator(LOCATORS.header.searchIcon).first().click();
  const input = page.locator(LOCATORS.search.input).first();
  await input.waitFor({ state: 'visible', timeout: 5000 });
  await input.fill(query);
  await page.waitForTimeout(600); // wait for debounce
}

// ── Open mobile menu ──────────────────────────────────────────
export async function openMobileMenu(page) {
  await setViewport(page, 375, 812);
  await page.locator(LOCATORS.header.menuButton).first().click();
  await page.waitForTimeout(400);
  await page.locator(LOCATORS.nav.mobileMenu).first()
    .waitFor({ state: 'visible', timeout: 5000 });
}

// ── Get all internal links on current page ────────────────────
export async function getInternalLinks(page) {
  const hrefs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href]'))
      .map((a) => a.getAttribute('href'))
  );
  return [...new Set(
    hrefs.filter((h) =>
      h && h.startsWith('/') && !h.startsWith('//') && !h.includes('#')
    )
  )];
}
// ── Home-page section helpers ────────────────────────────────
export const VIEWPORTS = {
  mobile:  { width: 375,  height: 812 },
  tablet:  { width: 768,  height: 1024 },
  desktop: { width: 1440, height: 900 },
};

export async function gotoHome(page) {
  await gotoPage(page, URLS.home);
  await page.waitForLoadState('networkidle').catch(() => {});
}

export function sectionsOfType(page, key) {
  return page.locator(LOCATORS[key].section);
}

export function sectionWrappers(page) {
  return page.locator(LOCATORS.home.sectionWrapper);
}

export async function expectAtLeast(locator, min, label) {
  const count = await locator.count();
  expect(count, `Expected ≥${min} "${label}", found ${count}`).toBeGreaterThanOrEqual(min);
  return count;
}

export async function expectImageLoaded(img) {
  await expect(img).toBeVisible();
  const ok = await img.evaluate((el) =>
    el.tagName.toLowerCase() !== 'img' ? true : el.complete && el.naturalWidth > 0
  );
  expect(ok, 'Image should be loaded (naturalWidth > 0)').toBeTruthy();
}
export default {
  URLS,
  BREAKPOINTS,
  gotoPage,
  addToCart,
  collectErrors,
  collectFailedRequests,
  setViewport,
  takeScreenshot,
  isVisible,
  waitFor,
  scrollDown,
  fillContactForm,
  searchFor,
  openMobileMenu,
  getInternalLinks,
};
