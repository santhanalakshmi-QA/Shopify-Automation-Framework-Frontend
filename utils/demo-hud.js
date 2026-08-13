// utils/demo-hud.js
// ─────────────────────────────────────────────────────────────
// On-screen narrator for demo runs.
//
// When PW_DEMO=1 (set automatically by `npm run demo:*`), every page
// gets a small banner naming the check that is running and, in one
// plain sentence, what it is doing — plus a highlight around the
// slideshow so you can see what is being poked.
//
// Purpose: watch the run instead of reading the spec.
//
// It is INERT outside demo mode. Normal runs inject nothing, so the
// overlay can never influence a layout or overflow assertion.
// ─────────────────────────────────────────────────────────────

export const DEMO = process.env.PW_DEMO === '1';

// PW_DEMO_SHOT=1 saves a PNG while each highlight is lit — a proof
// image straight out of the real test run, not a staged capture.
const SHOT = process.env.PW_DEMO_SHOT === '1';
let currentCheck = 'check';
// The last thing a check looked at, so the final verdict can be shown
// on those same elements once the test result is known.
let lastSpotted = null;

// One short line per check — what a person would say out loud while
// watching it happen.
const CLUES = {
  'SS-RENDER-01': 'Is the slideshow on the page at all?',
  'SS-RENDER-02': 'Counting slides, ignoring the carousel’s internal copies.',
  'SS-RENDER-03': 'Did it start on slide 1, or somewhere in the middle?',
  'SS-RENDER-04': 'Does any slide have zero height (invisible but "visible")?',
  'SS-RENDER-05': 'Any broken-image icons among the slides?',
  'SS-RENDER-06': 'Any raw "Translation missing:" text on screen?',
  'SS-RENDER-07': 'Reloading and listening for JavaScript errors and 404s.',
  'SS-RENDER-09': 'Is exactly one slide showing — not two, not none?',
  'SS-RENDER-10': 'Are the slides in the order the merchant set them?',

  'SS-NAV-01': 'Clicking next — did it move exactly one slide?',
  'SS-NAV-02': 'Clicking next — did the track move LEFT, not right?',
  'SS-NAV-03': 'Clicking next — did it travel about one slide’s width?',
  'SS-NAV-04': 'Next, then back — did it land where it started?',
  'SS-NAV-05': 'After moving, is the slide aligned or half off-screen?',
  'SS-NAV-06': 'Two fast clicks — do the dots and the slide still agree?',
  'SS-NAV-07': 'Driving the arrow with the keyboard: Enter, then Space.',
  'SS-NAV-08': 'Clicking prev — did it move exactly one slide back?',

  'SS-LOOP-01': 'Clicking next all the way round — does it return to slide 1?',
  'SS-LOOP-02': 'Pressing back on slide 1 — does it wrap to the last slide?',

  'SS-DOT-01': 'One dot per slide?',
  'SS-DOT-02': 'Is the highlighted dot the slide you can actually see?',
  'SS-DOT-03': 'Clicking the LAST dot — does it jump straight there?',
  'SS-DOT-04': 'Would a screen reader say more than "button, button"?',

  'SS-LOOP-03': 'Loop is off — clicking past the end, does it stop or wrap?',
  'SS-LOOP-04': 'Loop is off — clicking back from slide 1, does it stop?',
  'SS-LOOP-05': 'At the last slide — is the arrow greyed out properly?',

  'SS-AUTO-01': 'Waiting to see if it advances on its own.',
  'SS-AUTO-02': 'Timing the gap between advances — matches the setting?',
  'SS-AUTO-03': 'Autoplay is off — waiting to prove nothing moves.',
  'SS-AUTO-04': 'Hovering over it — does it politely stop moving?',
  'SS-AUTO-05': 'Moving the pointer away — does it start again?',
  'SS-AUTO-06': 'Tabbing into a slide — does it stop so you can read?',
  'SS-AUTO-07': 'Clicking next — does the timer reset, or fight you?',
  'SS-AUTO-08': 'Pretending the tab is hidden — does it keep running?',
  'SS-AUTO-09': 'Resizing to force a restart — are two timers now running?',

  'SS-TOUCH-01': 'Swiping left with a finger — does it advance?',
  'SS-TOUCH-02': 'Swiping right — does it go back?',
  'SS-TOUCH-03': 'A tiny 20px drag — does it snap back cleanly?',
  'SS-TOUCH-04': 'Dragging up from inside a slide — can the page still scroll?',

  'SS-LAYOUT-01': 'Does the slideshow push the page sideways?',
  'SS-LAYOUT-02': 'Is any text spilling outside its slide?',
  'SS-LAYOUT-03': 'Are the heading and button sitting on top of each other?',
  'SS-LAYOUT-10': 'Is the text centred inside each button?',
  'SS-LAYOUT-11': 'Squeezing to 390px — does any text get cut off or fail to wrap?',
  'SS-LAYOUT-09': 'Resizing 1440 → 1280 → 810 → 390, checking it holds.',
  'SS-LAYOUT-06': 'Does the configured slide height match what renders?',
  'SS-LAYOUT-07': 'Shrinking to phone width — does the mobile image swap in?',
  'SS-LAYOUT-05': 'Resizing 1440 → 1200 → 1024 → 768, checking it holds.',
  'SS-LAYOUT-08': 'Watching 3s for the page jumping around as it loads.',

  'SS-MEDIA-01': 'Is every slide showing a different picture?',
  'SS-MEDIA-02': 'Do images declare their size so space is reserved?',
  'SS-MEDIA-03': 'Is the big first image lazy-loaded? (it shouldn’t be)',
  'SS-MEDIA-04': 'Are off-screen images lazy-loaded? (they should be)',
  'SS-MEDIA-06': 'Is the video muted and set to play inline?',

  'SS-LINK-01/03/04': 'Any links that go nowhere, are unsafe, or are empty boxes?',
  'SS-LINK-02': 'Fetching every button’s destination, then clicking one.',

  'SS-A11Y-01': 'Does the slideshow announce itself, or just say "region"?',
  'SS-A11Y-02': 'Are the arrows named "Next slide" / "Previous slide"?',
  'SS-A11Y-03': 'Are hidden slides kept away from screen readers?',
  'SS-A11Y-04': 'Is the slide you CAN see wrongly hidden from screen readers?',
  'SS-A11Y-05': 'Pressing Tab up to 25 times — can focus escape the section?',
  'SS-A11Y-06': 'Focusing each control — is there a visible focus ring?',
  'SS-A11Y-07': 'Can Tab reach links inside slides you can’t see?',
  'SS-A11Y-08': 'Checking text contrast on every slide, one at a time.',
  'SS-A11Y-09': 'Asking for reduced motion — does it still animate?',
  'SS-A11Y-10': 'Would announcements interrupt a screen reader?',
  'SS-A11Y-11': 'Does every image have alt text?',
  'SS-A11Y-12': 'Full accessibility sweep for critical problems.',
  'SS-A11Y-13': 'Measuring the arrows and dots — big enough to tap (44px)?',
  'SS-A11Y-14': 'Tabbing to a dot and pressing Enter — does it work?',

  'SS-HOVER-01': 'Hovering each button — does it change colour at all?',
  'SS-HOVER-02': 'Hovering the arrows — do they react?',
  'SS-HOVER-03': 'Hovering a dot — does it react?',
  'SS-HOVER-04': 'Hovering a button — does it grow and shove the layout?',

  'SS-UI-01': 'Comparing a screenshot against the saved reference image.',
  'SS-PERF-02': 'Is it animating cheaply (transform) or expensively (left)?',
  'SS-NEG-12': 'Blocking the slideshow’s JavaScript — does it degrade gracefully?',

  // ── Testimonials (carousel of customer quote cards) ────────
  'TS-RENDER-01': 'Are all the testimonial sections on the page?',
  'TS-RENDER-02': 'Counting the quote cards in each section.',
  'TS-RENDER-03': 'Has any card collapsed to no height?',
  'TS-RENDER-04': 'Any raw "Translation missing:" text showing?',
  'TS-RENDER-05': 'Reloading and listening for JavaScript errors.',
  'TS-CONTENT-01': 'Does every card actually show a quote?',
  'TS-CONTENT-02': 'Is every quote attributed to someone?',
  'TS-CONTENT-03': 'Is the same quote pasted in twice?',
  'TS-CONTENT-04': 'Is there a heading framing this row of quotes?',
  'TS-RATING-01': 'Does every card carry a star rating?',
  'TS-RATING-02': 'Are the ratings announced, and within their own scale?',
  'TS-MEDIA-01': 'Does every card have a photo?',
  'TS-MEDIA-02': 'Does every photo have alt text?',
  'TS-MEDIA-03': 'Any broken-image icons among the cards?',
  'TS-NAV-01': 'Clicking the arrow — do the quotes actually move?',
  'TS-NAV-02': 'Are the arrows named for a screen reader?',
  'TS-LINK-01/03/04': 'Any links that go nowhere, are unsafe, or are empty boxes?',
  'TS-LAYOUT-01': 'Does this section push the page sideways?',
  'TS-LAYOUT-02': 'Resizing 1440 → 1200 → 1024 → 768 → 390, checking it holds.',
  'TS-A11Y-01': 'Accessibility sweep for critical problems.',
  'TS-A11Y-02': 'Is the text readable against its background (4.5:1)?',

  // ── Collection list (carousel of collection cards) ─────────
  'CL-RENDER-01': 'Is the collection list on the page?',
  'CL-RENDER-02': 'Counting the cards — does it match what we expect?',
  'CL-RENDER-03': 'Does the section have real height, or has it collapsed?',
  'CL-RENDER-04': 'Any raw "Translation missing:" text showing?',
  'CL-RENDER-05': 'Reloading and listening for JavaScript errors.',
  'CL-CONTENT-01': 'Does every card show a collection name?',
  'CL-CONTENT-02': 'Does every card actually link to a collection?',
  'CL-CONTENT-03': 'Is the same collection listed twice by mistake?',
  'CL-CONTENT-04': 'Is there a heading telling you what this row is?',
  'CL-CONTENT-05': 'Do the "5 Items" counts show a real number?',
  'CL-MEDIA-01': 'Does every card have a picture?',
  'CL-MEDIA-02': 'Does every picture have alt text?',
  'CL-MEDIA-03': 'Do images declare their size so the page does not jump?',
  'CL-MEDIA-04': 'Any broken-image icons among the cards?',
  'CL-NAV-01': 'Clicking the arrow — does the row actually move?',
  'CL-NAV-02': 'Forward then back — does it return where it started?',
  'CL-NAV-03': 'Are the arrows named for a screen reader?',
  'CL-AUTO-01': 'Autoplay is on — waiting to see it slide by itself.',
  'CL-AUTO-02': 'Hovering the row — does it stop so you can click?',
  'CL-LINK-01/03/04': 'Any links that go nowhere, are unsafe, or are empty boxes?',
  'CL-LINK-02': 'Fetching every collection link — do they all still exist?',
  'CL-LINK-05': 'Do the picture and the name lead to the SAME collection?',
  'CL-LAYOUT-01': 'Does this section push the page sideways?',
  'CL-LAYOUT-02': 'Is any card text spilling outside its card?',
  'CL-LAYOUT-03': 'Resizing 1440 → 1200 → 1024 → 768 → 390, checking it holds.',
  'CL-A11Y-01': 'Accessibility sweep for critical problems.',
  'CL-A11Y-02': 'Is the text readable against its background (4.5:1)?',
  'CL-A11Y-03': 'Would a screen reader say more than just "link"?',

  // ── Rich text (promo banner with a discount code) ──────────
  'RT-RENDER-01': 'Is the rich-text section on the page?',
  'RT-RENDER-02': 'Does it actually show any words, or is it an empty band?',
  'RT-RENDER-03': 'Does the section have real height, or has it collapsed?',
  'RT-RENDER-04': 'Any raw "Translation missing:" text showing?',
  'RT-RENDER-05': 'Reloading and listening for JavaScript errors.',
  'RT-COPY-01': 'Is there a discount code, and is it free of spaces?',
  'RT-COPY-02': 'Would a screen reader know what the copy button does?',
  'RT-COPY-03': 'Clicking copy — did the real code land on the clipboard?',
  'RT-COPY-04': 'Clicking copy — does it confirm, or leave you guessing?',
  'RT-COPY-05': 'Tabbing to the copy button and pressing Enter — does it copy?',
  'RT-LAYOUT-01': 'Does this section push the page sideways?',
  'RT-LAYOUT-02': 'Is any text spilling outside the section?',
  'RT-LAYOUT-03': 'It says centred — is it actually centred?',
  'RT-LAYOUT-04': 'Resizing 1440 → 1200 → 1024 → 768 → 390, checking it holds.',
  'RT-LINK-01/03/04': 'Any links that go nowhere, are unsafe, or are empty boxes?',
  'RT-A11Y-01': 'Accessibility sweep for critical problems.',
  'RT-A11Y-02': 'Is the text readable against its background (4.5:1)?',
  'RT-A11Y-03': 'Focusing the copy button — is there a visible focus ring?',
};

