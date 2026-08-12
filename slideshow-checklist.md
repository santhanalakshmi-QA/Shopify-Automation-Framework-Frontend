# Slideshow — Automatable Test Checklist (Theme-level Frontend)

Every check here is machine-decidable: the script can say pass or fail without an
opinion. Judgement items (does it look good, does the swipe feel right, does the
crop cut off a face) are **not** in this file — they belong in the manual pass.

**How to read each entry**

| Field | Meaning |
|---|---|
| **How** | The existing helper or mechanism that performs the check |
| **Throws** | The exact failure message the run produces |
| **Means** | What that failure is actually telling you, and the usual cause |

Helpers referenced: `assertCarouselMoves`, `assertLayoutIntact`,
`assertRenderHealth`, `assertNoLayoutShift`, `assertSmoothAnimation`,
`assertNoDeadOrUnsafeLinks`, `assertNoEmptyShell`, `assertNoMissingTranslations`,
`expectNoPageErrors`, axe.

Failure-message prefixes are namespaced so you can grep a report by category:
`SS-RENDER`, `SS-NAV`, `SS-LOOP`, `SS-DOT`, `SS-AUTO`, `SS-TOUCH`, `SS-LAYOUT`,
`SS-MEDIA`, `SS-LINK`, `SS-A11Y`, `SS-PERF`, `SS-NEG`.

---

## 1. Render & structure

### SS-RENDER-01 — Section present and visible
**How:** root locator visible within timeout
**Throws:**
```
SS-RENDER-01 / missing: no slideshow root matched ".slideshow" on <url>.
The section is either not present on this template, or its root class changed.
Checked for 30s at 1440x900.
```
**Means:** Either the page genuinely has no slideshow (wrong URL/template) or the
selector map is stale after a theme update. Check the live DOM before assuming a
theme bug.

---

### SS-RENDER-02 — Slide count in DOM matches visible count
**How:** `assertRenderHealth(slides, { expectCount })`, discounting loop clones
**Throws:**
```
SS-RENDER-02 / count-mismatch: expected 5 slide(s), found 8.
If loop is enabled, 3 of these are Swiper clones (aria-hidden or
.swiper-slide-duplicate). Real slides: 5, clones: 3.
A mismatch beyond the clone count means slides were dropped or duplicated.
```
**Means:** Count clones separately or you'll chase a phantom. A real mismatch
usually means an empty block rendered as a slide, or a slide silently failed.

---

### SS-RENDER-03 — First slide visible on load
**How:** read the slide aligned to the container's left edge before any interaction
**Throws:**
```
SS-RENDER-03 / wrong-start: on load, the slide at the window's left edge is
"Slide 3", expected "Slide 1".
The carousel initialised at the wrong index. Common causes: initialSlide
misconfigured, loop offset not accounted for, or a resize handler firing before
layout settled.
```
**Means:** Merchants configure slide 1 as their hero. Starting elsewhere is a
real defect, and it's invisible to a screenshot taken after interaction.

---

### SS-RENDER-04 — No slide has a zero-size box
**How:** `assertRenderHealth` geometry checks
**Throws:**
```
SS-RENDER-04 / collapsed: "slide[2]" is 1280px wide but 0px tall (minimum 40px).
The slide exists in the DOM and occupies horizontal space but no vertical space.
Usually an empty slide, a float/grid child that never received content, or an
image that failed to load with no height fallback.
```
**Means:** A collapsed slide passes `toBeVisible()`. This is the check that
catches it.

---

### SS-RENDER-05 — All slide images decoded
**How:** `assertRenderHealth({ requireImages: true })` — `naturalWidth === 0`
**Throws:**
```
SS-RENDER-05 / broken-image: "slide[1]" contains image(s) that failed to decode —
the element renders as a broken-image placeholder:
  https://cdn.shopify.com/s/files/.../hero-2.jpg
The <img> is present and complete, but naturalWidth is 0. The file is missing,
the CDN path is wrong, or the format is unsupported.
```
**Means:** Distinct from a 404 — the request may have succeeded and returned
something undecodable. Both matter.

---

### SS-RENDER-06 — No missing translation keys
**How:** `expectNoMissingTranslations()`
**Throws:**
```
SS-RENDER-06 / translation: the page rendered 2 missing translation key(s) as
visible text:
  Translation missing: en.sections.slideshow.previous_slide
  Translation missing: en.sections.slideshow.pause
Add the key to locales/en.default.json AND every other locale file the theme ships.
```
**Means:** Standard marketplace rejection. Often hits the a11y labels on
arrows/pause, which nobody looks at.

