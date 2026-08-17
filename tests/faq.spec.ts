// tests/faq.spec.ts
// ─────────────────────────────────────────────────────────────
// FAQ accordion suite.
//
//              khajal   doll   dense
//   questions  4        6      4
//   at load    first question open on all three
//   behaviour  one open at a time on all three
//
// The accordion is the whole point of this section, so most of the
// suite drives it: open, close, open a second one, do it all from the
// keyboard. A FAQ that renders perfectly but will not open is
// useless, and nothing above the fold would reveal that.
//
// dense also ships a `faq_with_tabs` section. It is NOT covered here —
// it has its own tab strip and belongs with the interactive sections.
// The root selector excludes it explicitly.
// ─────────────────────────────────────────────────────────────

import { test, expect } from '../utils/fixtures';
import AxeBuilder from '@axe-core/playwright';
import { FaqPage } from '../pages/FaqPage.js';
import { rootSelector } from '../utils/simple-sections.js';
import { mountNarrator, spot, spotVerdicts } from '../utils/demo-hud.js';
import { checksFor } from '../utils/slideshow-checks.js';

const { assertRenderHealth, expectNoMissingTranslations, assertNoDeadOrUnsafeLinks,
        assertNoPageOverflow, assertContentInsideBox } = checksFor('FAQ');