/**
 * Briefly outline the elements a check is looking at.
 *
 * The banner says WHAT is being checked; this shows WHERE. Without it a
 * passing run is just a green tick you have to take on faith.
 *
 * No-op outside demo mode, so it can be called freely from shared
 * helpers without affecting real runs. Uses outline and background only
 * — neither affects layout, so it cannot skew a geometry assertion even
 * if one were running.
 */
export async function spot(locator, ms = null) {
  if (!DEMO) return;

  // Hold the highlight long enough to actually notice it. 650ms was
  // easy to miss entirely — the check passed, the outline flashed, and
  // nothing remained on screen to show it had happened.
  //
  // Scales with --slowmo so a deliberately slow run gets a deliberately
  // slow highlight; PW_SPOT_MS overrides it outright.
  const slowmo = Number(process.env.PW_SLOWMO ?? 0);
  const override = Number(process.env.PW_SPOT_MS ?? 0);
  const hold = ms ?? (override > 0 ? override : Math.max(1100, slowmo * 1.5));
  lastSpotted = locator;
  try {
    if ((await locator.count()) === 0) return;

    await locator.evaluateAll((els) =>
      els.forEach((el) => el.setAttribute('data-pw-check', ''))
    );
    await saveProof(locator);
    await locator.page().waitForTimeout(hold);
    await locator.evaluateAll((els) =>
      els.forEach((el) => el.removeAttribute('data-pw-check'))
    );
  } catch {
    /* highlighting must never fail a test */
  }
}