---

### SS-RENDER-07 — No JS errors or failed assets on init
**How:** `expectNoPageErrors()` with the ownership filter
**Throws:**
```
SS-RENDER-07 / runtime: the slideshow page reported issues attributable to theme code:
  [pageerror] TypeError: Cannot read properties of null (reading 'addEventListener')
    at slideshow.js:42
  [request] 404 https://cdn.shopify.com/s/files/.../slideshow.css
The section rendered but its JavaScript threw. Markup assertions will still pass —
this is the only check that catches an uninitialised carousel.
```
**Means:** The highest-value single check in the file. A slideshow whose JS dies
still renders all its slides stacked and looks "fine" to every DOM assertion.

---

### SS-RENDER-08 — Single-slide case has no dead controls
**How:** conditional — when slide count is 1, assert arrows/dots absent or disabled
**Throws:**
```
SS-RENDER-08 / dead-controls: the slideshow has 1 slide but renders 2 enabled
arrow(s) and 1 dot(s).
With nothing to navigate to, controls must be hidden or marked disabled.
Enabled controls that do nothing confuse merchants and fail keyboard review.
```
**Means:** Very common oversight — themes test with 3 slides and never with 1.

---

## 2. Navigation — arrows

### SS-NAV-01 — Next advances exactly one slide
**How:** `assertCarouselMoves` — modular distance in slide-key order
**Throws:**
```
SS-NAV-01 / wrong-distance: clicking next moved 3 card(s), expected 1.
Went "Slide 1" → "Slide 4" (order: Slide 1 → Slide 2 → Slide 3 → Slide 4 → Slide 5).
slidesPerGroup disagrees with slidesPerView, or the click handler fires more than once.
```
**Means:** Skipping slides means merchants' content is never seen. The trail in
the message tells you exactly how far it jumped.

---

### SS-NAV-02 — Next moves in the correct direction
**How:** track `translateX` delta sign
**Throws:**
```
SS-NAV-02 / wrong-direction: next moved the track by +312px.
Advancing should move it LEFT (negative translateX) in a left-to-right carousel.
A positive delta means next and prev are wired backwards.
```
**Means:** Surprisingly common after a refactor, and completely invisible to any
check that only asks "did something change".

---

### SS-NAV-03 — Movement distance ≈ one slide width
**How:** compare `|delta|` against measured slide width, 0.5x–1.8x band
**Throws:**
```
SS-NAV-03 / wrong-distance: next moved the track 4px, but one slide is 1280px wide
(expected roughly 1280px).
A tiny delta means the transition was interrupted or never started; a huge one
means it jumped past several slides.
Band is deliberately wide (0.5x–1.8x) to tolerate gaps, peek slides and
fractional widths.
```
**Means:** Catches the "arrow twitches but doesn't advance" bug.

---

### SS-NAV-04 — Prev returns to the starting slide
**How:** next → prev → compare key to baseline
**Throws:**
```
SS-NAV-04 / prev-broken: next then prev did not return to the starting slide.
Expected "Slide 1", got "Slide 3".
Prev is either not wired up, or moves a different distance than next.
```

---

### SS-NAV-05 — New active slide lands inside the window
**How:** bounding-box comparison against the clipping container
**Throws:**
```
SS-NAV-05 / off-screen: after clicking next, the slide at the left edge starts
-180px from the window's left edge.
The track moved but the slides did not land where they should — a transform/layout
mismatch. The user sees a partially cut slide.
```
**Means:** Distinguishes "the track moved" from "the slides are positioned
correctly". Those are different things.

---

### SS-NAV-06 — Rapid double-click doesn't desync
**How:** click next twice with no wait, settle, compare track position to dot state
**Throws:**
```
SS-NAV-06 / desync: after 2 rapid next clicks, the visible slide is "Slide 2" but
the active dot is index 2 ("Slide 3").
The transition queue and the pagination state diverged. Usually a missing
"is animating" guard on the click handler.
```

---

### SS-NAV-07 — Arrows keyboard-operable
**How:** focus via Tab, activate with Enter and Space
**Throws:**
```
SS-NAV-07 / keyboard: the next arrow received focus but pressing Enter did not
change the slide.
The control is likely a <div> with a click listener and no keydown handler, or a
<button> whose handler calls preventDefault on keyboard events.
Keyboard users cannot operate this slideshow.
```

