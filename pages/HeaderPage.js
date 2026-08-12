// pages/HeaderPage.js
// ─────────────────────────────────────────────────────────────
// Page Object for the site header. Preset-agnostic: the same class
// drives every preset store, with the preset config injected by the
// `headerPage` fixture and the store URL supplied by the project baseURL.
// Extends BasePage so it inherits navigation, waiting, viewport,
// screenshot and console-error helpers. All CSS selectors live in
// locators/shopify-locators.js — this class only exposes intent:
// "give me the logo", "open search", "open the mobile menu", etc.
// ─────────────────────────────────────────────────────────────

import { BasePage } from './BasePage.js';

export class HeaderPage extends BasePage {

  constructor(page, preset = null) {
    super(page, preset);
    // Short-hand references to the relevant locator groups.
    this.h = this.locators.header;
    this.n = this.locators.nav;
    this.s = this.locators.search;
    this.m = this.locators.mobileNav;
  }

  // ── Element getters (return Playwright Locators) ────────────

  header()          { return this.page.locator(this.h.root).first(); }
  headerWrapper()   { return this.page.locator(this.h.wrapper).first(); }
  logoLink()        { return this.page.locator(this.h.logoLink).first(); }
  logoImage()       { return this.page.locator(this.h.logoImg).first(); }
  searchToggle()    { return this.page.locator(this.h.searchToggle).first(); }
  accountIcon()     { return this.page.locator(this.h.accountIcon).first(); }
  cartLink()        { return this.page.locator(this.h.cartLink).first(); }
  cartCount()       { return this.page.locator(this.h.cartCount).first(); }
  mobileMenuButton(){ return this.page.locator(this.h.menuButton).first(); }

  // ── Navigation getters ──────────────────────────────────────

  desktopNav()      { return this.page.locator(this.n.desktopContainer).first(); }
  desktopMenu()     { return this.page.locator(this.n.desktopMenu).first(); }
  topLevelItems()   { return this.page.locator(this.n.topLevelItems); }
  topLevelLinks()   { return this.page.locator(this.n.topLevelLinks); }
  megaMenuItems()   { return this.page.locator(this.n.megaItem); }
  megaMenuToggle()  { return this.page.locator(this.n.megaToggle).first(); }
  megaMenuContent() { return this.page.locator(this.n.megaContent).first(); }
  level2Links()     { return this.page.locator(this.n.level2Links); }
  level3Links()     { return this.page.locator(this.n.level3Links); }