/**
 * Highlight each element with its OWN verdict: green where it passed,
 * red where it did not.
 *
 * `spot()` shows what a check looked at. This shows what it concluded,
 * element by element — so a passing check is visibly a row of green
 * ticks rather than an assertion you have to take on trust, and a
 * failing one points straight at the offender.
 *
 * `verdicts[i]` corresponds to the i-th matched element.
 */
export async function spotVerdicts(locator, verdicts, ms = null) {
  if (!DEMO) return;
  lastSpotted = locator;
  try {
    if ((await locator.count()) === 0) return;

    const slowmo = Number(process.env.PW_SLOWMO ?? 0);
    const override = Number(process.env.PW_SPOT_MS ?? 0);
    const hold = ms ?? (override > 0 ? override : Math.max(1400, slowmo * 1.8));

    await locator.evaluateAll((els, v) => {
      els.forEach((el, i) => {
        el.setAttribute(v[i] === false ? 'data-pw-fail' : 'data-pw-pass', '');
      });
    }, verdicts);

    await saveProof(locator, 'verdict');
    await locator.page().waitForTimeout(hold);

    await locator.evaluateAll((els) =>
      els.forEach((el) => {
        el.removeAttribute('data-pw-pass');
        el.removeAttribute('data-pw-fail');
      })
    );
  } catch {
    /* highlighting must never fail a test */
  }
}