---

## 3. Loop / boundary

### SS-LOOP-01 — Loop ON wraps forward
**How:** `assertCarouselMoves` boundary walk
**Throws:**
```
SS-LOOP-01 / loop-broken: loop is enabled, but clicking next 7 times through
5 slide(s) never returned to "Slide 1".
Trail: Slide 2 → Slide 3 → Slide 4 → Slide 5 → Slide 5 → Slide 5 → Slide 5
The carousel dead-ends at the last slide instead of wrapping.
```
**Means:** The trail shows exactly where it stopped. Repeating final entries =
dead-end.

---

### SS-LOOP-02 — Loop ON wraps backward
**Throws:**
```
SS-LOOP-02 / loop-broken-backwards: the slideshow loops forwards but prev is
stuck at "Slide 5".
Backward wrapping is broken — a one-directional loop is still a broken loop.
```

---

### SS-LOOP-03 — Loop OFF clamps at the end
**Throws:**
```
SS-LOOP-03 / no-clamp: loop is DISABLED, but clicking next at the last slide
moved from "Slide 5" to "Slide 1".
A non-looping slideshow must stop at the end. Silently wrapping confuses
merchants who turned loop off deliberately.
```

---

### SS-LOOP-04 — Loop OFF clamps at the start
**Throws:**
```
SS-LOOP-04 / no-clamp: loop is DISABLED, but clicking prev at the first slide
moved from "Slide 1" to "Slide 5".
```

---

### SS-LOOP-05 — Boundary arrows are marked disabled
**Throws:**
```
SS-LOOP-05 / a11y: parked at the last slide with loop disabled, but the next arrow
is not marked disabled — no [disabled], no aria-disabled="true", no disabled/lock class.
Keyboard and screen-reader users get no signal that the end was reached, so they
keep pressing a control that does nothing.
```
**Means:** Failing this while SS-LOOP-03 passes means the behaviour is right but
the communication isn't. Both are required.

---

## 4. Pagination — dots / fraction

### SS-DOT-01 — Dot count equals slide count
**Throws:**
```
SS-DOT-01 / count-mismatch: 5 slides but 8 pagination dots.
Loop clones are being counted as real slides when building pagination.
```

---

### SS-DOT-02 — Active dot matches the visible slide
**How:** after every navigation, cross-check dot index against the measured slide
**Throws:**
```
SS-DOT-02 / desync: visible slide is "Slide 3" (index 2) but the active dot is
index 1.
Pagination state and slide state diverged. In loop mode this is usually
realIndex vs activeIndex being used inconsistently.
```
**Means:** One of the five most common slideshow defects. Users trust the dots.

---

### SS-DOT-03 — Clicking dot N jumps to slide N
**Throws:**
```
SS-DOT-03 / jump-failed: clicked dot index 3, expected "Slide 4" at the left edge,
got "Slide 1".
Dots are rendered but not bound, or bound to the wrong index (off-by-one from
loop clone offset).
```

---

### SS-DOT-04 — Dots have accessible names
**Throws:**
```
SS-DOT-04 / a11y: 5 pagination dot(s) have no accessible name.
A screen reader announces "button, button, button, button, button".
Each needs aria-label (e.g. "Go to slide 3") or visible text.
```

---

### SS-DOT-05 — Fraction counter is correct
**Throws:**
```
SS-DOT-05 / fraction: after 2 next clicks the counter reads "2 / 5", expected "3 / 5".
Off by one — the counter is reading a 0-based index without adding 1, or is
updating before the transition resolves.
```

---

## 5. Autoplay

### SS-AUTO-01 — Autoplay ON advances unaided
**How:** record position, wait interval + 40%, re-read
**Throws:**
```
SS-AUTO-01 / no-advance: autoplay is enabled with a 5000ms interval, but the slide
did not change after 7000ms (still "Slide 1").
The timer never started. Common causes: autoplay module not imported, the setting
not passed through to the carousel config, or the timer bound before the
carousel initialised.
```

---

### SS-AUTO-02 — Interval roughly matches the setting
**How:** measure elapsed time between two automatic advances
**Throws:**
```
SS-AUTO-02 / wrong-interval: configured interval is 5000ms, measured 2480ms between
advances (tolerance ±35%).
Roughly half — the timer is being started twice, so two timers race. Check for a
duplicate init on resize or on section:load.
```
**Means:** "Roughly half" and "roughly double" both point at double-initialisation,
which is a specific and findable bug.

