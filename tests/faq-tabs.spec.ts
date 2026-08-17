// tests/faq-tabs.spec.ts
// ─────────────────────────────────────────────────────────────
// Tabbed FAQ suite — a SEPARATE section from the plain FAQ.
//
// dense is the only preset that ships it, and dense ships BOTH:
//
//   y≈3953   faq_with_tabs   3 tabs, 4 questions each  ← this suite
//   y≈7263   faq             plain accordion, 4 questions
//
// Testing the tabbed section as if it were a plain accordion would
// miss everything that makes it different — the tab strip, the
// one-panel-at-a-time switching, and the fact that 8 of its 12
// questions are hidden behind tabs a shopper has to find.
//
// Two accessibility faults were visible before a single check was
// written, and both are asserted here rather than assumed:
//   * the tabs carry no aria-controls, so nothing connects a tab to
//     the panel it opens
//   * arrow keys do not move between tabs, which WAI-ARIA requires of
//     anything using role="tablist"
// ─────────────────────────────────────────────────────────────

import { test, expect } from '../utils/fixtures';
import AxeBuilder from '@axe-core/playwright';
import { FaqTabsPage } from '../pages/FaqTabsPage.js';
import { rootSelector } from '../utils/simple-sections.js';
import { mountNarrator, spot, spotVerdicts } from '../utils/demo-hud.js';
import { checksFor } from '../utils/slideshow-checks.js';

const { assertRenderHealth, expectNoMissingTranslations, assertNoDeadOrUnsafeLinks,
        assertNoPageOverflow, assertContentInsideBox,
        expectNoPlaceholderText } = checksFor('FAQT');

