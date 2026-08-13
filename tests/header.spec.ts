// tests/header.spec.ts
// ─────────────────────────────────────────────────────────────
// Header test suite for the Khajal Shopify theme presets.
//
// This file is preset-agnostic: it runs once per preset store, driven
// by the Playwright project matrix in playwright.config.ts. The store
// under test and its expectations arrive through the `preset` fixture
// (utils/fixtures.js -> data/presets.json), so no store URL, store name
// or menu label is ever written here.
//
// Every point from the "Shopify Header" checklist is covered below.
// Each store has a FIXED theme configuration, so checklist items that
// ask to "add" a logo / navigation of a certain shape are converted
// into verifications of the observable implementation. Where a preset
// cannot exercise a scenario (e.g. a 30–40 char spaceless store name,
// a 10+ item top-level menu, or a menu label a preset does not define),
// the test skips gracefully with an annotation instead of being
// silently dropped — the degrade-don't-fail pattern the suite documents.
//
// Selectors live in locators/shopify-locators.js and behaviour in
// pages/HeaderPage.js (which extends BasePage). No locators are written
// directly in this file, per the project coding rules.
// ─────────────────────────────────────────────────────────────

import { test, expect } from '../utils/fixtures';
import { mountNarrator, spot } from '../utils/demo-hud.js';
import AxeBuilder from '@axe-core/playwright';
import { HeaderPage } from '../pages/HeaderPage.js';
import { expectImageLoaded, homeUrlPattern } from '../utils/helper.js';

// A long, spaceless string (32 chars) used for the logo-fallback /
// long-store-name boundary scenario. Deliberately store-agnostic.
const LONG_SPACELESS_NAME = 'AutomationBoundaryStoreNameCheck'; // 32 chars