---

### SS-AUTO-03 — Autoplay OFF stays still
**Throws:**
```
SS-AUTO-03 / unexpected-advance: autoplay is disabled, but the slide changed from
"Slide 1" to "Slide 2" within 15s with no interaction.
The autoplay setting is not being respected — the timer starts regardless of config.
```

---

### SS-AUTO-04 — Pause on hover
**Throws:**
```
SS-AUTO-04 / no-pause-on-hover: hovered the slideshow for 8000ms (interval 5000ms)
and the slide advanced from "Slide 1" to "Slide 2".
Autoplay must pause while the pointer is over the carousel, or content moves out
from under someone who is reading it.
```

---

### SS-AUTO-05 — Resumes after hover
**Throws:**
```
SS-AUTO-05 / no-resume: autoplay paused on hover correctly but did not resume
after the pointer left (no advance in 8000ms).
The pause path works and the resume path does not — usually a mouseleave handler
that clears the timer instead of restarting it.
```

---

### SS-AUTO-06 — Pauses on keyboard focus
**Throws:**
```
SS-AUTO-06 / no-pause-on-focus: focused a link inside the active slide, waited
8000ms, and the slide advanced.
A keyboard user tabbing into slide content is carried away mid-read. WCAG 2.2.2
requires a mechanism to pause moving content.
```

---

### SS-AUTO-07 — Manual interaction doesn't fight the timer
**Throws:**
```
SS-AUTO-07 / timer-fights-user: clicked next, then the autoplay timer advanced
again only 900ms later (interval 5000ms).
Manual navigation must reset or stop the timer. Otherwise the user's chosen slide
vanishes almost immediately.
```

---

### SS-AUTO-08 — Stops when the tab is hidden
**How:** `page.evaluate` dispatch `visibilitychange` with `document.hidden` stubbed
**Throws:**
```
SS-AUTO-08 / runs-when-hidden: after the tab was marked hidden, the slideshow
advanced 3 more time(s) over 15s.
The timer keeps running in a background tab — battery drain, and the user returns
to a slideshow that has jumped several slides.
```

---

### SS-AUTO-09 — No timer leak across re-init
**How:** trigger `shopify:section:load`-style re-init (or resize), then measure interval
**Throws:**
```
SS-AUTO-09 / timer-leak: after re-initialisation, the measured interval halved
from 5000ms to 2510ms.
The previous timer was never cleared, so two now run concurrently. Each re-init
compounds it.
```

---

## 6. Touch / swipe

### SS-TOUCH-01 — Swipe left advances
**How:** `page.mouse` drag with touch emulation (mobile/tablet projects)
**Throws:**
```
SS-TOUCH-01 / no-swipe: dragged 260px left across the slideshow (threshold ~64px)
and the slide did not change (still "Slide 1").
Touch handling is not enabled, or the container has touch-action: none blocking
the gesture.
```

---

### SS-TOUCH-02 — Swipe right goes back
**Throws:**
```
SS-TOUCH-02 / no-swipe-back: dragged 260px right and the slide did not change.
Forward swipe works, backward does not — a one-directional gesture handler.
```

---

### SS-TOUCH-03 — Sub-threshold swipe snaps back
**Throws:**
```
SS-TOUCH-03 / stuck-mid-slide: after a 20px drag (below the ~64px threshold) the
track is at -18px instead of returning to 0.
A short drag must snap back cleanly. Leaving the track mid-position shows two
half-slides.
```

---

### SS-TOUCH-04 — Vertical page scroll still works
**Throws:**
```
SS-TOUCH-04 / scroll-blocked: dragged vertically starting inside a slide; page
scrollY stayed at 0.
The slideshow is capturing vertical gestures. On mobile the user cannot scroll
past the hero.
```
**Means:** Serious — it can trap the user at the top of the page.

---

## 7. Layout & responsive

### SS-LAYOUT-01 — No horizontal page overflow
**How:** `assertLayoutIntact` check (d), baselined against a short-content run
**Throws:**
```
SS-LAYOUT-01 / page-blowout: document scrollWidth is 1512px against a 1440px
viewport (+72px).
Baseline with short content was 1440px, so the slideshow content caused this.
Usually a full-bleed slide missing overflow:hidden, or a negative margin.
```
**Means:** Baselining against a short-content run makes this attributable rather
than blaming the slideshow for a pre-existing page overflow.

---