test.describe('FAQ with tabs', () => {
  let ft: FaqTabsPage;

  test.skip(({ preset }) => !(preset.sections?.faq_with_tabs > 0),
    'This preset does not ship a tabbed FAQ section.');

  test.beforeEach(async ({ page, preset }, testInfo) => {
    ft = new FaqTabsPage(page, preset);
    await mountNarrator(page, {
      title: testInfo.title,
      preset: preset.key,
      spotlight: rootSelector('faq_with_tabs'),
    });
    await ft.open();
  });

  // ===========================================================
  // 1. Render & structure
  // ===========================================================
  test.describe('Render & structure', () => {

    test('FAQT-RENDER-01 — the section is present and visible', async ({ preset }) => {
      await spot(ft.roots());
      expect(
        await ft.roots().count(),
        `FAQT-RENDER-01 / count: ${preset.label} should render ` +
          `${preset.sections.faq_with_tabs} tabbed FAQ section(s).`
      ).toBe(preset.sections.faq_with_tabs);
      await expect(ft.root()).toBeVisible();
    });

    test('FAQT-RENDER-02 — it has the expected number of tabs', async ({ preset }) => {
      await spot(ft.tabs());
      expect(
        await ft.tabCount(),
        `FAQT-RENDER-02 / tab-count: expected ${preset.faqTabs!.tabs} tab(s). ` +
          `A missing tab hides a whole group of questions with no other clue.`
      ).toBe(preset.faqTabs!.tabs);
    });

    test('FAQT-RENDER-03 — there is one panel per tab', async ({ preset }) => {
      const tabs = await ft.tabCount();
      const panels = await ft.panelCount();
      expect(
        panels,
        `FAQT-RENDER-03 / mismatch: ${tabs} tab(s) but ${panels} panel(s). ` +
          `A tab with no panel behind it does nothing when clicked.`
      ).toBe(tabs);
    });

    test('FAQT-RENDER-04 — each panel holds the expected questions', async ({ preset }) => {
      const counts = await ft.questionsPerPanel();
      expect(
        counts,
        `FAQT-RENDER-04 / question-count: panels hold [${counts.join(', ')}] question(s), ` +
          `expected [${preset.faqTabs!.questionsPerPanel.join(', ')}].`
      ).toEqual(preset.faqTabs!.questionsPerPanel);
    });

    test('FAQT-RENDER-05 — no missing translation keys', async () => {
      await spot(ft.root());
      await expectNoMissingTranslations(ft.root());
    });

    test('FAQT-RENDER-06 — no raw Liquid reached the browser', async () => {
      await spot(ft.root());
      const leaks = await ft.root().evaluate((el) => {
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
        `FAQT-RENDER-06 / liquid-leak: un-rendered Liquid is present:\n  ${leaks.join('\n  ')}`
      ).toEqual([]);
    });

    test('FAQT-CONTENT-01 — no theme placeholder text is left on the page', async () => {
      await expectNoPlaceholderText(ft.root());
    });

    test('FAQT-RENDER-07 — no tab or panel has collapsed', async () => {
      await assertRenderHealth(ft.tabs(), { minHeight: 20 });
    });
  });

  // ===========================================================
  // 2. Tab switching — the reason this section is different
  // ===========================================================
  test.describe('Tabs', () => {

    test('FAQT-TAB-01 — exactly one tab is active at load', async () => {
      await spot(ft.tabs());
      const active = await ft.activeTab();
      const total = await ft.tabCount();
      await spotVerdicts(ft.tabs(), Array.from({ length: total }, (_, i) => i === active));

      expect(
        active,
        `FAQT-TAB-01 / initial-state: no tab is marked selected at load, or more than ` +
          `one is. The first tab should start active so the section does not open empty.`
      ).toBe(0);
    });

    test('FAQT-TAB-02 — only one panel is showing at a time', async () => {
      const visible = await ft.visiblePanels();
      expect(
        visible,
        `FAQT-TAB-02 / multi-panel: ${visible.length} panels are showing at once ` +
          `(indices ${visible.join(', ')}). Tabs exist to show one group at a time — ` +
          `several at once means the hiding logic has stopped running and the section ` +
          `becomes a very long list.`
      ).toEqual([0]);
    });

    test('FAQT-TAB-03 — clicking a tab switches to its panel', async ({ preset }) => {
      const total = await ft.tabCount();

      for (let n = 1; n < total; n++) {
        await spot(ft.tab(n));
        await ft.selectTab(n);

        expect(
          await ft.activeTab(),
          `FAQT-TAB-03 / not-selected: clicking tab ${n + 1} did not mark it selected.`
        ).toBe(n);

        expect(
          await ft.visiblePanels(),
          `FAQT-TAB-03 / wrong-panel: clicking tab ${n + 1} should show panel ${n + 1} ` +
            `and hide the rest. Its questions are unreachable otherwise.`
        ).toEqual([n]);
      }
    });

    test('FAQT-TAB-04 — you can go back to the first tab', async () => {
      await ft.selectTab(2);
      await ft.selectTab(0);
      await spot(ft.tab(0));

      expect(
        await ft.visiblePanels(),
        `FAQT-TAB-04 / no-return: after moving away and back, the first panel is not the ` +
          `one showing.`
      ).toEqual([0]);
    });

    test('FAQT-TAB-05 — every tab has a visible label', async () => {
      const labels = await ft.tabTexts();
      const verdicts = labels.map((l) => l.length > 0);
      await spotVerdicts(ft.tabs(), verdicts);

      const blank = labels.map((l, i) => (l ? null : i + 1)).filter(Boolean);
      expect(
        blank,
        `FAQT-TAB-05 / unlabelled: tab(s) ${blank.join(', ')} show no text, so nobody can ` +
          `tell what is behind them.`
      ).toEqual([]);
    });

    test('FAQT-TAB-06 — each panel heading matches its tab', async () => {
      const labels = await ft.tabTexts();
      const headings = await ft.panelHeadingTexts();

      const mismatched = labels
        .map((l, i) => (headings[i] && l && headings[i] !== l ? `tab "${l}" opens "${headings[i]}"` : null))
        .filter(Boolean);
      expect(
        mismatched,
        `FAQT-TAB-06 / mismatch: ${mismatched.join('; ')}. The panel heading should repeat ` +
          `the tab label, so a shopper can see which group they are in.`
      ).toEqual([]);
    });

    test('FAQT-TAB-07 — arrow keys move between tabs', async () => {
      await spot(ft.tablist());
      const before = await ft.activeTab();
      await ft.pressOnTab(0, 'ArrowRight');

      expect(
        await ft.activeTab(),
        `FAQT-TAB-07 / no-arrow-keys: pressing ArrowRight on the focused tab did not move ` +
          `to the next one (still tab ${before + 1}).\n` +
          `Anything using role="tablist" is required to support arrow-key navigation — it ` +
          `is how screen-reader and keyboard-only users move through a tab strip. Without ` +
          `it they can reach the tabs but not browse them the expected way.`
      ).not.toBe(before);
    });

    test('FAQT-TAB-08 — tabs can be operated by keyboard', async ({ page }) => {
      await spot(ft.tab(1));
      await ft.tab(1).focus();

      const focused = await ft.tab(1).evaluate((el) => document.activeElement === el);
      expect(
        focused,
        `FAQT-TAB-08 / not-focusable: the tab cannot take keyboard focus at all.`
      ).toBe(true);

      await page.keyboard.press('Enter');
      await ft.waitForPanel(1);
      expect(
        await ft.activeTab(),
        `FAQT-TAB-08 / no-enter: pressing Enter on the focused tab did not select it.`
      ).toBe(1);
    });
  });

  // ===========================================================
  // 3. The accordion inside each panel
  // ===========================================================
  test.describe('Questions within a tab', () => {

    test('FAQT-ACC-01 — each panel opens one question by default', async () => {
      const open = await ft.openPerPanel();
      const wrong = open.map((n, i) => (n === 1 ? null : `panel ${i + 1} has ${n} open`)).filter(Boolean);
      expect(
        wrong,
        `FAQT-ACC-01 / initial-state: ${wrong.join(', ')}. Each panel should show one ` +
          `answer when opened, so a freshly clicked tab is not a wall of blank rows.`
      ).toEqual([]);
    });

    test('FAQT-ACC-02 — a question inside the active tab opens', async () => {
      const item = ft.items(0).nth(1);
      await spot(ft.triggers(0).nth(1));

      expect(
        await item.evaluate((el) => el.hasAttribute('open')),
        `FAQT-ACC-02 / precondition: question 2 of panel 1 was expected to start closed.`
      ).toBe(false);

      await ft.toggleQuestion(0, 1);

      expect(
        await item.evaluate((el) => el.hasAttribute('open')),
        `FAQT-ACC-02 / no-open: clicking a question inside the active tab did not open it.`
      ).toBe(true);
    });

    test('FAQT-ACC-03 — one answer at a time within a panel', async () => {
      await ft.toggleQuestion(0, 1);
      const open = (await ft.openPerPanel())[0];
      expect(
        open,
        `FAQT-ACC-03 / multi-open: ${open} answers are open in the same panel. This ` +
          `accordion shows one at a time.`
      ).toBe(1);
    });

    test('FAQT-ALIGN-01 — the +/- icon is level with its question', async () => {
      const rows = await ft.iconAlignment(0);
      const verdicts = rows.map((r) => r.offsetY <= 2);
      await spotVerdicts(ft.items(0), verdicts);

      const off = rows.filter((r) => r.offsetY > 2).map((r) => `Q${r.q} is ${Math.round(r.offsetY)}px out`);
      expect(
        off,
        `FAQT-ALIGN-01 / icon-misaligned: ${off.join(', ')}. The +/- icon should sit dead ` +
          `level with the question text.`
      ).toEqual([]);
    });

    test('FAQT-ALIGN-02 — every icon shares the same right edge', async () => {
      const rows = await ft.iconAlignment(0);
      const edges = rows.map((r) => Math.round(r.iconRight));
      const spread = Math.max(...edges) - Math.min(...edges);
      expect(
        spread,
        `FAQT-ALIGN-02 / ragged-icons: icons end at ${[...new Set(edges)].join(', ')}px — ` +
          `a ${spread}px spread.`
      ).toBeLessThanOrEqual(2);
    });
  });

  // ===========================================================
  // 4. Layout & accessibility
  // ===========================================================
  test.describe('Layout & accessibility', () => {

    test('FAQT-LINK-01/03/04 — no dead, unsafe or unlabelled links', async () => {
      await spot(ft.root());
      await assertNoDeadOrUnsafeLinks(ft.root());
    });

    test('FAQT-LAYOUT-01 — no horizontal page overflow', async ({ page }) => {
      await assertNoPageOverflow(page);
    });

    test('FAQT-LAYOUT-02 — the active panel stays inside the section', async () => {
      await assertContentInsideBox(ft.root(), ft.panel(0), { onlyInView: true });
    });

    test('FAQT-LAYOUT-03 — it holds across the viewport matrix', async ({ page }) => {
      for (const width of [1440, 1200, 1024, 768, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await ft.focus(0);
        await expect(
          ft.root(),
          `FAQT-LAYOUT-03 / breakpoint: the tabbed FAQ stopped being visible at ${width}px.`
        ).toBeVisible();
        await assertNoPageOverflow(page);
      }
    });

    test('FAQT-A11Y-01 — each tab points at the panel it opens', async () => {
      const wiring = await ft.tabWiring();
      await spot(ft.tabs());

      const unwired = wiring.filter((t) => !t.ariaControls).map((t) => `tab ${t.n} ("${t.label}")`);
      expect(
        unwired,
        `FAQT-A11Y-01 / no-aria-controls: ${unwired.join(', ')} carry role="tab" and ` +
          `aria-selected, but no aria-controls — so nothing in the markup says which panel ` +
          `each tab opens.\n` +
          `A screen reader announces "tab, selected" and then has no way to tell the user ` +
          `what appeared or move them to it. The visual switch works; the announced one ` +
          `does not.`
      ).toEqual([]);
    });

    test('FAQT-A11Y-02 — aria-selected reflects the active tab', async () => {
      await ft.selectTab(1);
      const wiring = await ft.tabWiring();
      const selected = wiring.map((t) => t.ariaSelected === 'true');

      expect(
        selected,
        `FAQT-A11Y-02 / stale-state: after selecting tab 2 the aria-selected flags read ` +
          `[${selected.join(', ')}]. Exactly the active tab should be true.`
      ).toEqual([false, true, false]);
    });

    test('FAQT-A11Y-03 — no critical accessibility violations', async ({ page }) => {
      await spot(ft.root());
      const id = await ft.root().getAttribute('id');
      const results = await new AxeBuilder({ page })
        .include(`#${id}`)
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const critical = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );
      expect(
        critical.map((v) => `${v.id}: ${v.help} -> ${v.nodes[0]?.target?.join(' ')}`),
        `FAQT-A11Y-03 / axe: ${critical.length} critical violation(s).`
      ).toEqual([]);
    });

    test('FAQT-A11Y-04 — text contrast is at least 4.5:1', async ({ page }) => {
      const id = await ft.root().getAttribute('id');
      const results = await new AxeBuilder({ page })
        .include(`#${id}`)
        .withRules(['color-contrast'])
        .analyze();

      expect(
        results.violations.flatMap((v) => v.nodes.map((n) => n.target.join(' '))),
        `FAQT-A11Y-04 / contrast: tabbed FAQ text fails the 4.5:1 minimum.`
      ).toEqual([]);
    });
  });
});