  // Find a top-level nav entry by its accessible name (role-based, per
  // the project's locator-priority rules).
  //
  // Matching is case-insensitive on purpose: presets style their menu
  // with `text-transform: uppercase`, so the same "Home" entry renders
  // as "HOME" on three of the four stores. The preset config stores the
  // authored label and this matcher tolerates the CSS casing.
  navLinkByName(name) {
    const menu = this.desktopMenu();
    const pattern = new RegExp(`^\\s*${String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
    return menu
      .getByRole('link', { name: pattern })
      .or(menu.getByRole('button', { name: pattern }))
      .first();
  }

  // ── Mobile drawer getters ───────────────────────────────────

  mobileDrawer()    { return this.page.locator(this.m.drawer).first(); }
  mobileMenu()      { return this.page.locator(this.m.menu).first(); }
  mobileLinks()     { return this.page.locator(this.m.links); }
  mobileExpanders() { return this.page.locator(this.m.expanders); }
  mobileSubmenus()  { return this.page.locator(this.m.submenu); }
  mobileDetails()   { return this.page.locator(this.m.details); }

  // ── Search getters ──────────────────────────────────────────

  searchModal()     { return this.page.locator(this.s.modal).first(); }
  searchInput()     { return this.page.locator(this.s.input).first(); }
  searchResults()   { return this.page.locator(this.s.results).first(); }

  // ── Actions ─────────────────────────────────────────────────

  // Open the site header (home page) and wait for it to render.
  //
  // This runs in beforeEach, so a slow response here fails every test in
  // the batch rather than one assertion — and because the failure is in a
  // hook, in-test `test.skip()` guards never get the chance to run. The
  // wait therefore gets an explicit, generous budget instead of inheriting
  // the shorter global actionTimeout meant for clicks and fills.
  async open() {
    await this.gotoHome();
    await this.header().waitFor({ state: 'visible', timeout: 30_000 });
  }

  // Open the search off-canvas panel.
  //
  // Some presets only render the search icon below the `md` breakpoint
  // (Doll hides it on desktop), so drop to a mobile viewport when the
  // toggle is not reachable at the current one. That keeps the search
  // behaviour tests meaningful on every preset.
  async openSearch() {
    if (!(await this.searchToggle().isVisible())) {
      await this.setMobileView();
      await this.searchToggle().waitFor({ state: 'visible' });
    }
    await this.searchToggle().click();
    await this.searchModal().waitFor({ state: 'visible' });
  }

  // Type a query into the search panel (opens it first if needed).
  async searchFor(term) {
    if (!(await this.searchModal().isVisible())) {
      await this.openSearch();
    }
    await this.searchInput().fill(term);
    await this.page.waitForTimeout(600); // predictive-search debounce
  }

  // Submit the current query. The predictive-search panel has no submit
  // button — the form is submitted from the input with Enter.
  async submitSearch() {
    await this.searchInput().press('Enter');
  }

  // Close the search panel with the ESC key.
  async closeSearch() {
    await this.pressKey('Escape');
    await this.searchModal().waitFor({ state: 'hidden' });
  }

  // Open the mobile navigation drawer (forces a mobile viewport so
  // the hamburger toggle is rendered by the theme's CSS breakpoints).
  async openMobileMenu() {
    await this.setMobileView();
    await this.mobileMenuButton().click();
    await this.mobileDrawer().waitFor({ state: 'visible' });
  }

  // Expand the first collapsible submenu inside the mobile drawer.
  // Entries are native <details>/<summary>, so clicking the summary
  // toggles the `open` attribute on its <details>.
  async expandFirstMobileSubmenu() {
    await this.mobileExpanders().first().click();
    await this.mobileSubmenus().first().waitFor({ state: 'visible' });
  }

  // True when at least one drawer <details> is expanded.
  async isMobileSubmenuExpanded() {
    return (await this.page.locator(`${this.m.details}[open]`).count()) > 0;
  }

  // Hover the mega-menu trigger to reveal its panel (desktop only).
  //
  // The theme binds the hover handler to the <li> (data-hover-bound) and
  // that <li> intercepts pointer events over its anchor, so hovering the
  // anchor itself can never land. Hover the item instead.
  async openMegaMenu() {
    await this.megaMenuItems().first().hover();
    await this.megaMenuContent().waitFor({ state: 'visible' });
  }

  // ── Convenience checks ──────────────────────────────────────

  // True when the inline desktop navigation is visible.
  async isDesktopNavVisible() {
    return this.desktopNav().isVisible();
  }

  // True when the mobile hamburger toggle is visible.
  async isMobileMenuButtonVisible() {
    return this.mobileMenuButton().isVisible();
  }

  // Number of top-level navigation items.
  async topLevelItemCount() {
    return this.topLevelItems().count();
  }

  // Cart badge text. The badge carries the `hidden` attribute while the
  // cart is empty, and innerText returns "" for hidden nodes — so read
  // textContent to get the real count either way.
  async cartCountText() {
    return ((await this.cartCount().textContent()) ?? '').trim();
  }

  // True when a top-level entry with this accessible name exists.
  // Lets preset-driven tests skip gracefully when a preset's menu
  // does not carry the expected label, instead of hard-failing.
  async hasNavLink(name) {
    if (!name) return false;
    return (await this.navLinkByName(name).count()) > 0;
  }

  // Accessible names of every top-level navigation entry, in DOM order.
  // Useful for reporting which labels a preset actually exposes.
  async topLevelLabels() {
    const links = this.topLevelLinks();
    const count = await links.count();
    const labels = [];
    for (let i = 0; i < count; i++) {
      labels.push((await links.nth(i).innerText()).trim());
    }
    return labels;
  }

  // File extension of the rendered logo asset (e.g. ".png", ".svg"),
  // ignoring any Shopify CDN query string. Empty when not resolvable.
  async logoFormat() {
    const src = (await this.logoImage().getAttribute('src')) ?? '';
    const match = src.split('?')[0].toLowerCase().match(/\.[a-z0-9]+$/);
    return match ? match[0] : '';
  }
}

export default HeaderPage;