### SS-LAYOUT-02 — Content stays inside the slide box
**Throws:**
```
SS-LAYOUT-02 / parent-escape: "slide heading" extends 84px past the right edge of
its slide container.
Text or a button is escaping its box. At this viewport the content is cut off or
overlapping the next slide.
```

---

### SS-LAYOUT-03 — Slide elements don't overlap
**Throws:**
```
SS-LAYOUT-03 / sibling-overlap: "slide button" overlaps "slide subheading" by
18px vertically.
Two elements occupy the same space. Usually absolute positioning that assumed a
shorter heading.
```

---

### SS-LAYOUT-04 — Long text (60/80/100 chars) doesn't break layout
**Throws:**
```
SS-LAYOUT-04 / self-overflow: "slide heading" with a 100-character value has
scrollWidth 620px against clientWidth 480px — the text is clipped inside its own box.
The 100-char fixture contains one long unbroken token, which is what actually
blows layouts out. Add overflow-wrap: anywhere or a max-width.
```

---

### SS-LAYOUT-05 — Breakpoint boundaries behave
**How:** resize to 767 / 768 / 1023 / 1024, re-run layout checks
**Throws:**
```
SS-LAYOUT-05 / breakpoint: layout intact at 767px and at 769px, but FAILED at 768px
(sibling-overlap: slide button overlaps slide heading by 22px).
768 matches two media queries at once, or falls in a gap between them. Check for
`max-width: 768px` paired with `min-width: 768px`.
```
**Means:** The message naming the neighbours as passing is what makes this
immediately diagnosable.

---

### SS-LAYOUT-06 — Slide height setting respected
**Throws:**
```
SS-LAYOUT-06 / height: slide height setting is "large" but the rendered height is
420px, matching the "small" band (expected 700-900px).
The setting is not reaching the DOM, or its class/CSS-var mapping is wrong.
```

---

### SS-LAYOUT-07 — Mobile image / mobile height applies
**Throws:**
```
SS-LAYOUT-07 / mobile-variant: at 390px the slide is still using the desktop image
(hero-desktop.jpg). A separate mobile image is configured (hero-mobile.jpg).
The <picture> source or srcset media condition is not matching at this width.
```

---

### SS-LAYOUT-08 — No layout shift after init
**How:** `assertNoLayoutShift`
**Throws:**
```
SS-LAYOUT-08 / layout-shift: initial render shifted the page by a cumulative score
of 0.23 (budget 0.05). Biggest offenders:
  0.18 — div.slideshow__slide
  0.04 — h2.slideshow__heading
Elements changed size or position after layout settled. Usually images without
width/height, or a container that resizes once its JS initialises.
```

---

## 8. Images & media

### SS-MEDIA-01 — Correct image per slide
**Throws:**
```
SS-MEDIA-01 / wrong-image: slides 2 and 4 resolve to the same source
(hero-1.jpg). Each slide is configured with a distinct image.
The image is being read from the section rather than the block, so every slide
gets slide 1's image.
```

---

### SS-MEDIA-02 — Images have intrinsic dimensions
**Throws:**
```
SS-MEDIA-02 / no-dimensions: 3 slide image(s) have neither width/height attributes
nor an aspect-ratio style:
  hero-1.jpg, hero-2.jpg, hero-3.jpg
The browser cannot reserve space before load, which causes the layout shift
reported by SS-LAYOUT-08.
```

---

### SS-MEDIA-03 — First slide image is not lazy-loaded
**Throws:**
```
SS-MEDIA-03 / lcp-lazy: the first slide's image has loading="lazy".
This is the LCP element. Lazy-loading it delays the largest paint measurably and
costs you the Core Web Vitals score. It should be loading="eager" with
fetchpriority="high".
```

---

### SS-MEDIA-04 — Off-screen slide images are lazy-loaded
**Throws:**
```
SS-MEDIA-04 / eager-offscreen: 4 off-screen slide image(s) have loading="eager".
Every slide image downloads on page load. With 5 large hero images that is
several MB the visitor never sees.
```

---

### SS-MEDIA-05 — Overlay opacity applied
**Throws:**
```
SS-MEDIA-05 / overlay: overlay opacity is set to 40 but the computed value on the
overlay element is 0 (element present, fully transparent).
The setting is not reaching CSS. Text contrast over the image depends on this —
see SS-A11Y-08.
```

---

### SS-MEDIA-06 — Video slides behave
**Throws:**
```
SS-MEDIA-06 / video: the video slide has autoplay but is not muted.
Browsers block autoplay for unmuted video, so this slide renders a frozen first
frame on every visit. Requires muted + playsinline.
```

