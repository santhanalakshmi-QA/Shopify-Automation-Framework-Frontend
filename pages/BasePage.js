// pages/BasePage.js
// ─────────────────────────────────────────────────────────────
// Base class for all page objects.
// Every page (HomePage, ProductPage, CartPage etc.)
// extends this class and inherits these shared methods.
// ─────────────────────────────────────────────────────────────

import LOCATORS from '../locators/shopify-locators.js';

export class BasePage {

  // `preset` is the resolved preset config (see utils/presets.js) and is
  // injected by the `headerPage` fixture. It carries the store label and
  // its per-preset expectations; the URL itself is NOT used for
  // navigation — that comes from the project's baseURL — so one page
  // object serves every preset store.
  constructor(page, preset = null) {
    this.page     = page;
    this.locators = LOCATORS;
    this.preset   = preset;
  }

  // ── Navigation ──────────────────────────────────────────────

  // Go to any path on the site. Paths stay relative so Playwright
  // resolves them against the running project's baseURL, which is what
  // makes the same test run against all four preset stores.
  async goto(path = '/') {
    await this.page.goto(path, {
      waitUntil: 'domcontentloaded',
    });
  }

  // Go to home page
  async gotoHome() {
    await this.goto('/');
  }

  // Go to collections page
  async gotoCollections() {
    await this.goto('/collections/all');
  }

  // Go to cart page
  async gotoCart() {
    await this.goto('/cart');
  }

  // Go to contact page
  async gotoContact() {
    await this.goto('/pages/contact');
  }

  // Go to blog page
  async gotoBlog() {
    await this.goto('/blogs/news');
  }

  // Go to login page
  async gotoLogin() {
    await this.goto('/account/login');
  }

  // ── Waiting helpers ─────────────────────────────────────────

  // Wait for an element to be visible
  async waitForElement(selector, timeout = 10000) {
    await this.page.locator(selector).first().waitFor({
      state: 'visible',
      timeout,
    });
  }

  // Wait for page to fully load
  async waitForPageLoad() {
    await this.page.waitForLoadState('load');
  }

  // ── Element checks ──────────────────────────────────────────

  // Check if element is visible — returns true or false
  async isVisible(selector) {
    try {
      return await this.page.locator(selector).first().isVisible();
    } catch {
      return false;
    }
  }

  // Get text content of an element
  async getText(selector) {
    return await this.page.locator(selector).first().innerText();
  }

  // Get attribute value of an element
  async getAttribute(selector, attribute) {
    return await this.page.locator(selector).first().getAttribute(attribute);
  }

  // ── Actions ─────────────────────────────────────────────────

  // Click an element
  async click(selector) {
    await this.page.locator(selector).first().click();
  }

  // Fill an input field
  async fill(selector, value) {
    await this.page.locator(selector).first().fill(value);
  }

  // Press a keyboard key
  async pressKey(key) {
    await this.page.keyboard.press(key);
  }

  // Scroll down by pixels
  async scrollDown(pixels = 500) {
    await this.page.evaluate((px) => window.scrollBy(0, px), pixels);
    await this.page.waitForTimeout(300);
  }

  // Bring a section to the middle of the screen and keep it there.
  //
  // Two traps this avoids:
  //   1. The theme sets `scroll-behavior: smooth`, so a plain
  //      scrollIntoView animates and a short wait lands mid-flight —
  //      hence `behavior: 'instant'`.
  //   2. Content above can finish loading afterwards and push the
  //      section back down, so it is re-scrolled until the position
  //      stops moving.
  //
  // Matters for headed runs, where a section left off-screen means you
  // cannot see what is being tested: Playwright auto-scrolls for clicks,
  // but never for read-only checks like styles, text or axe.
  async scrollSectionIntoView(locator, attempts = 4) {
    let last = null;
    for (let i = 0; i < attempts; i++) {
      await locator.evaluate((el) =>
        el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })
      );
      await this.page.waitForTimeout(250);

      const top = await locator.evaluate((el) => Math.round(el.getBoundingClientRect().top));
      if (last !== null && Math.abs(top - last) <= 2) break; // settled
      last = top;
    }
  }

  // Scroll to bottom of page
  async scrollToBottom() {
    await this.page.evaluate(() =>
      window.scrollTo(0, document.body.scrollHeight)
    );
    await this.page.waitForTimeout(500);
  }

  // Hover over an element
  async hover(selector) {
    await this.page.locator(selector).first().hover();
  }

  // ── Viewport helpers ────────────────────────────────────────

  // Set viewport to mobile size (375px)
  async setMobileView() {
    await this.page.setViewportSize({ width: 375, height: 812 });
  }

  // Set viewport to tablet size (768px)
  async setTabletView() {
    await this.page.setViewportSize({ width: 768, height: 1024 });
  }

  // Set viewport to desktop size (1440px)
  async setDesktopView() {
    await this.page.setViewportSize({ width: 1440, height: 900 });
  }

  // ── Screenshot helpers ──────────────────────────────────────

  // Take a full page screenshot
  async takeScreenshot(name) {
    await this.page.screenshot({
      path: `screenshots/${name}.png`,
      fullPage: true,
    });
  }

  // ── Header actions ──────────────────────────────────────────

  // Click the cart icon in header
  async clickCartIcon() {
    await this.click(this.locators.header.cartIcon);
  }

  // Click search icon in header
  async clickSearchIcon() {
    await this.click(this.locators.header.searchIcon);
  }

  // Click hamburger menu (mobile)
  async clickMobileMenu() {
    await this.click(this.locators.header.menuButton);
    await this.page.waitForTimeout(400);
  }

  // Click logo to go home
  async clickLogo() {
    await this.click(this.locators.header.logo);
    await this.waitForPageLoad();
  }

  // ── Console error checker ───────────────────────────────────

  // Collect all JS errors on a page
  // Call this before page.goto() to capture errors
  collectConsoleErrors() {
    const errors = [];
    this.page.on('pageerror', (err) => errors.push(err.message));
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    return errors;
  }

  // ── URL helper ───────────────────────────────────────────────

  // Get current page URL
  getCurrentURL() {
    return this.page.url();
  }

  // Get current page title
  async getPageTitle() {
    return await this.page.title();
  }

}
