import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';
import os from 'node:os';
import { activePresets, authFile } from './utils/presets.js';

// Playwright transpiles this config to CommonJS, so `require` is available
// at runtime. Read the installed Playwright version for the Allure
// "Environment" widget without hard-coding it.
let pwVersion = 'unknown';
try {
  pwVersion = require('@playwright/test/package.json').version;
} catch {
  /* version is best-effort only */
}

// The preset stores under test. Defined in data/presets.json and
// narrowable for a single run with PRESETS=doll,dense.
const PRESETS = activePresets();

// Responsive breakpoints every preset is exercised at. Each entry is
// crossed with each preset to build the project matrix below.
// Maximize the browser window for runs you actually watch. Automatic
// for headed / --debug runs; force it with PW_MAXIMIZE=1, disable with
// PW_MAXIMIZE=0.
//
// Maximizing requires `viewport: null` so the page fills the window
// rather than being letterboxed inside a fixed viewport. Tests that
// call setViewportSize() still work, so the responsive checks are
// unaffected — but the desktop project loses its deterministic
// 1440x900, which means VISUAL BASELINES (SS-UI-01) will not match in
// this mode. Run visual checks headless.
//
// Only the desktop and webkit projects maximize: tablet and mobile
// emulate real device dimensions, which is the whole point of them.
const MAXIMIZE =
  process.env.PW_MAXIMIZE === '1' ||
  (process.env.PW_MAXIMIZE !== '0' &&
    (process.argv.includes('--headed') || process.env.PWDEBUG === '1'));

// Playwright rejects `deviceScaleFactor` alongside `viewport: null`,
// and the desktop device descriptors ship one — so drop it when the
// window is being maximized.
function desktopUse(device: (typeof devices)[string]) {
  if (!MAXIMIZE) return { ...device, viewport: { width: 1440, height: 900 } };
  const { deviceScaleFactor: _drop, ...rest } = device;
  return { ...rest, viewport: null };
}

const VIEWPORTS = [
  { suffix: 'desktop', use: desktopUse(devices['Desktop Chrome']) },
  { suffix: 'tablet',  use: { ...devices['iPad (gen 7)'] } },
  { suffix: 'mobile',  use: { ...devices['iPhone 13'] } },
  // Cross-engine coverage. WebKit catches CSS/JS the Chromium projects
  // never will (:has(), scroll-timeline, newer Intl APIs). Desktop only
  // — running every breakpoint on two engines doubles the matrix for
  // little extra signal.
  { suffix: 'webkit', use: desktopUse(devices['Desktop Safari']) },
];

// Setup specs live in tests/setup and must only run in the setup projects.
const SETUP_SPECS = /[\\/]setup[\\/].*\.setup\.(js|ts)$/;

/**
 * Checks that do not apply to a given preset x viewport, excluded via
 * `grepInvert` so Playwright never collects them.
 *
 * This is deliberately different from `test.skip()`. A skip still shows
 * in the report as a skipped test; these are simply not part of the run,
 * because the store has no such control to test. Capabilities come from
 * `slideshow` in data/presets.json — verified against the live stores.
 *
 * Runtime guards are kept inside the specs as a safety net: if a preset
 * gains a control and the manifest is not updated, the test degrades to
 * a skip with a reason rather than failing.
 */