---

## 9. Links & buttons

### SS-LINK-01 — No dead or unsafe anchors
**How:** `assertNoDeadOrUnsafeLinks`
**Throws:**
```
SS-LINK-01 / dead-link: the slideshow rendered 1 clickable anchor that goes nowhere:
  "Shop now" → "" — anchor with an EMPTY href — clicking reloads the current page
A button with no link configured should render a <span>/<button>, or not render
at all.
```

---

### SS-LINK-02 — Button links resolve
**Throws:**
```
SS-LINK-02 / broken-link: "View collection" → /collections/summer-2024 returned 404.
Checked with a GET following redirects. Note a soft-404 (200 with "not found"
content) will NOT be caught here — verify manually if the store uses one.
```
**Means:** The caveat matters. State the limitation rather than implying full
coverage.

---

### SS-LINK-03 — New-tab links are safe
**Throws:**
```
SS-LINK-03 / unsafe-target: "Read more" has target="_blank" but no rel="noopener".
The opened page gets a window.opener reference back to your store — a
tabnabbing risk, and a routine marketplace review finding.
```

---

### SS-LINK-04 — Slide without a button renders no shell
**Throws:**
```
SS-LINK-04 / empty-shell: slide 3 has no button configured, but an empty
.slideshow__button element is rendered (18x44px, no text).
An invisible clickable box sits over the slide. It also receives keyboard focus,
so Tab appears to stop on nothing.
```

---

## 10. Accessibility

### SS-A11Y-01 — Region has an accessible name
**Throws:**
```
SS-A11Y-01 / unnamed-region: the slideshow container has no accessible name.
A screen reader announces "region" with no indication of what it contains.
Add aria-label (e.g. "Featured collections") and aria-roledescription="carousel".
```

---

### SS-A11Y-02 — Arrows have accessible names
**Throws:**
```
SS-A11Y-02 / unnamed-controls: 2 arrow control(s) have no accessible name.
Announced as "button, button". Add aria-label="Previous slide" / "Next slide" —
these are also the labels most often missing from locale files (see SS-RENDER-06).
```

---

### SS-A11Y-03 — Off-screen slides hidden from assistive tech
**Throws:**
```
SS-A11Y-03 / exposed-slides: 4 off-screen slide(s) are visible to assistive tech
(no aria-hidden="true" and not inert).
A screen reader reads all 5 slide headings in sequence as though they were all on
screen. This is one of the most common slideshow accessibility failures.
```

---

### SS-A11Y-04 — Active slide is NOT hidden
**Throws:**
```
SS-A11Y-04 / hidden-active: the currently visible slide has aria-hidden="true".
The slide a sighted user is looking at is invisible to a screen reader — worse
than not hiding anything. Usually aria-hidden is set on all slides and never
cleared for the active one.
```

---

### SS-A11Y-05 — No keyboard trap
**Throws:**
```
SS-A11Y-05 / keyboard-trap: pressed Tab 12 times from inside the slideshow and
focus never left the section.
A keyboard user cannot reach the rest of the page. Usually a focus-wrapping
handler intended for a modal.
```

---

### SS-A11Y-06 — Visible focus indicator
**Throws:**
```
SS-A11Y-06 / no-focus-ring: the next arrow shows no visible focus indicator when
focused (outline: none, no box-shadow, no border/background change detected).
Keyboard users cannot tell where they are.
```

---

### SS-A11Y-07 — Focus doesn't land on off-screen slide links
**Throws:**
```
SS-A11Y-07 / offscreen-focus: Tab moved focus to "Shop now" inside slide 4, which
is outside the visible window.
The page scrolls to an invisible element and the user loses their place.
Off-screen slides must be inert or their focusables removed from tab order.
```

---

### SS-A11Y-08 — Contrast ≥ 4.5:1 over every slide, every preset
**How:** axe `color-contrast` per slide, per preset
**Throws:**
```
SS-A11Y-08 / contrast: slide 2 heading is 2.8:1 against its background (minimum 4.5:1).
Preset: "Minimal". Foreground #FFFFFF over image average #C9C4BC with overlay
opacity 20.
This slide passes under the "Default" preset and fails under "Minimal" — contrast
is computed from rendered colour, so it MUST be checked per preset.
```
**Means:** The single strongest reason to run the suite against all four presets.

---

