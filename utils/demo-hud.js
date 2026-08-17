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

  // ── Simple sections (11 types, shared battery) ─────────────
  'BL-RENDER-01': 'Is the brand logo strip on the page?',
  'BL-RENDER-02': 'Counting the items in the brand logo strip.',
  'BL-RENDER-03': 'Has anything in the brand logo strip collapsed to nothing?',
  'BL-RENDER-04': 'Any raw "Translation missing:" text here?',
  'BL-RENDER-05': 'Any unfinished template code like {{ }} left in it?',
  'BL-MEDIA-01': 'Does every picture have text for screen readers?',
  'BL-MEDIA-02': 'Any broken-image icons in the brand logo strip?',
  'BL-MEDIA-03': 'Are all the pictures still there?',
  'BL-LINK-01/03/04': 'Any links that go nowhere, are unsafe, or are empty?',
  'BL-LINK-02': 'Do the links actually go anywhere, or nowhere?',
  'BL-LINK-05': 'Opening every link — do those pages still exist?',
  'BL-LAYOUT-01': 'Does this section push the page sideways?',
  'BL-LAYOUT-02': 'Is anything spilling outside the section?',
  'BL-LAYOUT-03': 'Resizing 1440 → 1200 → 1024 → 768 → 390, checking it holds.',
  'BL-A11Y-01': 'Accessibility sweep of the brand logo strip.',
  'BL-A11Y-02': 'Is the text readable against its background (4.5:1)?',
  'MQ-RENDER-01': 'Is the scrolling marquee on the page?',
  'MQ-RENDER-02': 'Counting the items in the scrolling marquee.',
  'MQ-RENDER-03': 'Has anything in the scrolling marquee collapsed to nothing?',
  'MQ-RENDER-04': 'Any raw "Translation missing:" text here?',
  'MQ-RENDER-05': 'Any unfinished template code like {{ }} left in it?',
  'MQ-MEDIA-01': 'Does every picture have text for screen readers?',
  'MQ-MEDIA-02': 'Any broken-image icons in the scrolling marquee?',
  'MQ-MEDIA-03': 'Are all the pictures still there?',
  'MQ-LINK-01/03/04': 'Any links that go nowhere, are unsafe, or are empty?',
  'MQ-LINK-02': 'Do the links actually go anywhere, or nowhere?',
  'MQ-LINK-05': 'Opening every link — do those pages still exist?',
  'MQ-LAYOUT-01': 'Does this section push the page sideways?',
  'MQ-LAYOUT-02': 'Is anything spilling outside the section?',
  'MQ-LAYOUT-03': 'Resizing 1440 → 1200 → 1024 → 768 → 390, checking it holds.',
  'MQ-A11Y-01': 'Accessibility sweep of the scrolling marquee.',
  'MQ-A11Y-02': 'Is the text readable against its background (4.5:1)?',
  'NC-RENDER-01': 'Is the number counters on the page?',
  'NC-RENDER-02': 'Counting the items in the number counters.',
  'NC-RENDER-03': 'Has anything in the number counters collapsed to nothing?',
  'NC-RENDER-04': 'Any raw "Translation missing:" text here?',
  'NC-RENDER-05': 'Any unfinished template code like {{ }} left in it?',
  'NC-MEDIA-01': 'Does every picture have text for screen readers?',
  'NC-MEDIA-02': 'Any broken-image icons in the number counters?',
  'NC-MEDIA-03': 'Are all the pictures still there?',
  'NC-LINK-01/03/04': 'Any links that go nowhere, are unsafe, or are empty?',
  'NC-LINK-02': 'Do the links actually go anywhere, or nowhere?',
  'NC-LINK-05': 'Opening every link — do those pages still exist?',
  'NC-LAYOUT-01': 'Does this section push the page sideways?',
  'NC-LAYOUT-02': 'Is anything spilling outside the section?',
  'NC-LAYOUT-03': 'Resizing 1440 → 1200 → 1024 → 768 → 390, checking it holds.',
  'NC-A11Y-01': 'Accessibility sweep of the number counters.',
  'NC-A11Y-02': 'Is the text readable against its background (4.5:1)?',
  'IWT-RENDER-01': 'Is the icon-with-text row on the page?',
  'IWT-RENDER-02': 'Counting the items in the icon-with-text row.',
  'IWT-RENDER-03': 'Has anything in the icon-with-text row collapsed to nothing?',
  'IWT-RENDER-04': 'Any raw "Translation missing:" text here?',
  'IWT-RENDER-05': 'Any unfinished template code like {{ }} left in it?',
  'IWT-MEDIA-01': 'Does every picture have text for screen readers?',
  'IWT-MEDIA-02': 'Any broken-image icons in the icon-with-text row?',
  'IWT-MEDIA-03': 'Are all the pictures still there?',
  'IWT-LINK-01/03/04': 'Any links that go nowhere, are unsafe, or are empty?',
  'IWT-LINK-02': 'Do the links actually go anywhere, or nowhere?',
  'IWT-LINK-05': 'Opening every link — do those pages still exist?',
  'IWT-LAYOUT-01': 'Does this section push the page sideways?',
  'IWT-LAYOUT-02': 'Is anything spilling outside the section?',
  'IWT-LAYOUT-03': 'Resizing 1440 → 1200 → 1024 → 768 → 390, checking it holds.',
  'IWT-A11Y-01': 'Accessibility sweep of the icon-with-text row.',
  'IWT-A11Y-02': 'Is the text readable against its background (4.5:1)?',
  'IB-RENDER-01': 'Is the image banner on the page?',
  'IB-RENDER-02': 'Counting the items in the image banner.',
  'IB-RENDER-03': 'Has anything in the image banner collapsed to nothing?',
  'IB-RENDER-04': 'Any raw "Translation missing:" text here?',
  'IB-RENDER-05': 'Any unfinished template code like {{ }} left in it?',
  'IB-MEDIA-01': 'Does every picture have text for screen readers?',
  'IB-MEDIA-02': 'Any broken-image icons in the image banner?',
  'IB-MEDIA-03': 'Are all the pictures still there?',
  'IB-LINK-01/03/04': 'Any links that go nowhere, are unsafe, or are empty?',
  'IB-LINK-02': 'Do the links actually go anywhere, or nowhere?',
  'IB-LINK-05': 'Opening every link — do those pages still exist?',
  'IB-LAYOUT-01': 'Does this section push the page sideways?',
  'IB-LAYOUT-02': 'Is anything spilling outside the section?',
  'IB-LAYOUT-03': 'Resizing 1440 → 1200 → 1024 → 768 → 390, checking it holds.',
  'IB-A11Y-01': 'Accessibility sweep of the image banner.',
  'IB-A11Y-02': 'Is the text readable against its background (4.5:1)?',
  'GB-RENDER-01': 'Is the grid banner on the page?',
  'GB-RENDER-02': 'Counting the items in the grid banner.',
  'GB-RENDER-03': 'Has anything in the grid banner collapsed to nothing?',
  'GB-RENDER-04': 'Any raw "Translation missing:" text here?',
  'GB-RENDER-05': 'Any unfinished template code like {{ }} left in it?',
  'GB-MEDIA-01': 'Does every picture have text for screen readers?',
  'GB-MEDIA-02': 'Any broken-image icons in the grid banner?',
  'GB-MEDIA-03': 'Are all the pictures still there?',
  'GB-LINK-01/03/04': 'Any links that go nowhere, are unsafe, or are empty?',
  'GB-LINK-02': 'Do the links actually go anywhere, or nowhere?',
  'GB-LINK-05': 'Opening every link — do those pages still exist?',
  'GB-LAYOUT-01': 'Does this section push the page sideways?',
  'GB-LAYOUT-02': 'Is anything spilling outside the section?',
  'GB-LAYOUT-03': 'Resizing 1440 → 1200 → 1024 → 768 → 390, checking it holds.',
  'GB-A11Y-01': 'Accessibility sweep of the grid banner.',
  'GB-A11Y-02': 'Is the text readable against its background (4.5:1)?',
  'NL-RENDER-01': 'Is the newsletter block on the page?',
  'NL-RENDER-02': 'Counting the items in the newsletter block.',
  'NL-RENDER-03': 'Has anything in the newsletter block collapsed to nothing?',
  'NL-RENDER-04': 'Any raw "Translation missing:" text here?',
  'NL-RENDER-05': 'Any unfinished template code like {{ }} left in it?',
  'NL-MEDIA-01': 'Does every picture have text for screen readers?',
  'NL-MEDIA-02': 'Any broken-image icons in the newsletter block?',
  'NL-MEDIA-03': 'Are all the pictures still there?',
  'NL-LINK-01/03/04': 'Any links that go nowhere, are unsafe, or are empty?',
  'NL-LINK-02': 'Do the links actually go anywhere, or nowhere?',
  'NL-LINK-05': 'Opening every link — do those pages still exist?',
  'NL-LAYOUT-01': 'Does this section push the page sideways?',
  'NL-LAYOUT-02': 'Is anything spilling outside the section?',
  'NL-LAYOUT-03': 'Resizing 1440 → 1200 → 1024 → 768 → 390, checking it holds.',
  'NL-A11Y-01': 'Accessibility sweep of the newsletter block.',
  'NL-A11Y-02': 'Is the text readable against its background (4.5:1)?',
  'SPEC-RENDER-01': 'Is the specifications on the page?',
  'SPEC-RENDER-02': 'Counting the items in the specifications.',
  'SPEC-RENDER-03': 'Has anything in the specifications collapsed to nothing?',
  'SPEC-RENDER-04': 'Any raw "Translation missing:" text here?',
  'SPEC-RENDER-05': 'Any unfinished template code like {{ }} left in it?',
  'SPEC-MEDIA-01': 'Does every picture have text for screen readers?',
  'SPEC-MEDIA-02': 'Any broken-image icons in the specifications?',
  'SPEC-MEDIA-03': 'Are all the pictures still there?',
  'SPEC-LINK-01/03/04': 'Any links that go nowhere, are unsafe, or are empty?',
  'SPEC-LINK-02': 'Do the links actually go anywhere, or nowhere?',
  'SPEC-LINK-05': 'Opening every link — do those pages still exist?',
  'SPEC-LAYOUT-01': 'Does this section push the page sideways?',
  'SPEC-LAYOUT-02': 'Is anything spilling outside the section?',
  'SPEC-LAYOUT-03': 'Resizing 1440 → 1200 → 1024 → 768 → 390, checking it holds.',
  'SPEC-A11Y-01': 'Accessibility sweep of the specifications.',
  'SPEC-A11Y-02': 'Is the text readable against its background (4.5:1)?',
  'GS-RENDER-01': 'Is the grid showcase on the page?',
  'GS-RENDER-02': 'Counting the items in the grid showcase.',
  'GS-RENDER-03': 'Has anything in the grid showcase collapsed to nothing?',
  'GS-RENDER-04': 'Any raw "Translation missing:" text here?',
  'GS-RENDER-05': 'Any unfinished template code like {{ }} left in it?',
  'GS-MEDIA-01': 'Does every picture have text for screen readers?',
  'GS-MEDIA-02': 'Any broken-image icons in the grid showcase?',
  'GS-MEDIA-03': 'Are all the pictures still there?',
  'GS-LINK-01/03/04': 'Any links that go nowhere, are unsafe, or are empty?',
  'GS-LINK-02': 'Do the links actually go anywhere, or nowhere?',
  'GS-LINK-05': 'Opening every link — do those pages still exist?',
  'GS-LAYOUT-01': 'Does this section push the page sideways?',
  'GS-LAYOUT-02': 'Is anything spilling outside the section?',
  'GS-LAYOUT-03': 'Resizing 1440 → 1200 → 1024 → 768 → 390, checking it holds.',
  'GS-A11Y-01': 'Accessibility sweep of the grid showcase.',
  'GS-A11Y-02': 'Is the text readable against its background (4.5:1)?',
  'SG-RENDER-01': 'Is the spotlight gallery on the page?',
  'SG-RENDER-02': 'Counting the items in the spotlight gallery.',
  'SG-RENDER-03': 'Has anything in the spotlight gallery collapsed to nothing?',
  'SG-RENDER-04': 'Any raw "Translation missing:" text here?',
  'SG-RENDER-05': 'Any unfinished template code like {{ }} left in it?',
  'SG-MEDIA-01': 'Does every picture have text for screen readers?',
  'SG-MEDIA-02': 'Any broken-image icons in the spotlight gallery?',
  'SG-MEDIA-03': 'Are all the pictures still there?',
  'SG-LINK-01/03/04': 'Any links that go nowhere, are unsafe, or are empty?',
  'SG-LINK-02': 'Do the links actually go anywhere, or nowhere?',
  'SG-LINK-05': 'Opening every link — do those pages still exist?',
  'SG-LAYOUT-01': 'Does this section push the page sideways?',
  'SG-LAYOUT-02': 'Is anything spilling outside the section?',
  'SG-LAYOUT-03': 'Resizing 1440 → 1200 → 1024 → 768 → 390, checking it holds.',
  'SG-A11Y-01': 'Accessibility sweep of the spotlight gallery.',
  'SG-A11Y-02': 'Is the text readable against its background (4.5:1)?',
  'IG-RENDER-01': 'Is the image gallery on the page?',
  'IG-RENDER-02': 'Counting the items in the image gallery.',
  'IG-RENDER-03': 'Has anything in the image gallery collapsed to nothing?',
  'IG-RENDER-04': 'Any raw "Translation missing:" text here?',
  'IG-RENDER-05': 'Any unfinished template code like {{ }} left in it?',
  'IG-MEDIA-01': 'Does every picture have text for screen readers?',
  'IG-MEDIA-02': 'Any broken-image icons in the image gallery?',
  'IG-MEDIA-03': 'Are all the pictures still there?',
  'IG-LINK-01/03/04': 'Any links that go nowhere, are unsafe, or are empty?',
  'IG-LINK-02': 'Do the links actually go anywhere, or nowhere?',
  'IG-LINK-05': 'Opening every link — do those pages still exist?',
  'IG-LAYOUT-01': 'Does this section push the page sideways?',
  'IG-LAYOUT-02': 'Is anything spilling outside the section?',
  'IG-LAYOUT-03': 'Resizing 1440 → 1200 → 1024 → 768 → 390, checking it holds.',
  'IG-A11Y-01': 'Accessibility sweep of the image gallery.',
  'IG-A11Y-02': 'Is the text readable against its background (4.5:1)?',

  // ── Placeholder copy left in production ────────────────────
  'FAQT-CONTENT-01': 'Is the leftover "Add a description here" placeholder still showing?',
  'TS-CONTENT-05': 'Is the leftover "Add a description here" placeholder still showing?',
  'BL-CONTENT-01': 'Is the leftover "Add a description here" placeholder still showing?',
  'MQ-CONTENT-01': 'Is the leftover "Add a description here" placeholder still showing?',
  'NC-CONTENT-01': 'Is the leftover "Add a description here" placeholder still showing?',
  'IWT-CONTENT-01': 'Is the leftover "Add a description here" placeholder still showing?',
  'IB-CONTENT-01': 'Is the leftover "Add a description here" placeholder still showing?',
  'GB-CONTENT-01': 'Is the leftover "Add a description here" placeholder still showing?',
  'NL-CONTENT-01': 'Is the leftover "Add a description here" placeholder still showing?',
  'SPEC-CONTENT-01': 'Is the leftover "Add a description here" placeholder still showing?',
  'GS-CONTENT-01': 'Is the leftover "Add a description here" placeholder still showing?',
  'SG-CONTENT-01': 'Is the leftover "Add a description here" placeholder still showing?',
  'IG-CONTENT-01': 'Is the leftover "Add a description here" placeholder still showing?',

  // ── Comparison sliders ─────────────────────────────────────
  'IC-RENDER-01': 'Is the image comparison section on the page?',
  'IC-RENDER-02': 'Counting the comparison sliders.',
  'IC-RENDER-03': 'Does every slider have a divider you can drag?',
  'IC-RENDER-04': 'Has any slider collapsed to nothing?',
  'IC-RENDER-05': 'Any raw "Translation missing:" text here?',
  'IC-RENDER-06': 'Is the leftover "Add a description here" placeholder still showing?',
  'IC-CONTENT-01': 'Are both halves labelled Before and After?',
  'IC-DRAG-01': 'Dragging the divider — does the second image appear?',
  'IC-DRAG-02': 'Dragging it back — does it work both ways?',
  'IC-MEDIA-01': 'Does every photo have text for screen readers?',
  'IC-MEDIA-02': 'Any broken-image icons here?',
  'IC-A11Y-01': 'It says it is a slider — does it say where it sits?',
  'IC-A11Y-02': 'Can you move the divider with the keyboard alone?',
  'IC-A11Y-03': 'Accessibility sweep of the image comparison section.',
  'IC-A11Y-04': 'Are the Before/After labels readable over the photos?',
  'IC-LINK-01': 'Do the links actually go anywhere?',
  'IC-LINK-02': 'Any links that are unsafe or empty?',
  'IC-LAYOUT-01': 'Does this section push the page sideways?',
  'IC-LAYOUT-02': 'Resizing 1440 → 1200 → 1024 → 768 → 390, checking it holds.',
  'BA-RENDER-01': 'Is the before/after section on the page?',
  'BA-RENDER-02': 'Counting the comparison sliders.',
  'BA-RENDER-03': 'Does every slider have a divider you can drag?',
  'BA-RENDER-04': 'Has any slider collapsed to nothing?',
  'BA-RENDER-05': 'Any raw "Translation missing:" text here?',
  'BA-RENDER-06': 'Is the leftover "Add a description here" placeholder still showing?',
  'BA-CONTENT-01': 'Are both halves labelled Before and After?',
  'BA-DRAG-01': 'Dragging the divider — does the second image appear?',
  'BA-DRAG-02': 'Dragging it back — does it work both ways?',
  'BA-MEDIA-01': 'Does every photo have text for screen readers?',
  'BA-MEDIA-02': 'Any broken-image icons here?',
  'BA-A11Y-01': 'It says it is a slider — does it say where it sits?',
  'BA-A11Y-02': 'Can you move the divider with the keyboard alone?',
  'BA-A11Y-03': 'Accessibility sweep of the before/after section.',
  'BA-A11Y-04': 'Are the Before/After labels readable over the photos?',
  'BA-LINK-01': 'Do the links actually go anywhere?',
  'BA-LINK-02': 'Any links that are unsafe or empty?',
  'BA-LAYOUT-01': 'Does this section push the page sideways?',
  'BA-LAYOUT-02': 'Resizing 1440 → 1200 → 1024 → 768 → 390, checking it holds.',
  'BA-PRODUCT-01': 'Does the buy button have anything written on it?',
  'BA-PRODUCT-02': 'Opening every product page — do they still exist?',

  // ── Video banner ───────────────────────────────────────────
  'VB-RENDER-01': 'Is the video banner on the page?',
  'VB-RENDER-02': 'Is there actually a video in it?',
  'VB-RENDER-03': 'Any raw "Translation missing:" text here?',
  'VB-RENDER-04': 'Is the leftover "Add a description here" placeholder still showing?',
  'VB-MEDIA-01': 'Is the video muted? (browsers block sound from autoplaying)',
  'VB-MEDIA-02': 'Will it play inline on a phone, or hijack the screen?',
  'VB-MEDIA-03': 'Is there a still image to show before the video loads?',
  'VB-MEDIA-04': 'Does that still image have text for screen readers?',
  'VB-MEDIA-05': 'Is the video actually playing, or frozen on one frame?',
  'VB-CONTENT-01': 'Does every button have something written on it?',
  'VB-LINK-01/03/04': 'Any links that go nowhere, are unsafe, or are empty?',
  'VB-LAYOUT-01': 'Does this section push the page sideways?',
  'VB-LAYOUT-02': 'Resizing 1440 → 1200 → 1024 → 768 → 390, checking it holds.',
  'VB-A11Y-01': 'Accessibility sweep of the video banner.',
  'VB-A11Y-02': 'Is text over the video readable (4.5:1)?',

  // ── Shoppable video ────────────────────────────────────────
  'SV-RENDER-01': 'Is the shoppable video row on the page?',
  'SV-RENDER-02': 'Counting the video cards.',
  'SV-RENDER-03': 'Does every card actually have a video?',
  'SV-RENDER-04': 'Has any video card collapsed to nothing?',
  'SV-RENDER-05': 'Any raw "Translation missing:" text here?',
  'SV-RENDER-06': 'Is the leftover "Add a description here" placeholder still showing?',
  'SV-MEDIA-01': 'Are all the videos muted?',
  'SV-MEDIA-02': 'Will they play inline on a phone?',
  'SV-MEDIA-03': 'Does every video have a still image to show first?',
  'SV-MEDIA-04': 'Does every picture have text for screen readers?',
  'SV-MEDIA-05': 'Any broken-image icons in the row?',
  'SV-CTRL-01': 'Does every card have play and mute buttons?',
  'SV-CTRL-02': 'Would a screen reader know what those buttons do?',
  'SV-CTRL-03': 'Pressing play — does the video actually respond?',
  'SV-PRODUCT-01': 'Does every video link to the product it is selling?',
  'SV-PRODUCT-02': 'Does every card show a price?',
  'SV-PRODUCT-03': 'Opening every product page — do they all still exist?',
  'SV-LINK-01/03/04': 'Any links that go nowhere, are unsafe, or are empty?',
  'SV-NAV-01': 'Clicking next — do more videos slide into view?',
  'SV-LAYOUT-01': 'Does this section push the page sideways?',
  'SV-LAYOUT-02': 'Is any card spilling outside the section?',
  'SV-A11Y-01': 'Accessibility sweep of the shoppable video row.',
  'SV-A11Y-02': 'Is the product text over video readable (4.5:1)?',

  // ── Featured collection ────────────────────────────────────
  'FC-RENDER-01': 'Is the product row on the page?',
  'FC-RENDER-02': 'Counting the product cards in the row.',
  'FC-RENDER-03': 'Has any product card collapsed to nothing?',
  'FC-RENDER-04': 'Any raw "Translation missing:" text here?',
  'FC-RENDER-05': 'Is the leftover "Add a description here" placeholder still showing?',
  'FC-RENDER-06': 'Any misspelled class names shipped in the markup?',
  'FC-CARD-01': 'Does every product show its name?',
  'FC-CARD-02': 'Does every card link to its product page?',
  'FC-CARD-03': 'Does every product have a picture?',
  'FC-CARD-04': 'Does every product picture have text for screen readers?',
  'FC-CARD-05': 'Any broken-image icons among the products?',
  'FC-CARD-06': 'Is the same product listed twice in one row?',
  'FC-PRICE-01': 'Does every product show a price at all?',
  'FC-PRICE-02': 'Is the price actually visible, or squashed to nothing?',
  'FC-PRICE-03': 'Does the price show a real number?',
  'FC-LINK-01/03/04': 'Any links that go nowhere, are unsafe, or are empty?',
  'FC-LINK-02': 'Opening every product page — do they all still exist?',
  'FC-NAV-01': 'Clicking next — do more products slide into view?',
  'FC-LAYOUT-01': 'Does this section push the page sideways?',
  'FC-LAYOUT-02': 'Is any card content spilling outside the row?',
  'FC-LAYOUT-03': 'Resizing 1440 → 1200 → 1024 → 768 → 390, checking it holds.',
  'FC-A11Y-01': 'Accessibility sweep of the product row.',
  'FC-A11Y-02': 'Is the text readable against its background (4.5:1)?',

  // ── FAQ with tabs ──────────────────────────────────────────
  'FAQT-RENDER-01': 'Is the tabbed FAQ section on the page?',
  'FAQT-RENDER-02': 'Counting the tabs across the top.',
  'FAQT-RENDER-03': 'Is there a panel behind every tab?',
  'FAQT-RENDER-04': 'Counting the questions inside each tab.',
  'FAQT-RENDER-05': 'Any raw "Translation missing:" text here?',
  'FAQT-RENDER-06': 'Any unfinished template code like {{ }} left in it?',
  'FAQT-RENDER-07': 'Has any tab collapsed to nothing?',
  'FAQT-TAB-01': 'On load — is exactly one tab switched on?',
  'FAQT-TAB-02': 'Is only ONE panel showing, not all of them at once?',
  'FAQT-TAB-03': 'Clicking each tab — does its own questions appear?',
  'FAQT-TAB-04': 'Going back to tab 1 — does it come back properly?',
  'FAQT-TAB-05': 'Does every tab have a readable label?',
  'FAQT-TAB-06': 'Does the panel heading match the tab you clicked?',
  'FAQT-TAB-07': 'Pressing the arrow key — does it move to the next tab?',
  'FAQT-TAB-08': 'Can you reach and press a tab with the keyboard?',
  'FAQT-ACC-01': 'Does each tab open with one answer already showing?',
  'FAQT-ACC-02': 'Clicking a question inside a tab — does it open?',
  'FAQT-ACC-03': 'Does opening one answer close the previous one?',
  'FAQT-ALIGN-01': 'Is the +/- icon level with its question?',
  'FAQT-ALIGN-02': 'Do all the +/- icons line up down the right edge?',
  'FAQT-LINK-01/03/04': 'Any links that go nowhere, are unsafe, or are empty?',
  'FAQT-LAYOUT-01': 'Does this section push the page sideways?',
  'FAQT-LAYOUT-02': 'Is the open panel spilling outside the section?',
  'FAQT-LAYOUT-03': 'Resizing 1440 → 1200 → 1024 → 768 → 390, checking it holds.',
  'FAQT-A11Y-01': 'Does each tab say which panel it opens?',
  'FAQT-A11Y-02': 'After switching, is the right tab marked as selected?',
  'FAQT-A11Y-03': 'Accessibility sweep of the tabbed FAQ.',
  'FAQT-A11Y-04': 'Is the text readable against its background (4.5:1)?',

  // ── FAQ accordion ──────────────────────────────────────────
  'FAQ-RENDER-01': 'Is the FAQ section on the page?',
  'FAQ-RENDER-02': 'Counting the questions in the list.',
  'FAQ-RENDER-03': 'Has any question row collapsed to nothing?',
  'FAQ-RENDER-04': 'Any raw "Translation missing:" text here?',
  'FAQ-RENDER-05': 'Any unfinished template code like {{ }} left in it?',
  'FAQ-CONTENT-01': 'Does every row actually show a question?',
  'FAQ-CONTENT-02': 'Does every question have an answer inside it?',
  'FAQ-CONTENT-03': 'Is the same question listed twice?',
  'FAQ-ACC-01': 'On load — is exactly one answer showing?',
  'FAQ-ACC-02': 'Clicking a closed question — does it open?',
  'FAQ-ACC-03': 'Clicking the open question — does it close again?',
  'FAQ-ACC-04': 'Opening a second question — does the first one close?',
  'FAQ-ACC-05': 'Pressing Enter on a question — does it open?',
  'FAQ-ACC-06': 'Can you reach the question with the keyboard at all?',
  'FAQ-ALIGN-01': 'Is the +/- icon level with its question, or riding high?',
  'FAQ-ALIGN-02': 'Do all the +/- icons line up down the right edge?',
  'FAQ-ALIGN-03': 'Does every question start at the same left edge?',
  'FAQ-CTA-01': 'Is the help button there?',
  'FAQ-CTA-02': 'Clicking the help button — does it actually go anywhere?',
  'FAQ-CTA-03': 'Is the help button on the LEFT side, with the copy?',
  'FAQ-STICKY-01': 'Scrolling the questions — does the left panel stay put?',
  'FAQ-LINK-01/03/04': 'Any links that go nowhere, are unsafe, or are empty?',
  'FAQ-LAYOUT-01': 'Does this section push the page sideways?',
  'FAQ-LAYOUT-02': 'With every answer open — does any text spill out?',
  'FAQ-LAYOUT-03': 'Resizing 1440 → 1200 → 1024 → 768 → 390, checking it holds.',
  'FAQ-A11Y-01': 'Accessibility sweep of the FAQ.',
  'FAQ-A11Y-02': 'Is the text readable against its background (4.5:1)?',

  // ── Footer ─────────────────────────────────────────────────
  'FT-RENDER-01': 'Is the footer there at the bottom of the page?',
  'FT-RENDER-02': 'Are all the footer link columns showing?',
  'FT-RENDER-03': 'Does each column still have all its links?',
  'FT-RENDER-04': 'Does every column have a heading above it?',
  'FT-RENDER-05': 'Any raw "Translation missing:" text down here?',
  'FT-RENDER-06': 'Any un-finished template code like {{ }} left in the page?',
  'FT-RENDER-07': 'Has any footer column collapsed to nothing?',
  'FT-RENDER-08': 'Reloading and listening for JavaScript errors.',
  'FT-LINK-01/03/04': 'Any footer links that go nowhere, are unsafe, or are empty?',
  'FT-LINK-02': 'Opening every footer link — do those pages still exist?',
  'FT-LINK-06': 'Do the footer links actually go anywhere, or nowhere?',
  'FT-LINK-05': 'Can you actually see the words on every footer link?',
  'FT-ACC-01': 'On a wide screen, are the footer menus already open?',
  'FT-ACC-02': 'On a phone, does tapping a heading open that menu?',
  'FT-ACC-03': 'Can you open a footer menu using just the keyboard?',
  'FT-NEWS-01': 'Is the email signup box there?',
  'FT-NEWS-02': 'Is it a proper email field (right keyboard on phones)?',
  'FT-NEWS-03': 'Would a screen reader know what to type in that box?',
  'FT-NEWS-04': 'The arrow button — does it have a name, or is it just "button"?',
  'FT-NEWS-05': 'Typing bad addresses — do they all get rejected?',
  'FT-NEWS-06': 'Leaving it empty — can you still submit?',
  'FT-NEWS-07': 'Typing a REAL address — is it accepted?',
  'FT-NEWS-08': 'Will phones offer to fill in your email here?',
  'FT-ALIGN-01': 'Do the column headings all sit on the same line?',
  'FT-ALIGN-02': 'Do all links in a column start at the same edge?',
  'FT-ALIGN-03': 'Are the columns the same width as each other?',
  'FT-ALIGN-04': 'Is the arrow button centred inside the email box?',
  'FT-ALIGN-05': 'Is the button label centred inside the button?',
  'FT-ALIGN-06': 'Is any footer text cut off instead of wrapping?',
  'FT-BRAND-01': 'Is the brand block (logo / about text) in the footer?',
  'FT-BRAND-02': 'Does the footer logo have text for screen readers?',
  'FT-SOCIAL-01': 'Are the social media icons all there?',
  'FT-SOCIAL-02': 'Do the social icons have names and real links?',
  'FT-LAYOUT-01': 'Does the footer push the page sideways?',
  'FT-LAYOUT-02': 'Is any link text spilling outside its column?',
  'FT-LAYOUT-03': 'Resizing 1440 → 1200 → 1024 → 768 → 390, checking it holds.',
  'FT-A11Y-01': 'Accessibility sweep of the footer for critical problems.',
  'FT-A11Y-02': 'Is footer text readable against its background (4.5:1)?',
  'FT-A11Y-03': 'Can screen readers jump straight to the footer?',

  // ── Header (logo, icons, navigation, search) ───────────────
  'HD-LOGO-01': 'Is the store logo actually showing in the header?',
  'HD-LOGO-02': 'Does clicking the logo take you back to the home page?',
  'HD-LOGO-03': 'Did the logo image really load, or is it a broken picture?',
  'HD-LOGO-04': 'If the logo fails to load, is there text a screen reader can read?',
  'HD-LOGO-05': 'Would a screen reader say more than just "link" for the logo?',
  'HD-LOGO-06': 'Testing a very long store name — does the header break?',
  'HD-ASSET-01': 'Is the logo the file type expected (transparent background)?',
  'HD-ASSET-02': 'Is the logo squashed or stretched out of shape?',
  'HD-ASSET-03': 'Does the logo stay a sensible size on phone and desktop?',
  'HD-ASSET-04': 'Is the logo sitting inside the header, not poking out of it?',
  'HD-ICON-01': 'Is the search icon there, and can a screen reader name it?',
  'HD-ICON-02': 'Is the account icon there and usable?',
  'HD-ICON-03': 'Does the cart icon point at /cart and have a proper name?',
  'HD-ICON-04': 'Does the cart show a number badge for how many items?',
  'HD-ICON-05': 'Clicking the cart — does it really open the cart page?',
  'HD-NAV-01': 'Is the menu showing, with at least the expected number of items?',
  'HD-NAV-02': 'Any menu titles blank or cut off with "..."?',
  'HD-NAV-03': 'Clicking Home — does it go to the home page?',
  'HD-NAV-04': 'Clicking the blog link — does it reach the blog?',
  'HD-STRUCT-01': 'Are there plain one-level menu links that work?',
  'HD-STRUCT-02': 'Does the menu have a second level (dropdowns)?',
  'HD-STRUCT-03': 'Does the menu go three levels deep?',
  'HD-STRUCT-04': 'Checking every level — is any menu title visually chopped off?',
  'HD-STRUCT-05': 'A long menu (10+ items) — does it still fit and behave?',
  'HD-MEGA-01': 'Is there a mega menu (the big multi-column dropdown)?',
  'HD-MEGA-02': 'Hovering the mega menu — does the panel actually open?',
  'HD-MEGA-03': 'Does the mega-menu panel contain real product links?',
  'HD-RESP-01': 'On desktop: full menu visible, hamburger hidden?',
  'HD-RESP-02': 'On mobile: hamburger visible, full menu hidden?',
  'HD-RESP-03': 'Tapping the hamburger — does the drawer slide open?',
  'HD-RESP-04': 'Inside the drawer — do sub-menus expand when tapped?',
  'HD-RESP-05': 'Resizing across every screen size — does the header survive?',
  'HD-SEARCH-01': 'Clicking search — does a box open ready to type in?',
  'HD-SEARCH-02': 'Typing a word — does the box keep what you typed?',
  'HD-SEARCH-03': 'Searching for nothing — does it wrongly leave the store?',
  'HD-A11Y-01': 'Accessibility sweep of the header for critical problems.',
  'HD-A11Y-02': 'Does every header button have a name a screen reader can read?',
  'HD-A11Y-03': 'Can you reach and open search with the keyboard alone?',
  'HD-EDGE-01': 'Scrolling down — does the header stay stuck to the top?',
  'HD-EDGE-02': 'Loading the page and listening for JavaScript errors.',
  'HD-EDGE-03': 'Do placeholder menu links keep you on this store?',

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