/**
 * Re-mark whatever the check last inspected with its OUTCOME: green if
 * the test passed, red if it failed. Called automatically after every
 * test by the `verdict` fixture, so a passing check ends with visible
 * proof on the page rather than only a tick in the terminal.
 */
export async function flashVerdict(passed, ms = 900) {
  if (!DEMO || !lastSpotted) return;
  const locator = lastSpotted;
  lastSpotted = null;

  try {
    if ((await locator.count()) === 0) return;

    await locator.evaluateAll((els, ok) => {
      els.forEach((el) => el.setAttribute(ok ? 'data-pw-pass' : 'data-pw-fail', ''));
    }, passed);

    await saveProof(locator, passed ? 'pass' : 'fail');
    await locator.page().waitForTimeout(ms);

    await locator.evaluateAll((els) =>
      els.forEach((el) => {
        el.removeAttribute('data-pw-pass');
        el.removeAttribute('data-pw-fail');
      })
    );
  } catch {
    /* the page may already be closing — never fail a test over this */
  }
}

async function saveProof(locator, suffix) {
  if (!SHOT) return;
  try {
    const file = 'reports/demo-shots/' + currentCheck + (suffix ? '-' + suffix : '') + '.png';
    await locator.page().screenshot({ path: file });
  } catch {
    /* proof shots are best-effort */
  }
}

/** Pull the check ID out of a test title such as "SS-NAV-01 — next advances…". */
export function checkId(title) {
  // Any section prefix (SS, RT, …), and [A-Z0-9]+ for the category,
  // because IDs like SS-A11Y-08 and SS-UI-01 carry digits in the
  // category itself.
  const match = String(title).match(/^([A-Z]{2,}-[A-Z0-9]+-[0-9]+(?:\/[0-9]+)*)/);
  return match ? match[1] : '';
}