### SS-A11Y-09 — prefers-reduced-motion respected
**How:** open with motion enabled, then emulate `reduce`, re-measure
**Throws:**
```
SS-A11Y-09 / reduced-motion: with prefers-reduced-motion: reduce, autoplay still
advanced (2 advances in 12s) and slide transitions still animated (measured 420ms).
Under reduced motion, autoplay must stop and transitions should be instant.
NOTE: this requires opening the page with { motion: true } — the default
freezeAnimations makes this check pass trivially.
```
**Means:** The note is important. Without the opt-out you get a false pass.

---

### SS-A11Y-10 — Live region announces changes appropriately
**Throws:**
```
SS-A11Y-10 / live-region: slide changes are announced via aria-live="assertive"
while autoplay is enabled.
Assertive interrupts the screen reader every 5 seconds. Use aria-live="polite",
and suppress announcements entirely while autoplay is running — announce only
user-initiated changes.
```

---

## 11. Performance & animation

### SS-PERF-01 — Transition drops no frames beyond budget
**How:** `assertSmoothAnimation` (requires `{ motion: true }`)
**Throws:**
```
SS-PERF-01 / dropped-frames: the slide transition is janky — 14/38 frames over
33ms (36.8%), worst frame 88ms, average 41fps (budget 20%).
Usually a non-composited property being animated, or layout work inside the
transition handler. See SS-PERF-02.
NOTE: CI runners are noisy. Treat as advisory until you have seen its variance
across ~20 runs on your own machine.
```

---

### SS-PERF-02 — Animates transform/opacity, not layout properties
**How:** inspect the transition/animation property list
**Throws:**
```
SS-PERF-02 / non-composited: the slide track animates "left" (transition-property:
left 400ms ease).
left/width/height/top force layout on every frame. Animate transform and opacity
instead — this is almost always the cause of SS-PERF-01.
```
**Means:** Deterministic, unlike SS-PERF-01. Safe to gate on.

---

### SS-PERF-03 — No memory growth over repeated advances
**Throws:**
```
SS-PERF-03 / leak: JS heap grew from 12.4MB to 31.8MB over 50 auto-advances
(+156%).
Listeners or timers are being added per transition and never removed. Correlates
with SS-AUTO-09.
```

---

## 12. Cross-cutting

### SS-CROSS-01 — Works on Chromium and WebKit
**Throws:**
```
SS-CROSS-01 / engine: SS-NAV-01 passes on Chromium and fails on WebKit
(no-movement: clicking next left "Slide 1" at the left edge).
A WebKit-only failure. Check for unsupported JS/CSS — :has(), scroll-timeline,
and newer Intl APIs are common culprits.
```

---

### SS-CROSS-02 — Two slideshows on one page are independent
**Throws:**
```
SS-CROSS-02 / cross-binding: clicked the next arrow on slideshow instance 1, and
instance 0 also advanced ("Slide 1" → "Slide 2").
The section's JS uses document.querySelector instead of scoping to its own root,
so every instance shares one set of controls.
```
**Means:** Requires two slideshows on one page. Undetectable from any
single-instance test.

---

## 13. NEGATIVE CASES

The states a merchant reaches by *not* filling something in. Every check above
assumes well-formed content; these assume the opposite.

### SS-NEG-01 — Zero slides
**Setup:** section present, no slide blocks
**Throws:**
```
SS-NEG-01 / empty-shell: the slideshow has no slides, no text and no media, but
still occupies 640px of vertical space (budget 24px).
The storefront shows an unexplained empty band. The section must hide itself when
it has nothing to show.
```

---

### SS-NEG-02 — One slide only
**Setup:** exactly one slide block
**Throws:**
```
SS-NEG-02 / dead-controls: 1 slide but arrows and dots are rendered and enabled.
Clicking them does nothing. They must be hidden or disabled — see SS-RENDER-08.
```

---

### SS-NEG-03 — Slide with no image
**Throws:**
```
SS-NEG-03 / no-fallback: slide 2 has no image configured and renders a 1280x0px
container with no background.
The slide collapses and the carousel jumps when it scrolls past. Expected either
a placeholder, a background colour fallback, or the slide omitted entirely.
```

---

### SS-NEG-04 — Slide with no text
**Throws:**
```
SS-NEG-04 / empty-overlay: slide 3 has no heading, subheading or button, but the
text overlay container renders at 1280x180px with an active background.
An empty dark band sits over the image for no reason.
```

---

