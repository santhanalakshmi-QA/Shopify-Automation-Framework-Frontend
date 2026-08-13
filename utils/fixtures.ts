// utils/fixtures.ts
// ─────────────────────────────────────────────────────────────
// Preset-aware test fixtures. Spec files import { test, expect }
// from here instead of '@playwright/test' and receive:
//
//   preset      the resolved preset for the running project
//               (url, label, nav/logo expectations, feature flags)
//   headerPage  a HeaderPage already bound to that preset
//
// Because the preset arrives through the project metadata, the same
// spec runs unchanged against all four stores — no store name, URL
// or theme-specific expectation is ever written in a test file.
//
// TypeScript here (rather than JavaScript like the page objects) so
// the fixture names and the preset shape are typed inside the specs.
// ─────────────────────────────────────────────────────────────

import { test as base, expect } from '@playwright/test';
import { getPreset } from './presets.js';
import { HeaderPage } from '../pages/HeaderPage.js';
import { SlideshowPage } from '../pages/SlideshowPage.js';
import { flashVerdict } from './demo-hud.js';

/** Shape of one entry in data/presets.json, after env resolution. */
export interface Preset {
  key: string;
  label: string;
  url: string;
  password: string | null;
  nav: {
    homeLabel: string | null;
    blogLabel: string | null;
    minTopLevelItems: number;
  };
  logo: {
    /** Expected asset extension, e.g. ".png". null = not asserted. */
    expectedFormat: string | null;
  };
  /** Per-section capability blocks, added as each section is built. */
  collectionList?: {
    cards: number;
    heading: boolean;
    itemCounts: boolean;
    arrows: boolean;
    loop: boolean;
    autoplay: boolean;
  };
  testimonial?: {
    /** One entry per section — dense ships two that differ. */
    sections: Array<{
      cards: number;
      rating: boolean;
      image: boolean;
      secondaryText: boolean;
    }>;
    heading: boolean;
    arrows: boolean;
    loop: boolean;
    autoplay: boolean;
  };
  richText?: {
    copyCode: boolean;
    heading: boolean;
    links: boolean;
  };
  features: {
    megaMenu: boolean;
    navDepth2: boolean;
    navDepth3: boolean;
    mobileDrawer: boolean;
    mobileSubmenu: boolean;
    search: boolean;
    /** Some presets only render the search icon below the md breakpoint. */
    searchIconDesktop: boolean;
    account: boolean;
    stickyHeader: boolean;
  };
  /**
   * Home-page section inventory: section type -> how many the store
   * renders. Generated from the live storefronts by
   * `npm run sync:sections`; never hand-edited.
   */
  sections: Record<string, number>;
}

interface PresetFixtures {
  preset: Preset;
  /** Auto fixture: paints the pass/fail verdict on screen in demo mode. */
  verdict: void;
  headerPage: HeaderPage;
  slideshowPage: SlideshowPage;
}

export const test = base.extend<PresetFixtures>({
  // Resolved preset config for the current Playwright project.
  preset: async ({}, use, testInfo) => {
    const preset = getPreset(testInfo.project.metadata.presetKey) as Preset;
    // Surfaces the store under test on the Allure / HTML report.
    testInfo.annotations.push({
      type: 'preset',
      description: `${preset.label} — ${preset.url}`,
    });
    await use(preset);
  },

  // Header page object, preset-aware.
  headerPage: async ({ page, preset }, use) => {
    await use(new HeaderPage(page, preset));
  },

  // Slideshow section page object, preset-aware.
  slideshowPage: async ({ page, preset }, use) => {
    await use(new SlideshowPage(page, preset));
  },

  /**
   * Automatic, demo-only: once the test result is known, re-highlight
   * whatever the check last inspected — GREEN if it passed, RED if it
   * did not — and save a proof screenshot.
   *
   * Runs for every test without the spec asking for it, so any check
   * that highlights anything ends with a visible verdict rather than
   * only a tick in the terminal. No-op outside demo mode.
   */
  verdict: [
    // Depends on `page` deliberately: Playwright tears fixtures down in
    // reverse order, so without this dependency the page is already
    // closed by the time the verdict runs and nothing is painted.
    async ({ page }, use, testInfo) => {
      await use(undefined);
      if (!page.isClosed()) await flashVerdict(testInfo.status === 'passed');
    },
    { auto: true },
  ],
});

/**
 * How many sections of `type` the preset declares. 0 when absent.
 * Section specs use this to skip on presets that do not ship the
 * section, the same way feature flags gate the header specs.
 */
export function sectionCount(preset: Preset, type: string): number {
  return preset.sections?.[type] ?? 0;
}

export { expect };