function inapplicableChecks(preset: any, viewportSuffix: string): RegExp[] {
  const caps = preset.slideshow ?? {};
  const isTouch = viewportSuffix === 'mobile' || viewportSuffix === 'tablet';
  const excluded: RegExp[] = [];

  // ── Rich text ──────────────────────────────────────────────
  // A preset with no rich_text section skips the whole suite rather
  // than collecting it and reporting a wall of skips. The spec keeps
  // its own manifest guard as a safety net.
  if (!(preset.sections?.rich_text > 0)) excluded.push(/^RT-/, /RT-[A-Z]/);

  // Copy-to-clipboard only exists on the variant that carries a code.
  if (!preset.richText?.copyCode) excluded.push(/RT-COPY-/);

  // ── Slideshow ──────────────────────────────────────────────
  // Autoplay behaviour. SS-AUTO-03 is the inverse — it asserts that a
  // disabled autoplay really does stay still — so it runs either way.
  if (!caps.autoplay) excluded.push(/SS-AUTO-0[12]/, /SS-AUTO-0[456789]/);
  if (caps.autoplay) excluded.push(/SS-AUTO-03/);

  // Loop wrapping vs clamping are mutually exclusive: a store either
  // loops or it stops at the ends, never both.
  if (caps.loop) excluded.push(/SS-LOOP-0[345]/);
  if (!caps.loop) excluded.push(/SS-LOOP-0[12]/);

  // Arrow-driven navigation and loop walking need next/prev controls.
  // SS-A11Y-02 names those arrows; SS-A11Y-09 needs one to trigger a
  // transition and measure it under prefers-reduced-motion.
  if (!caps.arrows) excluded.push(/SS-NAV-/, /SS-LOOP-/, /SS-A11Y-02/, /SS-A11Y-09/);

  // Pagination checks need dots, as does keyboard operation of them.
  if (!caps.dots) excluded.push(/SS-DOT-/, /SS-A11Y-14/);

  // Tap-target size is a touch concern, and needs a control to measure.
  if (!isTouch || (!caps.arrows && !caps.dots)) excluded.push(/SS-A11Y-13/);

  // Focus-indicator check needs at least one focusable carousel control.
  if (!caps.arrows && !caps.dots) excluded.push(/SS-A11Y-06/);

  // These need anchors inside the slides — even placeholder ones:
  //   SS-A11Y-05  tabs out of the section, so needs somewhere to start
  //   SS-A11Y-07  looks for focusables inside off-screen slides
  //   SS-LAYOUT-03 compares element pairs; copy alone gives only one box
  if (!caps.slideLinks) excluded.push(/SS-A11Y-05/, /SS-A11Y-07/, /SS-LAYOUT-03/, /SS-LAYOUT-10/);

  // Video slide behaviour.
  if (!caps.videoSlide) excluded.push(/SS-MEDIA-06/);

  // Link resolution needs at least one real (non-placeholder) CTA.
  if (!caps.ctaLinks) excluded.push(/SS-LINK-02/);

  // Swipe gestures belong to the touch projects only.
  if (!isTouch) excluded.push(/SS-TOUCH-/);

  // Hover is the inverse: a pointer-only state, meaningless on a touch
  // device where no user can reach it.
  if (isTouch) excluded.push(/SS-HOVER-/);
  if (!caps.arrows) excluded.push(/SS-HOVER-02/);
  if (!caps.dots) excluded.push(/SS-HOVER-03/);
  if (!caps.slideLinks) excluded.push(/SS-HOVER-01/, /SS-HOVER-04/);

  // The mobile-image swap runs on touch projects, and only where the
  // preset actually ships a separate mobile asset.
  if (!isTouch || !caps.mobileImage) excluded.push(/SS-LAYOUT-07/);

  return excluded;
}

/**
 * Playwright configuration for the multi-preset Shopify theme suite.
 *
 * Projects are a preset x viewport matrix. Each preset contributes:
 *   <preset>-setup    clears the storefront password gate, caches the
 *                     session to .auth/<preset>.json
 *   <preset>-desktop  \
 *   <preset>-tablet    > run the specs against that store, reusing the
 *   <preset>-mobile   /  cached session
 *
 * The preset is passed to the tests through project metadata, so specs
 * and page objects never hard-code a store URL.
 */