### SS-NEG-05 — Empty button link
**Throws:**
```
SS-NEG-05 / dead-link: "Shop now" → "" — anchor with an EMPTY href.
Clicking reloads the current page. See SS-LINK-01.
```

---

### SS-NEG-06 — Very long heading (100 chars)
**Throws:**
```
SS-NEG-06 / self-overflow: slide heading with a 100-character value is clipped
inside its own box (scrollWidth 620px vs clientWidth 480px).
Fixture includes one long unbroken token — the realistic worst case, e.g. a
pasted URL.
```

---

### SS-NEG-07 — Maximum slides
**Setup:** provision at the section's declared `max_blocks`, then one over
**Throws (at max):**
```
SS-NEG-07a / at-max: at 10 slides (max_blocks=10), pagination dots overflow their
container by 140px at 390px viewport.
The dot row was designed for ~5 and does not wrap or scroll.
```
**Throws (over max):**
```
SS-NEG-07b / not-rejected: 11 slides (max_blocks=10) was ACCEPTED but should have
been rejected. Either the theme declares a ceiling it does not enforce, or
max_blocks changed in the schema.
```

---

### SS-NEG-08 — Emoji, CJK and RTL content
**Throws:**
```
SS-NEG-08 / layout: slide heading with CJK content has scrollHeight 96px vs
clientHeight 64px — text is clipped vertically.
CJK line-height and word-breaking differ from Latin. Themes sold internationally
must handle it.
```

---

### SS-NEG-09 — Script injection in a text field
**Throws:**
```
SS-NEG-09 / xss: a <script> tag placed in the slide heading executed
(window.__qaXssProbe was set).
Rich text must be escaped or sanitised. This is a security finding, not a layout one.
```
**Means:** Detected via `pageerror`/probe rather than DOM inspection — a script
that runs leaves evidence.

---

### SS-NEG-10 — Autoplay with one slide
**Throws:**
```
SS-NEG-10 / pointless-timer: autoplay is enabled with only 1 slide and a timer is
running (fires every 5000ms with no visible effect).
Wasted work and, with a live region, a screen reader announcement every 5 seconds
for a slide that never changes.
```

---

### SS-NEG-11 — Slow network / image not yet loaded
**Setup:** throttle, assert during load
**Throws:**
```
SS-NEG-11 / no-placeholder: before slide images load, the slideshow height is 0px,
then jumps to 640px (CLS 0.31).
No reserved space during loading. Set aspect-ratio or width/height on the slide
container so the box exists before the image arrives.
```

---

### SS-NEG-12 — JS disabled / failed to load
**Setup:** block the section's JS asset
**Throws:**
```
SS-NEG-12 / no-fallback: with slideshow.js blocked, all 5 slides render stacked
vertically at full height (total page height 4200px) with no controls.
Expected graceful degradation — show slide 1 only, or a scrollable row. A CDN
hiccup should not produce a 4200px page.
```
**Means:** Rare in practice, ugly when it happens, and cheap to test.

---

## Coverage summary

| Group | Checks | Fully automatable |
|---|---|---|
| Render & structure | 8 | 8 |
| Navigation | 7 | 7 |
| Loop / boundary | 5 | 5 |
| Pagination | 5 | 5 |
| Autoplay | 9 | 9 |
| Touch / swipe | 4 | 4 (emulated) |
| Layout & responsive | 8 | 8 |
| Images & media | 6 | 6 |
| Links & buttons | 4 | 4 |
| Accessibility | 10 | 10 |
| Performance | 3 | 2 hard + 1 advisory |
| Cross-cutting | 2 | 2 |
| **Negative** | **12** | **12** |
| **Total** | **83** | **82 + 1 advisory** |

Still manual regardless: real-device swipe feel, screen-reader walkthrough, image
cropping judgement, copy legibility over photography, autoplay pacing, and
whether the composition looks right.

---

## Build order

| | Group | Why first |
|---|---|---|
| 1 | Render, Nav, Loop | Mostly built already — `assertCarouselMoves` covers Nav + Loop |
| 2 | Negative | Highest defect yield per line written |
| 3 | Autoplay | 9 checks, entirely new, and timer bugs are common |
| 4 | Accessibility | 10 checks; SS-A11Y-08 alone justifies the preset sweep |
| 5 | Layout & Media | Reuses `assertLayoutIntact` / `assertRenderHealth` |
| 6 | Performance | SS-PERF-02 is deterministic — gate on it; SS-PERF-01 advisory only |
