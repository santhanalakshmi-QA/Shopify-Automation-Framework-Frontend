# Selena Theme — Playwright Test Suite

One shared spec set, run against **four preset stores** of the **Selena** theme.

Khajal, Doll, Dense and Moonlight are *presets* of one theme — same code, four
style configurations. Verified from the live storefronts:

| | |
|---|---|
| Theme | Selena (`schema_name`) |
| Version | 1.0.0 (`schema_version`) |
| Architecture | Online Store 2.0 |
| Theme Store | Not published (`theme_store_id: null`) — custom theme |

Not Dawn-derived: none of Dawn's asset files are present, and the theme uses
Swiper for carousels rather than Dawn's `slider-component`. Dawn conventions do
not apply here — every locator was written against the live DOM.

| Preset key | Store |
|---|---|
| `khajal` | https://khajal-theme.myshopify.com |
| `doll` | https://khajal-doll.myshopify.com |
| `dense` | https://khajal-dense.myshopify.com |
| `moonlight` | https://khajal-moonlight.myshopify.com |

Specs never reference a store URL or store name. The preset is a **Playwright
project dimension**: `playwright.config.ts` builds a `preset × viewport` matrix
from [data/presets.json](data/presets.json), and each test receives its store's
config through the `preset` fixture.

## How the matrix works

Each preset contributes four projects:

```
<preset>-setup     clears the storefront password gate once,
                   caches the session to .auth/<preset>.json
<preset>-desktop   1440×900   ─┐
<preset>-tablet    iPad gen 7  ├─ depend on <preset>-setup and reuse its session
<preset>-mobile    iPhone 13  ─┘
```

Adding a fifth store means adding one entry to `data/presets.json` — no config,
page-object or spec change.

## Setup

```bash
npm install
npx playwright install
```

All four stores are unpublished ("Opening soon"), so a **storefront password** is
required. Get it from Shopify admin → *Online Store → Preferences → Restrict
access*, then put it in `.env`:

```ini
# one shared password for all presets
STOREFRONT_PASSWORD=your-password

# …or one per preset (these take precedence)
PRESET_KHAJAL_PASSWORD=...
PRESET_DOLL_PASSWORD=...
PRESET_DENSE_PASSWORD=...
PRESET_MOONLIGHT_PASSWORD=...
```

Without it, the setup project fails fast with an explicit message rather than
letting every test drown on the password page.

## Run

```bash
npm test                  # all 4 presets × 3 viewports
npm run test:doll         # one preset, all viewports
npm run test:desktop      # all presets, desktop only
npm run test:noretry      # whole matrix, no retries
npm run unlock            # just clear the password gates (refresh .auth/*)
npm run sync:sections     # regenerate the section manifest from the live stores
npm run report            # open the last HTML report
npm run allure            # generate + open the Allure report
npm run typecheck         # tsc --noEmit

PRESETS=doll,dense npm test    # narrow the matrix for one run
```

Every result is tagged with a `preset` annotation, so the HTML and Allure
reports show which store a failure came from.

### Watch mode

Playwright has no `--watch` flag — watching lives in **UI mode**. Open it, then
click the **eye icon** next to a test to re-run it on every file save.

```bash
npm run watch             # khajal-desktop only — fastest feedback
npm run watch:doll        # doll-desktop
npm run watch:dense
npm run watch:moonlight
npm run watch:slideshow   # slideshow spec across all 4 presets (desktop)
npm run watch:all         # all 16 projects, filter inside the UI
```

All watch scripts pass `--retries=0` already. Watching all four presets at once
is slow against live stores — stay on one preset while iterating.

Any spec across all four presets follows the `watch:slideshow` shape:

```bash
npx playwright test --ui --retries=0 <file>.spec.ts \
  --project=khajal-desktop --project=doll-desktop \
  --project=dense-desktop --project=moonlight-desktop
```

Drop the `--project` flags to include all 3 viewports.

### Watching a live run (headed)

UI mode replays a recording. To watch the browser actually drive the site:

```bash
npm run demo:slideshow                    # headed, maximized, all 4 presets
npm run demo:header                       # headed, khajal only
npm run demo:slideshow -- --slowmo 800    # 800ms pause before every action
npm run demo -- slideshow --project doll-desktop --slowmo 500
```

These work in **PowerShell, cmd and bash alike** — the flags are parsed by
`scripts/demo.mjs`, which sets the environment in Node rather than relying on
shell syntax.

> **Shell note:** `PW_SLOWMO=500 npm run ...` is **bash-only**. In PowerShell it
> is silently ignored and the run starts with no slow-motion. Use the `--slowmo`
> flag above, or set the variable the PowerShell way:
> `$env:PW_SLOWMO=500; npm run demo:slideshow`

