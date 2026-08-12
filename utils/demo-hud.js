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