export function clueFor(title) {
  return CLUES[checkId(title)] ?? '';
}

/**
 * Install the narrator. Must be called BEFORE navigating: it registers
 * an init script so the banner survives reloads and re-navigations
 * (SS-RENDER-07, SS-A11Y-09 and SS-NEG-12 all navigate again).
 */
export async function mountNarrator(page, options) {
  if (!DEMO) return;

  // `spotlight` is the section under test — it gets ringed so the viewer
  // can see what is being poked. Defaults to the slideshow; every other
  // section suite passes its own root.
  const {
    title, preset = '', index = 0, total = 0,
    spotlight = '.slideshow-section',
  } = options ?? {};

  // Header tests carry no SS-/CL- style id, so fall back to a slug of
  // the title — otherwise every proof shot is called 'check.png' and
  // each one overwrites the last.
  currentCheck =
    checkId(title) ||
    String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) ||
    'check';

  const payload = {
    id: checkId(title) || 'CHECK',
    clue: clueFor(title) || title,
    preset,
    index,
    total,
    spotlight,
  };

  await page.addInitScript((data) => {
    const draw = () => {
      if (!document.body || document.getElementById('__pwNarrator')) return;

      const bar = document.createElement('div');
      bar.id = '__pwNarrator';
      bar.setAttribute('data-pw-narrator', '');
      bar.innerHTML = `
        <span class="__pwId">${data.id}</span>
        <span class="__pwClue"></span>
        <span class="__pwMeta">${data.preset}${data.total ? ` · ${data.index}/${data.total}` : ''}</span>
      `;
      bar.querySelector('.__pwClue').textContent = data.clue;

      const css = document.createElement('style');
      css.textContent = `
        #__pwNarrator {
          position: fixed; inset: 0 0 auto 0; z-index: 2147483647;
          display: flex; align-items: center; gap: 12px;
          padding: 10px 16px; box-sizing: border-box; max-width: 100%;
          font: 600 14px/1.4 ui-sans-serif, system-ui, sans-serif;
          color: #F2F6F8; background: rgba(12,18,24,.94);
          border-bottom: 2px solid #64B5D1;
          pointer-events: none; overflow: hidden; white-space: nowrap;
        }
        #__pwNarrator .__pwId {
          font-family: ui-monospace, Consolas, monospace; font-size: 12px;
          background: #64B5D1; color: #0C1218; padding: 3px 7px; border-radius: 3px;
        }
        #__pwNarrator .__pwClue { font-weight: 500; overflow: hidden; text-overflow: ellipsis; }
        #__pwNarrator .__pwMeta {
          margin-left: auto; font-weight: 500; font-size: 12px; opacity: .65;
          font-family: ui-monospace, Consolas, monospace;
        }
        /* Drawn INSIDE the element's own bounds: cards on this theme
           use a clipping mask, and an outward outline is clipped away
           entirely — the highlight looked like it simply never ran. */
        [data-pw-check] {
          outline: 3px solid #FFC53D !important;
          outline-offset: -3px !important;
          box-shadow: inset 0 0 0 3px #FFC53D, 0 0 12px 2px rgba(255,197,61,.85) !important;
          background-color: rgba(255,197,61,.18) !important;
          transition: none !important;
        }
        /* Per-element verdicts: green passed, red did not. Drawn
           inside the element for the same clipping reason as above. */
        [data-pw-pass] {
          outline: 3px solid #2FBF63 !important;
          outline-offset: -3px !important;
          box-shadow: inset 0 0 0 3px #2FBF63, 0 0 12px 2px rgba(47,191,99,.75) !important;
          background-color: rgba(47,191,99,.16) !important;
        }
        [data-pw-fail] {
          outline: 3px solid #F04438 !important;
          outline-offset: -3px !important;
          box-shadow: inset 0 0 0 3px #F04438, 0 0 14px 3px rgba(240,68,56,.85) !important;
          background-color: rgba(240,68,56,.20) !important;
        }
        [data-pw-spot] {
          outline: 3px solid #64B5D1 !important;
          outline-offset: 3px !important;
        }
      `;
      document.head?.appendChild(css);
      document.body.appendChild(bar);

      // Ring the slideshow so it is obvious what is under test.
      document.querySelector(data.spotlight)?.setAttribute('data-pw-spot', '');
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', draw);
    } else {
      draw();
    }
    // Sections can render late; try again shortly.
    setTimeout(draw, 600);
    setTimeout(draw, 1800);
  }, payload);
}

export default { DEMO, mountNarrator, clueFor, checkId };