**The window is maximized automatically** for any headed or `--debug` run.
Override with `PW_MAXIMIZE=1` (force on) or `PW_MAXIMIZE=0` (force off).

Two things to know about maximizing:

- It needs `viewport: null`, so the desktop project loses its fixed 1440x900.
  `setViewportSize()` still works, so the responsive checks are unaffected —
  but **visual baselines (`SS-UI-01`) will not match**. Run those headless.
- Only the **desktop** and **webkit** projects maximize. Tablet and mobile keep
  their emulated device dimensions, which is the point of those projects.

### Fast local loop

Artifact capture is the dominant cost (see [Performance](#performance)), and is
env-overridable without editing the config:

PowerShell (this project's default shell):

```powershell
$env:PW_VIDEO="off"; $env:PW_TRACE="off"
npx playwright test --retries=0 slideshow.spec.ts --project=doll-desktop
```

bash / Git Bash:

```bash
PW_VIDEO=off PW_TRACE=off npx playwright test --retries=0 slideshow.spec.ts \
  --project=doll-desktop
```

That is the ~37s version of a run that otherwise takes ~145s. UI mode does not
record video, so the watch scripts are already fast — these vars only affect
terminal runs.

> Every `VAR=value command` example in this README is bash syntax. In PowerShell
> use `$env:VAR="value"` on its own line first. This applies to `PRESETS`,
> `ALLURE_KEEP`, `PW_VIDEO`, `PW_TRACE`, `PW_SLOWMO` and `PW_MAXIMIZE`.

## Per-preset expectations

Presets share markup but differ in content. Anything that varies lives in
`data/presets.json` rather than in a spec:

```json
{
  "key": "doll",
  "nav": { "homeLabel": "Home", "blogLabel": null, "minTopLevelItems": 3 },
  "logo": { "expectedFormat": ".png" },
  "features": {
    "megaMenu": false, "navDepth2": false, "navDepth3": false,
    "mobileDrawer": true, "mobileSubmenu": false,
    "search": true, "searchIconDesktop": false,
    "account": true, "stickyHeader": false
  }
}
```

- `null` means *not applicable to this preset* — the matching test **skips with
  an annotation** instead of failing.
- A `false` feature flag skips that whole capability's describe block.

This is the degrade-don't-fail pattern: a preset that legitimately lacks a mega
menu reports "skipped, no mega menu", not a red failure.

### What actually differs between the presets

Verified against the live storefronts:

| | khajal | doll | dense | moonlight |
|---|---|---|---|---|
| Top-level menu items | 5 | 3 | 3 | 3 |
| Blog entry | Journal | — | — | — |
| Mega menu | yes | no | no | no |
| Menu depth | 2 levels | flat | flat | flat |
| Sticky header | no | no | yes | yes |
| Search icon on desktop | yes | mobile only | yes | yes |

## Reports

### Each report covers one run

`allure-results` is wiped at the start of every `playwright test` call (by
`utils/global-setup.js`), so a generated report reflects **only** that run. Left
unchecked the reporter appends, and `allure generate` merges every run you have
ever done into one report — old failures beside new passes, with totals matching
no single run.

To merge runs on purpose — sharding, or running presets separately and reporting
them together:

```bash
ALLURE_KEEP=1 npm run test:doll
ALLURE_KEEP=1 npm run test:dense
npm run allure                    # one report covering both
```

> Careful with `--reporter=`: passing it on the CLI **replaces** the configured
> reporters, so `npx playwright test --reporter=list` produces no Allure results
> at all. Omit it when you intend to build a report.

### Archiving, comparing, sharing

```bash
npm test                  # run the suite
npm run allure:archive    # generate + archive the report
npm run allure:list       # list every archived report, newest first
```

For a run stamped `2026-08-10_13-06-21`, `allure:archive` produces:

| Path | Use |
|---|---|
| `allure-report/` | the live report — `npm run allure:open` |
| `reports/allure/2026-08-10_13-06-21/` | full archived copy, browsable |
| `reports/allure/2026-08-10_13-06-21.html` | **one self-contained file — send this** |
| `reports/allure/_history/` | trend data, carried run to run |

**Send the `.html` file to your team.** It is a single file needing no web
server, unlike the normal Allure report, which breaks when opened over
`file://` — that is why emailing the folder never works.

**Comparing old and new:** every archived report keeps its own snapshot, so open
any two side by side. The report's **Overview → Trend** chart also plots this run
against all previous archives automatically, because history is restored before
each generate. Archives are never overwritten — each run gets its own timestamp.

## Running in CI

`.github/workflows/tests.yml` runs the suite on GitHub Actions. It needs **one
secret** — without it every store returns the "Opening soon" password page and
the whole run fails at setup.

**Add it once:**

> Repository → **Settings** → **Secrets and variables** → **Actions** →
> **New repository secret**
>
> | Name | Value |
> |---|---|
> | `STOREFRONT_PASSWORD` | the storefront password from Shopify admin |

Find the value in Shopify admin under **Online Store → Preferences → Restrict
access**. If the presets ever use different passwords, add
`PRESET_<KEY>_PASSWORD` secrets (e.g. `PRESET_DOLL_PASSWORD`) and wire them into
the workflow `env:` block — per-preset values win over the shared one.

The workflow checks the secret before running anything and stops with a clear
error rather than producing 400 confusing failures:

```
::error::STOREFRONT_PASSWORD secret is not set.
```

**Rotating the password** costs nothing here: change it in Shopify admin, update
the one secret, and delete `.auth/` locally so sessions are re-created. Nothing
else references it — store URLs live in `data/presets.json`, not in CI config.

## Testing home-page sections

The header is shared markup, so one spec covers it. Home-page **sections are
not** — the four stores use 25 different section types with little overlap.

**The rule: one spec per section TYPE, not per preset store.** A slideshow
behaves the same wherever it appears because it is the same theme code. What
varies per preset is whether the section exists, how many there are, and which
controls are switched on.

That variation lives in a generated manifest in `data/presets.json`:

```json
"sections": { "slideshow": 1, "featured_collection": 2, "testimonial": 1 }
```

Never hand-edit it — regenerate from the live stores:

```bash
npm run sync:sections
```

A section spec then gates itself on the manifest, exactly as header specs gate
on feature flags:

```js
test.skip(({ preset }) => sectionCount(preset, 'slideshow') === 0,
          'This preset does not ship a slideshow section.');

// count assertion is per-store automatically, with no branching
expect(await slideshow.sectionCount()).toBe(sectionCount(preset, 'slideshow'));
```

Where a control's presence varies, ask the DOM rather than encoding it per
store — see the bullets / next-arrow tests in
[tests/slideshow.spec.ts](tests/slideshow.spec.ts), the worked example.

`tests/home-sections.spec.ts` guards the manifest itself: it compares the live
page against `data/presets.json` and fails with the exact diff when a section is
added or removed, so new sections cannot silently go untested.

### Section coverage

25 distinct section types, 52 instances across the four stores. Sorted by reach
— a spec for a 4-store section buys four times the coverage of a 1-store one:

| Stores | Section types | Status |
|---|---|---|
| 4 | `slideshow` | **done** |
| 4 | `icon_with_text`, `image_gallery`, `testimonial` | to do |
| 3 | `faq`, `featured_collection`, `image_banner`, `shoppable_video` | to do |
| 2 | `collection_list`, `grid_banner`, `video_banner` | to do |
| 1 | `before_after`, `brand_logo`, `faq_with_tabs`, `featured_product`, `grid_showcase`, `hotspot`, `image_comparison`, `marquee`, `newsletter`, `number_counter`, `quiz`, `rich_text`, `specification_section`, `spotlight_gallery` | to do |

The first 7 specs cover 30 of the 52 instances. The last 14 cover 14 between
them.

Counts differ per store and are asserted from the manifest: `testimonial` is 2
on dense, `featured_collection` is 2 on khajal and moonlight, `icon_with_text`
is 2 on doll.

## Performance

Measured on this repo, 12 cores / 6 workers. **Test count is not the
bottleneck — video recording is.**

| Run | video on (default) | video off | speedup |
|---|---|---|---|
| header, 1 preset | 129s | 27s | 4.8× |
| sections, 4 presets | 145s | 37s | 3.9× |

`video: 'retain-on-failure'` **records every test** and deletes the file only
when it passes, so the encoding cost is paid on all passing tests too.

**Memory does not grow with test count.** Playwright runs `workers` browser
processes and recycles a context per test — 41 tests or 4,100, peak memory is
the same. Adding specs costs time, not memory.

Projection at full section coverage (~3,300 executions):

| | with video | video off | + viewport trim |
|---|---|---|---|
| today (628 executions) | ~21 min | ~5 min | ~3 min |
| all 25 section specs | ~2h 20m | ~30 min | ~18 min |

Two changes worth making **before** writing the remaining 24 specs:

1. **`video: 'on-first-retry'`** instead of `retain-on-failure` — still captures
   video for failures (on the retry, which runs by default) at no cost on
   passing runs. Caveat: with `--retries=0` there is no retry to record, so use
   `PW_VIDEO=retain-on-failure` for those runs.
2. **Viewport trim.** 24 of the 41 header tests call `setDesktopView()` /
   `setMobileView()` themselves, overriding the project viewport — so running
   them in the tablet and mobile projects repeats identical work. That is ~192
   of 492 executions, about 40%.

## Known theme defects

These tests fail **red on purpose** — they are real defects in the theme, not
framework problems. They are deliberately not hidden behind preset flags:

| Defect | Affected presets | Failing tests |
|---|---|---|
| Logo `<img>` has no `alt` — axe `image-alt` (critical) | khajal, doll, moonlight | 27 |
| Mobile menu toggle has no accessible name — axe `button-name` (critical) | all four (tablet + mobile) | 11 (shared with above) |
| JS error on load: `Identifier 'featuredTabsUid' has already been declared` | all four, **intermittently** | 6–9 |
| `SS-A11Y-01` slideshow region has no accessible name / `aria-roledescription` | all four | 4 |
| `SS-A11Y-03` off-screen slides not hidden from assistive tech | all four | 4 |
| `SS-MEDIA-03` first slide image (the LCP element) is `loading="lazy"` | all four | 4 |
| `SS-A11Y-09` `prefers-reduced-motion` ignored — transitions still 300ms | doll (others have no arrows to trigger) | 1 |
| `SS-A11Y-11/12` video poster `.slide__video > img` has no `alt` | moonlight | 2 |
| `SS-LAYOUT-05` 3px horizontal overflow at exactly 768px | moonlight | 1 |
| `SS-LAYOUT-08` cumulative layout shift above budget | moonlight | 1 |

Dense is the only preset with a proper logo `alt` ("Dense Logo"); it fails only
the two `button-name` checks at tablet and mobile.

The `featuredTabsUid` error is a **race**, not a constant: the script is
declared twice depending on section load order. It fires on every khajal and
moonlight run, and intermittently on doll and dense. Retries mask it on the
presets where it fires less often — so run `npm run test:noretry` when you want
the true picture of that defect.

Baseline from the last two full runs:

| | passed | failed | skipped |
|---|---|---|---|
| `npm test` (retries: 1) | 345 | 44 | 106 |
| `npm run test:noretry` | 343 | 47 | 106 |

Every failure in both runs is one of the defects above — there are no known
framework failures. The entire 3-failure delta is the intermittent
`featuredTabsUid` error.

### Transient failures

Against live external storefronts a slow response can fail `beforeEach`
(`HeaderPage.open()`), which reports every test in that batch as **failed**.
Two ways to recognise it:

- A genuine failure names its assertion (`expect(received).toBeTruthy()`,
  `image-alt: Images must have alternative text`). A transient one shows a
  timeout in `beforeEach`, or `Tearing down "context"`.
- A test gated by a preset flag that appears as **failed** instead of
  **skipped** is always a hook failure — the in-test `test.skip()` guard never
  got to run.

Re-run before investigating; these do not reproduce.

## Layout

| Path | Purpose |
|---|---|
| `data/presets.json` | Preset registry + generated section manifest — single source of truth |
| `utils/presets.js` | Loads the registry, applies env overrides |
| `utils/storefront.js` | Password-gate detection and unlock |
| `utils/fixtures.ts` | `preset`, `headerPage`, `slideshowPage` fixtures + `sectionCount()` |
| `utils/helper.js` | Shared helpers (URL patterns, image-loaded assertion) |
| `scripts/sync-sections.mjs` | Regenerates the section manifest from the live stores |
| `tests/setup/` | Per-preset unlock setup project |
| `tests/header.spec.ts` | Header suite (41 tests) |
| `tests/slideshow.spec.ts` | Worked example of the per-section pattern (9 tests) |
| `tests/home-sections.spec.ts` | Manifest drift detection (2 tests) |
| `locators/shopify-locators.js` | All selectors, one file |
| `pages/` | Page Object Model (`BasePage` → `HeaderPage` / `HomePage` / `SlideshowPage`) |

Current size: **628 tests in 4 files** — 41 header + 9 slideshow + 2 drift,
across 12 store/viewport projects, plus 4 unlock setups.

## Notes on selectors

Selectors are intentionally permissive so the suite tolerates minor markup
differences between presets. If one preset diverges, fix it in
`locators/shopify-locators.js` — every page object reads from that single
source of truth. No locator is ever written in a spec file.