test.describe('FAQ', () => {
  let faq: FaqPage;

  test.skip(({ preset }) => !(preset.sections?.faq > 0),
    'This preset does not ship an FAQ section.');

  test.beforeEach(async ({ page, preset }, testInfo) => {
    faq = new FaqPage(page, preset);
    await mountNarrator(page, {
      title: testInfo.title,
      preset: preset.key,
      spotlight: rootSelector('faq'),
    });
    await faq.open();
  });

  // ===========================================================
  // 1. Render & structure
  // ===========================================================
  test.describe('Render & structure', () => {

    test('FAQ-RENDER-01 — the section is present and visible', async ({ preset }) => {
      await spot(faq.roots());
      expect(
        await faq.roots().count(),
        `FAQ-RENDER-01 / count: ${preset.label} should render ` +
          `${preset.sections.faq} FAQ section(s).`
      ).toBe(preset.sections.faq);
      await expect(faq.root()).toBeVisible();
    });

    test('FAQ-RENDER-02 — it holds the expected number of questions', async ({ preset }) => {
      await spot(faq.items());
      expect(
        await faq.count(),
        `FAQ-RENDER-02 / count: ${preset.label} should list ` +
          `${preset.faq!.questions} question(s) but lists ${await faq.count()}. ` +
          `A question quietly disappearing is exactly what this catches.`
      ).toBe(preset.faq!.questions);
    });

    test('FAQ-RENDER-03 — no question row has collapsed', async () => {
      await assertRenderHealth(faq.items(), { minHeight: 24 });
    });

    test('FAQ-RENDER-04 — no missing translation keys', async () => {
      await spot(faq.root());
      await expectNoMissingTranslations(faq.root());
    });

    test('FAQ-RENDER-05 — no raw Liquid reached the browser', async () => {
      await spot(faq.root());
      const leaks = await faq.root().evaluate((el) => {
        const out: string[] = [];
        for (const node of el.querySelectorAll('*')) {
          for (const attr of node.attributes) {
            if (/\{\{|\{%/.test(attr.value)) {
              out.push(`<${node.tagName.toLowerCase()} ${attr.name}="${attr.value.slice(0, 60)}">`);
            }
          }
        }
        return out;
      });
      expect(
        leaks,
        `FAQ-RENDER-05 / liquid-leak: un-rendered Liquid is present:\n  ${leaks.join('\n  ')}`
      ).toEqual([]);
    });
  });

  // ===========================================================
  // 2. Content
  // ===========================================================
  test.describe('Content', () => {

    test('FAQ-CONTENT-01 — every question has text', async () => {
      const questions = await faq.questionTexts();
      const verdicts = questions.map((q) => q.length > 0);
      await spotVerdicts(faq.questions(), verdicts);

      const empty = questions.map((q, i) => (q ? null : i + 1)).filter(Boolean);
      expect(
        empty,
        `FAQ-CONTENT-01 / empty-question: question row(s) ${empty.join(', ')} render no ` +
          `text. A blank row that expands to an answer is baffling to a shopper.`
      ).toEqual([]);
    });

    test('FAQ-CONTENT-02 — every question has an answer', async () => {
      const answers = await faq.answerTexts();
      const verdicts = answers.map((a) => a.length > 0);
      await spotVerdicts(faq.answers(), verdicts);

      const empty = answers.map((a, i) => (a ? null : i + 1)).filter(Boolean);
      expect(
        empty,
        `FAQ-CONTENT-02 / empty-answer: question(s) ${empty.join(', ')} expand to nothing. ` +
          `The shopper clicks, the row opens, and there is no answer inside.`
      ).toEqual([]);
    });

    test('FAQ-CONTENT-03 — no question is asked twice', async () => {
      const questions = await faq.questionTexts();
      const seen = new Map<string, number>();
      for (const q of questions) if (q) seen.set(q, (seen.get(q) ?? 0) + 1);

      const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([q, n]) => `"${q}" ×${n}`);
      expect(
        dupes,
        `FAQ-CONTENT-03 / duplicate: the same question appears more than once: ` +
          `${dupes.join(', ')}.`
      ).toEqual([]);
    });
  });

  // ===========================================================
  // 3. Accordion behaviour — the reason this section exists
  // ===========================================================
  test.describe('Accordion', () => {

    test('FAQ-ACC-01 — exactly one answer is open at load', async ({ preset }) => {
      await spot(faq.items());
      const states = await faq.openStates();
      await spotVerdicts(faq.items(), states.map((s, i) => (i === 0 ? s : !s)));

      expect(
        states.filter(Boolean).length,
        `FAQ-ACC-01 / initial-state: ${states.filter(Boolean).length} answer(s) are open ` +
          `when the page loads, expected exactly 1. All three stores open the first ` +
          `question so the section does not look like a wall of blank rows.`
      ).toBe(1);

      expect(
        states[0],
        `FAQ-ACC-01 / wrong-one: the open answer at load is not the first question.`
      ).toBe(true);
    });

    test('FAQ-ACC-02 — clicking a closed question opens it', async () => {
      await spot(faq.trigger(1));
      expect(
        await faq.isOpen(1),
        `FAQ-ACC-02 / precondition: question 2 was expected to start closed.`
      ).toBe(false);

      await faq.toggle(1);

      expect(
        await faq.isOpen(1),
        `FAQ-ACC-02 / no-open: clicking question 2 did not open it. The answers are ` +
          `unreachable — every question in the list is dead.`
      ).toBe(true);

      expect(
        await faq.answerHasHeight(1),
        `FAQ-ACC-02 / no-height: question 2 is marked open but its answer has no height, ` +
          `so nothing appears on screen.`
      ).toBe(true);
    });

    test('FAQ-ACC-03 — clicking an open question closes it', async () => {
      await spot(faq.trigger(0));
      expect(
        await faq.isOpen(0),
        `FAQ-ACC-03 / precondition: question 1 was expected to start open.`
      ).toBe(true);

      await faq.toggle(0);

      expect(
        await faq.isOpen(0),
        `FAQ-ACC-03 / no-close: clicking the open question did not close it. Once a ` +
          `shopper opens an answer they can never collapse it again.`
      ).toBe(false);
    });

    test('FAQ-ACC-04 — opening one answer closes the other', async ({ preset }) => {
      test.skip(!preset.faq!.oneAtATime,
        'This preset allows more than one answer open at a time.');

      await faq.toggle(1);
      const states = await faq.openStates();
      await spotVerdicts(faq.items(), states.map((s, i) => (i === 1 ? s : !s)));

      expect(
        states.filter(Boolean).length,
        `FAQ-ACC-04 / multi-open: ${states.filter(Boolean).length} answers are open at ` +
          `once. This accordion is built to show one at a time — several open together ` +
          `means the closing logic has stopped running, and the section grows very tall.`
      ).toBe(1);

      expect(
        states[1],
        `FAQ-ACC-04 / wrong-one: question 2 was clicked but is not the one left open.`
      ).toBe(true);
    });

    test('FAQ-ACC-05 — a question can be opened from the keyboard', async () => {
      await spot(faq.trigger(1));
      const before = await faq.isOpen(1);
      await faq.pressOn(1, 'Enter');

      expect(
        await faq.isOpen(1),
        `FAQ-ACC-05 / keyboard: pressing Enter on the focused question did not toggle it. ` +
          `Native <details> gives this for free — losing it means the theme has overridden ` +
          `the default behaviour with JavaScript and not restored keyboard support.`
      ).not.toBe(before);
    });

    test('FAQ-ACC-06 — the trigger is reachable by keyboard', async ({ page }) => {
      await spot(faq.trigger(0));
      const focusable = await faq.trigger(0).evaluate((el) => {
        el.focus();
        return document.activeElement === el || el.contains(document.activeElement);
      });
      expect(
        focusable,
        `FAQ-ACC-06 / not-focusable: the question row cannot take keyboard focus, so a ` +
          `keyboard-only shopper can never reach the answers.`
      ).toBe(true);
    });
  });

  // ===========================================================
  // 3b. Icon alignment
  // ===========================================================
  // Regression guards. Every icon is dead-level with its question
  // today on all three stores — measured, not assumed — so these lock
  // that in rather than inventing a standard.
  test.describe('Alignment', () => {

    test('FAQ-ALIGN-01 — the +/- icon is level with its question', async () => {
      const rows = await faq.iconAlignment();
      const verdicts = rows.map((r) => r.offsetY <= 2);
      await spotVerdicts(faq.items(), verdicts);

      const off = rows
        .filter((r) => r.offsetY > 2)
        .map((r) => `Q${r.q} is ${Math.round(r.offsetY)}px out`);
      expect(
        off,
        `FAQ-ALIGN-01 / icon-misaligned: ${off.join(', ')}. The +/- icon should sit dead ` +
          `level with the question text. An icon riding high or low is the most visible ` +
          `way an accordion looks unfinished.`
      ).toEqual([]);
    });

    test('FAQ-ALIGN-02 — every icon shares the same right edge', async () => {
      const rows = await faq.iconAlignment();
      const edges = rows.map((r) => Math.round(r.iconRight));
      const spread = Math.max(...edges) - Math.min(...edges);

      expect(
        spread,
        `FAQ-ALIGN-02 / ragged-icons: the +/- icons end at ${[...new Set(edges)].join(', ')}px — ` +
          `a ${spread}px spread. They form a vertical line down the right of the list; one ` +
          `sitting further in breaks it.`
      ).toBeLessThanOrEqual(2);
    });

    test('FAQ-ALIGN-03 — every question starts at the same left edge', async () => {
      const rows = await faq.iconAlignment();
      const edges = rows.map((r) => Math.round(r.headLeft));
      const spread = Math.max(...edges) - Math.min(...edges);

      expect(
        spread,
        `FAQ-ALIGN-03 / ragged-questions: question text starts at ` +
          `${[...new Set(edges)].join(', ')}px — a ${spread}px spread. Every question ` +
          `should begin at the same x position.`
      ).toBeLessThanOrEqual(2);
    });
  });

  // ===========================================================
  // 3c. Help CTA and the sticky column
  // ===========================================================
  test.describe('Help CTA & sticky column', () => {

    test('FAQ-CTA-01 — the help button is present', async ({ preset }) => {
      test.skip(!preset.faq!.cta, 'This preset ships no CTA in its FAQ section.');
      await spot(faq.cta());
      await expect(faq.cta()).toBeVisible();

      const info = await faq.ctaInfo();
      expect(
        info?.text,
        `FAQ-CTA-01 / label: the FAQ call-to-action should read ` +
          `"${preset.faq!.ctaLabel}".`
      ).toBe(preset.faq!.ctaLabel);
    });

    test('FAQ-CTA-02 — the help button actually goes somewhere', async ({ page, preset }) => {
      test.skip(!preset.faq!.cta, 'This preset ships no CTA in its FAQ section.');
      await spot(faq.cta());
      const info = await faq.ctaInfo();
      const href = info?.href ?? null;

      expect(
        href && href !== '#' && href.trim() !== '',
        `FAQ-CTA-02 / dead-button: the "${info?.text}" button has href="${href}", so ` +
          `clicking it does nothing at all. It looks like a working button — the pointer ` +
          `changes, it has a border and a label — but a shopper who needs help and presses ` +
          `it gets no response whatsoever.`
      ).toBe(true);

      const url = new URL(href!, page.url()).toString();
      const res = await page.request.get(url, { failOnStatusCode: false });
      expect(
        res.status(),
        `FAQ-CTA-02 / dead-link: "${info?.text}" points at ${url}, which returns ` +
          `${res.status()}.`
      ).toBeLessThan(400);
    });

    test('FAQ-CTA-03 — the help button sits in the left content column', async ({ preset }) => {
      test.skip(!preset.faq!.cta, 'This preset ships no CTA in its FAQ section.');
      const info = await faq.ctaInfo();
      test.skip(!info?.hasContentCol, 'This preset has no separate content column.');
      await spot(faq.cta());

      expect(
        info!.inContentCol,
        `FAQ-CTA-03 / wrong-column: the "${info!.text}" button renders in the RIGHT ` +
          `(questions) column, starting at x=${Math.round(info!.box.left)}. The section is ` +
          `built as copy-and-CTA on the left, questions on the right — doll places the same ` +
          `button on the left. Here it has landed among the questions instead.`
      ).toBe(true);
    });

    test('FAQ-STICKY-01 — the left column stays in view while questions scroll', async ({ preset }) => {
      test.skip(!preset.faq!.stickyColumn,
        'This preset does not use a sticky content column.');

      const s = await faq.stickyBehaviour();
      await spot(faq.contentCol());

      expect(
        s?.declared,
        `FAQ-STICKY-01 / not-declared: the content column is position:${s?.declared}, ` +
          `expected sticky.`
      ).toBe('sticky');

      // If sticky is working, the column resists the scroll: it should
      // move far less than the distance scrolled.
      expect(
        s!.moved,
        `FAQ-STICKY-01 / not-sticking: the column is declared ` +
          `position:sticky; top:${s!.stickyTop}, but scrolling ${s!.scrolledBy}px moved it ` +
          `${s!.moved}px — it simply scrolled away with the page.\n` +
          `Why: the column is ${Math.round(s!.colHeight)}px tall inside a ` +
          `${Math.round(s!.containerHeight)}px container, leaving ${s!.slack}px of room to ` +
          `travel. A sticky element stretched to its container's full height has nothing to ` +
          `stick against, so the rule never takes effect. Usually fixed with ` +
          `align-self: flex-start on the column.`
      ).toBeLessThan(s!.scrolledBy * 0.6);
    });
  });

  // ===========================================================
  // 4. Links, layout, accessibility
  // ===========================================================
  test.describe('Links & layout', () => {

    test('FAQ-LINK-01/03/04 — no dead, unsafe or unlabelled links', async () => {
      await spot(faq.root());
      await assertNoDeadOrUnsafeLinks(faq.root());
    });

    test('FAQ-LAYOUT-01 — no horizontal page overflow', async ({ page }) => {
      await assertNoPageOverflow(page);
    });

    test('FAQ-LAYOUT-02 — answers stay inside the section', async () => {
      // Open every answer first: a collapsed one cannot overflow, so
      // measuring the closed state would prove nothing.
      const total = await faq.count();
      for (let i = 0; i < total; i++) {
        if (!(await faq.isOpen(i))) await faq.toggle(i);
        await assertContentInsideBox(faq.root(), faq.answers().nth(i), { onlyInView: true });
      }
    });

    test('FAQ-LAYOUT-03 — it holds across the viewport matrix', async ({ page }) => {
      for (const width of [1440, 1200, 1024, 768, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await faq.focus(0);
        await expect(
          faq.root(),
          `FAQ-LAYOUT-03 / breakpoint: the FAQ stopped being visible at ${width}px.`
        ).toBeVisible();
        await assertNoPageOverflow(page);
      }
    });
  });

  test.describe('Accessibility', () => {

    test('FAQ-A11Y-01 — no critical accessibility violations', async ({ page }) => {
      await spot(faq.root());
      const id = await faq.root().getAttribute('id');
      const results = await new AxeBuilder({ page })
        .include(`#${id}`)
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const critical = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );
      expect(
        critical.map((v) => `${v.id}: ${v.help} -> ${v.nodes[0]?.target?.join(' ')}`),
        `FAQ-A11Y-01 / axe: ${critical.length} critical violation(s).`
      ).toEqual([]);
    });

    test('FAQ-A11Y-02 — text contrast is at least 4.5:1', async ({ page }) => {
      const id = await faq.root().getAttribute('id');
      const results = await new AxeBuilder({ page })
        .include(`#${id}`)
        .withRules(['color-contrast'])
        .analyze();

      expect(
        results.violations.flatMap((v) => v.nodes.map((n) => n.target.join(' '))),
        `FAQ-A11Y-02 / contrast: FAQ text fails the 4.5:1 minimum.`
      ).toEqual([]);
    });
  });
});