export default defineConfig({
  testDir: './tests',
  // Wipes allure-results before each run so a generated report reflects
  // only that run. Set ALLURE_KEEP=1 to merge runs deliberately.
  globalSetup: './utils/global-setup.js',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // The apps under test are live, externally-hosted Shopify preview
  // stores, so allow a realistic per-test budget and one local retry to
  // absorb transient network slowness / rate-limiting. The budget also
  // covers context teardown (video + trace flush), which is why it is
  // generous: the media-heavy presets occasionally exceeded 60s there.
  timeout: 90_000,
  retries: process.env.CI ? 2 : 1,
  // Was 1 on CI, which made the full matrix unrunnable. 4 is a deliberate
  // ceiling rather than "as many as the box has": every worker hammers
  // the same four live Shopify stores, and too many risks rate limiting.
  // Raise it only alongside sharding by preset.
  workers: process.env.CI ? Number(process.env.PW_WORKERS ?? 4) : undefined,
  reporter: [
    // Keep Playwright's own HTML report and the console list output…
    ['html', { open: 'never' }],
    ['list'],
    // …and add Allure. The reporter writes raw results to ./allure-results
    // during the run (even when tests fail), which `npm run allure:generate`
    // turns into the browsable Allure report.
    [
      'allure-playwright',
      {
        resultsDir: 'allure-results',
        // Emit Playwright test.step() calls and command/attachment detail so
        // each Allure test case shows its full step tree.
        detail: true,
        // Use the describe() nesting as the Allure suite hierarchy.
        suiteTitle: true,
        // Shown on the report's "Environment" widget.
        environmentInfo: {
          Project: 'Khajal Shopify Preset Suite',
          Presets: PRESETS.map((p) => `${p.key} (${p.url})`).join(', '),
          Preset_Count: String(PRESETS.length),
          Playwright: pwVersion,
          Node: process.version,
          OS: `${os.type()} ${os.release()}`,
          Arch: os.arch(),
          CI: process.env.CI ? 'true' : 'false',
        },
        // Classifies results on the report's "Categories" widget. Allure
        // already splits assertion failures (Failed) from other errors
        // (Broken); these rules give friendlier, grouped buckets.
        // Failure classification. Allure applies the FIRST matching rule,
        // so the specific ones come before the catch-alls.
        //
        // The question a QA team actually needs answered is "is this the
        // theme's fault or the suite's?" — these buckets answer it on the
        // report's Categories tab without anyone reading a stack trace.
        //
        // Caveat worth knowing: a locator timeout can ALSO be a theme
        // defect (the element was genuinely removed). Treat this as a
        // first-pass sort to triage from, not a verdict.
        categories: [
          {
            // Suite's fault: selectors, waits, races.
            name: 'FAIL - Automation defect (locator / timing)',
            matchedStatuses: ['failed', 'broken'],
            messageRegex:
              '(?s).*(Timeout .* exceeded|waiting for locator|strict mode violation|' +
              'locator\\.\\w+: Timeout|Target (page|closed)|Execution context was destroyed).*',
          },
          {
            // Not the theme, not the suite: the run could not proceed.
            name: 'BLOCKED - Environment / setup',
            matchedStatuses: ['broken', 'failed'],
            messageRegex:
              '(?s).*(password protected but no password|Storefront password rejected|' +
              'net::ERR|ECONNREFUSED|ENOTFOUND|browser has been closed).*',
          },
          {
            // The store really is wrong: an assertion compared real values.
            name: 'FAIL - Theme defect',
            matchedStatuses: ['failed'],
          },
          {
            // Threw rather than asserted, and did not match above.
            name: 'FAIL - Needs triage (unclassified error)',
            matchedStatuses: ['broken'],
          },
          {
            name: 'SKIP - Not applicable to this preset',
            matchedStatuses: ['skipped'],
          },
        ],
      },
    ],
  ],

  use: {
    // Artifact capture is env-overridable so a fast local loop can turn
    // it off without editing the config:
    //   PW_VIDEO=off PW_TRACE=off npm run test:doll
    // Note `retain-on-failure` still RECORDS every test and deletes the
    // video when it passes — the cost is paid on passing tests too.
    trace: (process.env.PW_TRACE as any) ?? 'on-first-retry',
    screenshot: (process.env.PW_SCREENSHOT as any) ?? 'only-on-failure',
    video: (process.env.PW_VIDEO as any) ?? 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,

    // Slow-motion for watching a headed run. No effect when unset.
    //   PW_SLOWMO=500 npm run demo:slideshow
    launchOptions: {
      slowMo: Number(process.env.PW_SLOWMO ?? 0),
      // Chromium honours --start-maximized in headed mode; WebKit
      // ignores it and simply opens at its default window size.
      args: MAXIMIZE ? ['--start-maximized'] : [],
    },
  },

  // preset x viewport matrix, built from data/presets.json.
  projects: PRESETS.flatMap((preset) => [
    {
      name: `${preset.key}-setup`,
      testMatch: SETUP_SPECS,
      metadata: { presetKey: preset.key },
      use: { ...devices['Desktop Chrome'], baseURL: preset.url },
    },
    ...VIEWPORTS.map((viewport) => ({
      name: `${preset.key}-${viewport.suffix}`,
      testIgnore: SETUP_SPECS,
      // Checks this preset/viewport has no control for are not collected
      // at all, so the report shows only what was genuinely applicable.
      grepInvert: inapplicableChecks(preset, viewport.suffix),
      dependencies: [`${preset.key}-setup`],
      metadata: { presetKey: preset.key, breakpoint: viewport.suffix },
      use: {
        ...viewport.use,
        baseURL: preset.url,
        // Session cached by the matching setup project — clears the
        // storefront password gate for every test in this project.
        storageState: authFile(preset.key),
      },
    })),
  ]),
});