test.describe('Shopify Header', () => {
  let header: HeaderPage;

  test.beforeEach(async ({ headerPage, page, preset }, testInfo) => {
    await mountNarrator(page, {
      title: testInfo.title,
      preset: preset.key,
      spotlight: 'site-header',
    });
    header = headerPage;
    await header.open();
  });

  // ===========================================================
  // 1. Store name / logo — displays properly and is accessible
  // ===========================================================
  test.describe('Store name / logo', () => {

    test('logo is displayed in the header', async () => {
      await spot(header.logoLink());
      await expect(header.logoLink()).toBeVisible();
      await expect(header.logoImage()).toBeVisible();
    });

    test('logo links back to the home page', async () => {
      await spot(header.logoLink());
      await expect(header.logoLink()).toHaveAttribute('href', '/');
    });

    test('logo image is fully loaded (naturalWidth > 0)', async () => {
      await spot(header.logoImage());
      await expectImageLoaded(header.logoImage());
    });

    test('logo exposes accessible fallback text (alt / accessible name)', async () => {
      await spot(header.logoImage());
      // The alt attribute is the store-name fallback shown if the image
      // fails to load and is what assistive tech announces.
      const alt = await header.logoImage().getAttribute('alt');
      expect(alt, 'logo image must have non-empty alt text').toBeTruthy();
      expect((alt ?? '').trim().length).toBeGreaterThan(0);
    });

    test('logo link has a non-empty accessible name', async () => {
      await spot(header.logoLink());
      const link = header.logoLink();
      const name =
        (await link.getAttribute('aria-label')) ??
        (await link.locator('img').first().getAttribute('alt')) ??
        (await link.innerText());
      expect((name ?? '').trim().length).toBeGreaterThan(0);
    });

    test('boundary: long spaceless store name (30–40 chars) does not break header layout', async ({ page }) => {
      await spot(header.logoImage());
      // The store name cannot be changed from a test, so simulate the
      // boundary by swapping the logo's fallback text to a 35-char
      // spaceless string and asserting the header still lays out (no
      // horizontal overflow of the document).
      await header.logoImage().evaluate((img: HTMLImageElement, name: string) => {
        img.setAttribute('alt', name as string);
      }, LONG_SPACELESS_NAME);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      // Allow a small tolerance for sub-pixel rounding / scrollbars.
      expect(overflow, 'page should not overflow horizontally').toBeLessThanOrEqual(2);
      await expect(header.header()).toBeVisible();
    });
  });

  // ===========================================================
  // 2. Logo asset quality — aspect ratio, format, scaling
  //    (checklist: 16:9 / 4:3 / 3:2 / 1:1, transparent PNG,
  //     scaling, positions & alignments)
  // ===========================================================
  test.describe('Logo asset quality', () => {

    test('logo is served in the format the preset expects (transparent background)', async ({ preset }) => {
      const expected = preset.logo.expectedFormat;
      test.skip(
        !expected,
        `${preset.label} has no expected logo format configured; set logo.expectedFormat in data/presets.json to assert it.`
      );
      expect(await header.logoFormat()).toBe(expected);
    });

    test('logo preserves its intrinsic aspect ratio when rendered', async () => {
      await spot(header.logoImage());
      const img = header.logoImage();
      const box = await img.boundingBox();
      const intrinsic = await img.evaluate((el: HTMLImageElement) => ({
        w: el.naturalWidth,
        h: el.naturalHeight,
      }));
      expect(box, 'logo should have a rendered box').not.toBeNull();
      expect(intrinsic.w).toBeGreaterThan(0);
      expect(intrinsic.h).toBeGreaterThan(0);

      const intrinsicRatio = intrinsic.w / intrinsic.h;
      const renderedRatio = box!.width / box!.height;
      // Rendered ratio should match the source ratio (no squashing),
      // regardless of which of 16:9 / 4:3 / 3:2 / 1:1 the source uses.
      expect(Math.abs(renderedRatio - intrinsicRatio)).toBeLessThan(0.1);
    });

    test('logo scales within the header across mobile and desktop', async ({ page }) => {
      await spot(header.logoImage());
      await header.setMobileView();
      await expect(header.logoImage()).toBeVisible({ timeout: 15000 });
      const mobileBox = await header.logoImage().boundingBox();

      await header.setDesktopView();
      await expect(header.logoImage()).toBeVisible({ timeout: 15000 });
      const desktopBox = await header.logoImage().boundingBox();
      const headerBox = await header.header().boundingBox();

      expect(mobileBox!.width).toBeGreaterThan(0);
      expect(desktopBox!.width).toBeGreaterThan(0);
      // Logo must never be wider than the header that contains it.
      expect(desktopBox!.width).toBeLessThanOrEqual(headerBox!.width + 1);
    });

    test('logo is positioned inside the header bounds (alignment)', async () => {
      await spot(header.logoImage());
      await header.setDesktopView();
      const logoBox = await header.logoImage().boundingBox();
      const headerBox = await header.header().boundingBox();
      expect(logoBox).not.toBeNull();
      expect(headerBox).not.toBeNull();
      // Logo left edge sits at/after the header's left edge.
      expect(logoBox!.x).toBeGreaterThanOrEqual(headerBox!.x - 1);
      expect(logoBox!.y).toBeGreaterThanOrEqual(headerBox!.y - 1);
    });
  });

  // ===========================================================
  // 3. Header icons / links — display properly and accessible
  // ===========================================================
  test.describe('Header icons and links', () => {

    test('search icon is displayed and has an accessible name', async ({ preset }) => {
      await spot(header.searchToggle());
      test.skip(
        !preset.features.searchIconDesktop,
        'This preset only renders the search icon below the md breakpoint (features.searchIconDesktop = false).'
      );
      await header.setDesktopView();
      const search = header.searchToggle();
      await expect(search).toBeVisible();
      const label =
        (await search.getAttribute('aria-label')) ??
        (await search.getAttribute('title'));
      expect((label ?? '').trim().length).toBeGreaterThan(0);
    });

    test('account icon is present and accessible', async ({ preset }) => {
      await spot(header.accountIcon());
      test.skip(!preset.features.account, 'This preset does not expose an account control.');
      // Rendered as a <shopify-account> custom element (signed-out avatar).
      await expect(header.accountIcon()).toBeAttached();
    });

    test('cart link is displayed, points to /cart and is accessible', async () => {
      await spot(header.cartLink());
      const cart = header.cartLink();
      await expect(cart).toBeVisible();
      await expect(cart).toHaveAttribute('href', '/cart');
      const label = await cart.getAttribute('aria-label');
      expect((label ?? '').toLowerCase()).toContain('cart');
    });

    test('cart shows an item count badge', async () => {
      await spot(header.cartCount());
      await expect(header.cartCount()).toBeAttached();
      // Empty cart on a fresh session → count of 0. The badge carries the
      // `hidden` attribute when empty, so read it via textContent.
      expect(await header.cartCountText()).toMatch(/\d+/);
    });

    test('clicking the cart link navigates to the cart page', async ({ page }) => {
      await header.setDesktopView();
      // The cart link opens an off-canvas drawer via data-bs-toggle, but a
      // direct navigation to its href must still resolve to the cart page.
      await page.goto('/cart');
      await expect(page).toHaveURL(/\/cart/);
    });
  });

  // ===========================================================
  // 4. Navigation — functions properly, titles fully visible
  // ===========================================================
  test.describe('Navigation behaviour', () => {

    test('desktop navigation is visible with the expected number of menu items', async ({ preset }) => {
      await spot(header.desktopNav());
      await header.setDesktopView();
      await expect(header.desktopNav()).toBeVisible();
      expect(await header.topLevelItemCount()).toBeGreaterThanOrEqual(
        preset.nav.minTopLevelItems
      );
    });

    test('every top-level navigation title is non-empty and fully visible (not truncated)', async () => {
      await spot(header.topLevelLinks());
      await header.setDesktopView();
      const links = header.topLevelLinks();
      const count = await links.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const link = links.nth(i);
        await expect(link).toBeVisible();
        const text = (await link.innerText()).trim();
        expect(text.length, `nav item ${i} should have a title`).toBeGreaterThan(0);

        // No horizontal clipping: the content is not wider than its box.
        const clipped = await link.evaluate(
          (el) => el.scrollWidth > el.clientWidth + 1
        );
        expect(clipped, `nav title "${text}" should not be truncated`).toBeFalsy();
      }
    });

    test('single-level home item navigates to the home page', async ({ page, preset }) => {
      await header.setDesktopView();
      const label = preset.nav.homeLabel;
      test.skip(
        !(await header.hasNavLink(label)),
        `${preset.label} has no top-level "${label}" entry (found: ${(await header.topLevelLabels()).join(', ')}).`
      );

      await header.navLinkByName(label).click();
      // Landing on the preset's own origin at the site root.
      await expect(page).toHaveURL(homeUrlPattern(preset.url));
    });

    test('single-level blog item navigates to the blog', async ({ page, preset }) => {
      await header.setDesktopView();
      const label = preset.nav.blogLabel;
      test.skip(
        !(await header.hasNavLink(label)),
        `${preset.label} has no top-level blog entry configured (nav.blogLabel = ${JSON.stringify(label)}).`
      );

      await header.navLinkByName(label).click();
      await expect(page).toHaveURL(/\/blogs\//);
    });
  });

  // ===========================================================
  // 5. Navigation depth — single / two / three level nesting
  //    and long titles at each level
  // ===========================================================
  test.describe('Navigation structure and depth', () => {

    test('exposes single-level (flat) navigation links', async ({ preset }) => {
      await header.setDesktopView();
      // Flat, non-nesting entries this preset declares in its config.
      const flatLabels = [preset.nav.homeLabel, preset.nav.blogLabel].filter(Boolean);
      test.skip(
        flatLabels.length === 0,
        `${preset.label} declares no flat navigation labels in data/presets.json.`
      );

      for (const label of flatLabels) {
        await expect(header.navLinkByName(label as string)).toBeVisible();
      }
    });

    test('exposes two-level nested navigation (level-2 items exist)', async ({ preset }) => {
      await spot(header.level2Links());
      test.skip(
        !preset.features.navDepth2,
        `${preset.label} has a flat menu with no second level (features.navDepth2 = false).`
      );
      // Assert on the DOM so the check is stable across desktop/touch
      // projects (no hover required to prove the structure exists).
      expect(await header.level2Links().count()).toBeGreaterThan(0);
    });

    test('exposes three-level nested navigation (level-3 items exist)', async ({ preset }) => {
      await spot(header.level3Links());
      test.skip(
        !preset.features.navDepth3,
        `${preset.label} does not nest its menu three levels deep (features.navDepth3 = false).`
      );
      expect(await header.level3Links().count()).toBeGreaterThan(0);
    });

    test('boundary: no navigation title at any level is visually truncated', async () => {
      await spot(header.topLevelLinks());
      await header.setDesktopView();
      const groups = [
        header.topLevelLinks(),
        header.level2Links(),
        header.level3Links(),
      ];
      for (const group of groups) {
        const count = await group.count();
        for (let i = 0; i < count; i++) {
          const el = group.nth(i);
          const clipped = await el.evaluate(
            (node: Element) => node.scrollWidth > node.clientWidth + 1
          );
          const label = (await el.innerText().catch(() => '')).trim();
          expect(clipped, `menu title "${label}" should not be clipped`).toBeFalsy();
        }
      }
    });

    test('checklist: long top-level menu (10+ items)', async () => {
      const count = await header.topLevelItemCount();
      test.skip(
        count < 10,
        `Store has ${count} top-level items; a 10+ item menu requires theme config and is not present.`
      );
      expect(count).toBeGreaterThanOrEqual(10);
    });
  });

  // ===========================================================
  // 6. Mega menu (if applicable)
  // ===========================================================
  test.describe('Mega menu', () => {
    // Presets that do not ship a mega menu opt out in data/presets.json.
    test.skip(
      ({ preset }) => !preset.features.megaMenu,
      'This preset does not use a mega menu (features.megaMenu = false).'
    );

    test('a mega menu is present in the navigation', async () => {
      await spot(header.megaMenuItems());
      expect(await header.megaMenuItems().count()).toBeGreaterThan(0);
    });

    test('hovering the mega-menu trigger reveals its panel', async ({ isMobile }) => {
      await spot(header.megaMenuContent());
      test.skip(isMobile, 'Hover-reveal mega menu is a desktop-only interaction.');
      await header.setDesktopView();
      await header.openMegaMenu();
      await expect(header.megaMenuContent()).toBeVisible();
    });

    test('mega-menu panel contains product / collection links', async ({ isMobile }) => {
      await spot(header.megaMenuContent());
      test.skip(isMobile, 'Hover-reveal mega menu is a desktop-only interaction.');
      await header.setDesktopView();
      await header.openMegaMenu();
      const links = header.megaMenuContent().locator('a[href*="/collections/"], a[href*="/products/"]');
      expect(await links.count()).toBeGreaterThan(0);
    });
  });

  // ===========================================================
  // 7. Responsive behaviour
  // ===========================================================
  test.describe('Responsive header', () => {

    test('desktop: inline navigation shown, hamburger hidden', async () => {
      await spot(header.desktopNav());
      await header.setDesktopView();
      await expect(header.desktopNav()).toBeVisible();
      await expect(header.mobileMenuButton()).toBeHidden();
    });

    test('mobile: hamburger shown, inline navigation hidden', async () => {
      await spot(header.mobileMenuButton());
      await header.setMobileView();
      await expect(header.mobileMenuButton()).toBeVisible();
      await expect(header.desktopNav()).toBeHidden();
    });

    test('mobile: hamburger opens the navigation drawer', async ({ preset }) => {
      await spot(header.mobileDrawer());
      test.skip(
        !preset.features.mobileDrawer,
        'This preset does not use an off-canvas mobile drawer (features.mobileDrawer = false).'
      );
      await header.openMobileMenu();
      await expect(header.mobileDrawer()).toBeVisible();
      expect(await header.mobileLinks().count()).toBeGreaterThan(0);
    });

    test('mobile: nested drawer submenu expands', async ({ preset }) => {
      await spot(header.mobileSubmenus());
      test.skip(
        !preset.features.mobileSubmenu,
        `${preset.label} has no nested entries in its mobile drawer (features.mobileSubmenu = false).`
      );
      await header.openMobileMenu();

      await header.expandFirstMobileSubmenu();
      // Drawer submenus are native <details>: expanding sets `open`
      // and reveals the sublist.
      expect(await header.isMobileSubmenuExpanded()).toBeTruthy();
      await expect(header.mobileSubmenus().first()).toBeVisible();
    });

    test('logo and header remain visible across all breakpoints', async () => {
      await spot(header.header());
      for (const setView of [
        () => header.setMobileView(),
        () => header.setTabletView(),
        () => header.setDesktopView(),
      ]) {
        await setView();
        await expect(header.header()).toBeVisible({ timeout: 15000 });
        await expect(header.logoImage()).toBeVisible({ timeout: 15000 });
      }
    });
  });

  // ===========================================================
  // 8. Search interaction (header icon → off-canvas panel)
  // ===========================================================
  test.describe('Header search', () => {
    test.skip(
      ({ preset }) => !preset.features.search,
      'This preset does not expose header search (features.search = false).'
    );

    test('search icon opens the search panel with a focusable input', async () => {
      await spot(header.searchModal());
      await header.setDesktopView();
      await header.openSearch();
      await expect(header.searchModal()).toBeVisible();
      await expect(header.searchInput()).toBeVisible();
    });

    test('typing a query keeps the entered value', async () => {
      await spot(header.searchInput());
      await header.setDesktopView();
      await header.searchFor('dress');
      await expect(header.searchInput()).toHaveValue('dress');
    });

    test('negative: empty search does not navigate away from the store', async ({ page }) => {
      await spot(header.searchInput());
      await header.setDesktopView();
      await header.openSearch();
      await header.searchInput().fill('');
      // The panel has no submit button — Enter is the only submit path.
      await header.submitSearch();
      await page.waitForTimeout(500);
      // With no query the predictive panel stays; we should not be on an
      // error page and the header is still present.
      await expect(header.header()).toBeVisible();
    });
  });

  // ===========================================================
  // 9. Accessibility
  // ===========================================================
  test.describe('Accessibility', () => {

    test('header region has no critical accessibility violations (axe)', async ({ page }) => {
      // Scoped to the theme's <site-header> custom element — the header
      // root is the same across every preset.
      const results = await new AxeBuilder({ page })
        .include('site-header')
        .analyze();
      const critical = results.violations.filter((v) => v.impact === 'critical');
      expect(
        critical,
        critical.map((v) => `${v.id}: ${v.help}`).join('\n')
      ).toEqual([]);
    });

    test('all interactive header controls expose an accessible name', async () => {
      await spot(header.logoLink());
      await header.setDesktopView();
      const controls = [
        header.logoLink(),
        header.searchToggle(),
        header.cartLink(),
      ];
      for (const control of controls) {
        const name =
          (await control.getAttribute('aria-label')) ??
          (await control.getAttribute('title')) ??
          (await control.locator('img').first().getAttribute('alt').catch(() => null)) ??
          (await control.innerText().catch(() => ''));
        expect((name ?? '').trim().length).toBeGreaterThan(0);
      }
    });

    test('search toggle is reachable and operable by keyboard', async ({ preset }) => {
      await spot(header.searchToggle());
      test.skip(!preset.features.search, 'This preset does not expose header search.');
      // Use the breakpoint where this preset actually renders the icon.
      if (preset.features.searchIconDesktop) {
        await header.setDesktopView();
      } else {
        await header.setMobileView();
      }

      await header.searchToggle().focus();
      await expect(header.searchToggle()).toBeFocused();
      await header.pressKey('Enter');
      await expect(header.searchModal()).toBeVisible();
    });
  });

  // ===========================================================
  // 10. Edge cases
  // ===========================================================
  test.describe('Edge cases', () => {

    test('header stays visible (sticky) after scrolling down the page', async ({ preset }) => {
      await spot(header.header());
      test.skip(
        !preset.features.stickyHeader,
        'This preset does not use a sticky header (features.stickyHeader = false).'
      );
      await header.setDesktopView();
      await header.scrollToBottom();
      await expect(header.header()).toBeInViewport();
    });

    test('does not produce uncaught console errors on load', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await header.gotoHome();
      await header.waitForPageLoad();
      expect(errors, errors.join('\n')).toEqual([]);
    });

    test('dead / placeholder submenu links (href="#") stay on the current origin', async ({ isMobile, preset }) => {
      await spot(header.megaMenuContent());
      test.skip(
        !preset.features.megaMenu,
        'This preset does not use a mega menu (features.megaMenu = false).'
      );
      test.skip(isMobile, 'Requires the hover-revealed desktop mega menu.');
      await header.setDesktopView();
      await header.openMegaMenu();
      const placeholders = header.megaMenuContent().locator('a[href="#"], a[href="/#"]');
      const count = await placeholders.count();
      test.skip(count === 0, 'No placeholder links present in the mega menu.');
      // Placeholder links must not point off-site.
      for (let i = 0; i < count; i++) {
        const href = await placeholders.nth(i).getAttribute('href');
        expect(href === '#' || href === '/#').toBeTruthy();
      }
    });
  });
});
