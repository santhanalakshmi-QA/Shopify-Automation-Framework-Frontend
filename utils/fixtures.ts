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
