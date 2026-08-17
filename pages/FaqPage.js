// pages/FaqPage.js
// ─────────────────────────────────────────────────────────────
// Page Object for the home-page FAQ accordion.
//
// Verified behaviour, identical on khajal, doll and dense:
//
//              khajal   doll   dense
//   questions  4        6      4
//   at load    Q1 open  Q1 open  Q1 open
//   behaviour  one open at a time on all three
//
// Built on native <details>/<summary>, so "open" is the `open`
// attribute rather than a CSS class — the same pattern as the mobile
// nav drawer and the footer columns.
//
// The root selector deliberately comes from utils/simple-sections.js:
// section ids are matched by substring, and "__faq_" also matches
// "__faq_with_tabs_". dense ships both, so a naive selector here
// would test the wrong section on that store.
// ─────────────────────────────────────────────────────────────

import { BasePage } from './BasePage.js';
import { rootSelector } from '../utils/simple-sections.js';

export class FaqPage extends BasePage {

  constructor(page, preset = null) {
    super(page, preset);
    this.q = this.locators.faq;
    this.rootSel = rootSelector('faq');
  }

  // ── Getters ─────────────────────────────────────────────────

  roots()         { return this.page.locator(this.rootSel); }
  root(index = 0) { return this.roots().nth(index); }

  items(index = 0)    { return this.root(index).locator(this.q.item); }
  item(n, index = 0)  { return this.items(index).nth(n); }
  triggers(index = 0) { return this.root(index).locator(this.q.trigger); }
  trigger(n, index = 0) { return this.triggers(index).nth(n); }
  questions(index = 0)  { return this.root(index).locator(this.q.heading); }
  answers(index = 0)    { return this.root(index).locator(this.q.body); }

  // ── Actions ─────────────────────────────────────────────────

  async open() {
    await this.gotoHome();
    await this.root().waitFor({ state: 'attached', timeout: 30_000 });
    await this.focus(0);
  }

  async focus(index = 0) {
    await this.scrollSectionIntoView(this.root(index));
  }

  /**
   * Wait until the open/closed pattern stops changing.
   *
   * The theme animates the expand and the one-at-a-time close, and
   * that animation runs measurably slower under emulated tablet and
   * mobile viewports than on desktop. A fixed sleep is therefore the
   * wrong tool: too short and the check reads a half-finished state
   * (two answers momentarily open during the swap, which looks exactly
   * like a broken accordion); too long and every check pays for it.
   *
   * Polling until two consecutive reads agree costs nothing when the
   * animation is quick and still holds when it is not.
   */
  async waitForSettled(index = 0, { timeout = 5000, stableFor = 700 } = {}) {
    const started = Date.now();
    let previous = null;
    let unchangedSince = Date.now();

    while (Date.now() - started < timeout) {
      const current = (await this.openStates(index)).join('');
      if (current !== previous) {
        previous = current;
        unchangedSince = Date.now();
      } else if (Date.now() - unchangedSince >= stableFor) {
        return current;
      }
      await this.page.waitForTimeout(120);
    }
    return previous;
  }

  /**
   * Wait for the nth question to actually flip, then for the rest of
   * the accordion to settle.
   *
   * Settling alone is not enough: immediately after the click the
   * animation has not started, so two consecutive reads agree on the
   * OLD state and a settle-only wait returns straight away. Waiting
   * for the clicked item to change first is what makes the wait mean
   * "the click took effect".
   *
   * If it never flips — a genuinely broken accordion — this returns
   * after the timeout and the assertion fails, which is correct.
   */
  async waitForToggle(n, was, index = 0, timeout = 4000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      if ((await this.isOpen(n, index)) !== was) break;
      await this.page.waitForTimeout(100);
    }
    await this.waitForSettled(index);
  }

  /** Click the nth question and wait for the accordion to settle. */
  async toggle(n, index = 0) {
    const was = await this.isOpen(n, index);
    await this.trigger(n, index).click();
    await this.waitForToggle(n, was, index);
  }

  /** Focus the nth question and press a key — keyboard operability. */
  async pressOn(n, key = 'Enter', index = 0) {
    const was = await this.isOpen(n, index);
    await this.trigger(n, index).focus();
    await this.page.keyboard.press(key);
    await this.waitForToggle(n, was, index);
  }

  // ── Queries ─────────────────────────────────────────────────

  async count(index = 0) { return this.items(index).count(); }

  /** Open/closed state of every question, in order. */
  async openStates(index = 0) {
    return this.items(index).evaluateAll((els) => els.map((e) => e.hasAttribute('open')));
  }

  async isOpen(n, index = 0) {
    return this.item(n, index).evaluate((el) => el.hasAttribute('open'));
  }

  async openCount(index = 0) {
    return (await this.openStates(index)).filter(Boolean).length;
  }

  async questionTexts(index = 0) {
    return this.questions(index).evaluateAll((els) =>
      els.map((e) => (e.textContent ?? '').trim().replace(/\s+/g, ' '))
    );
  }

  /**
   * Answer text for every question. Read from the DOM rather than
   * innerText so a collapsed answer still reports its content — the
   * point is that the answer EXISTS, not that it is on screen.
   */
  async answerTexts(index = 0) {
    return this.answers(index).evaluateAll((els) =>
      els.map((el) => {
        const clone = el.cloneNode(true);
        clone.querySelectorAll('style, script').forEach((n) => n.remove());
        return (clone.textContent ?? '').trim().replace(/\s+/g, ' ');
      })
    );
  }

  // ── Two-column layout: CTA and sticky behaviour ─────────────

  inner(index = 0)        { return this.root(index).locator(this.q.inner).first(); }
  contentCol(index = 0)   { return this.root(index).locator(this.q.contentCol).first(); }
  accordionCol(index = 0) { return this.root(index).locator(this.q.accordionCol).first(); }
  cta(index = 0)          { return this.root(index).locator(this.q.cta).first(); }

  async ctaInfo(index = 0) {
    if (!(await this.cta(index).count())) return null;
    return this.cta(index).evaluate((el) => {
      const box = el.getBoundingClientRect();
      const left = el.closest('.faq-section__inner')?.querySelector('.faq-section__content-col');
      const leftBox = left?.getBoundingClientRect() ?? null;
      return {
        text: (el.textContent ?? '').trim().replace(/\s+/g, ' '),
        href: el.getAttribute('href'),
        box: { left: box.left, right: box.right, top: box.top, width: box.width, height: box.height },
        // Which column is it actually rendered in?
        inContentCol: !!leftBox && box.left < leftBox.right,
        hasContentCol: !!leftBox,
      };
    });
  }

  /**
   * Does the left column actually stay put while the questions scroll?
   *
   * `position: sticky` fails silently in a flex row when the column is
   * stretched to the full height of its container: with no spare room
   * inside the containing block there is nothing for it to stick
   * against, so it scrolls away as if the rule were never written.
   * That is invisible in the stylesheet and only shows up by scrolling.
   *
   * Returns the declared intent, what actually happened, and the
   * heights needed to explain why.
   */
  async stickyBehaviour(index = 0, scrollBy = 350) {
    const el = this.contentCol(index);
    if (!(await el.count())) return null;

    // Put the section near the top so there is room to scroll past it.
    await this.scrollSectionIntoView(this.root(index));
    await this.page.waitForTimeout(400);

    const before = await el.evaluate((node) => {
      const cs = getComputedStyle(node);
      const inner = node.closest('.faq-section__inner');
      return {
        declared: cs.position,
        stickyTop: cs.top,
        top: node.getBoundingClientRect().top,
        colHeight: node.getBoundingClientRect().height,
        containerHeight: inner ? inner.getBoundingClientRect().height : 0,
      };
    });

    await this.page.evaluate((by) => window.scrollBy({ top: by, behavior: 'instant' }), scrollBy);
    await this.page.waitForTimeout(500);

    const afterTop = await el.evaluate((node) => node.getBoundingClientRect().top);

    return {
      ...before,
      afterTop,
      moved: Math.round(Math.abs(afterTop - before.top)),
      scrolledBy: scrollBy,
      /** Room the column has to travel inside its container. */
      slack: Math.round(before.containerHeight - before.colHeight),
    };
  }

  /** Icon / question geometry, per question. */
  async iconAlignment(index = 0) {
    return this.items(index).evaluateAll((els) =>
      els.map((it, i) => {
        const icon = it.querySelector('.faq-item__icon-wrap');
        const head = it.querySelector('.faq-heading');
        if (!icon || !head) return null;
        const ir = icon.getBoundingClientRect();
        const hr = head.getBoundingClientRect();
        return {
          q: i + 1,
          iconCentreY: ir.top + ir.height / 2,
          headCentreY: hr.top + hr.height / 2,
          offsetY: Math.abs((ir.top + ir.height / 2) - (hr.top + hr.height / 2)),
          iconRight: ir.right,
          headLeft: hr.left,
        };
      }).filter(Boolean)
    );
  }

  /** Is the nth answer actually rendered with height right now? */
  async answerHasHeight(n, index = 0) {
    return this.answers(index).nth(n).evaluate(
      (el) => el.getBoundingClientRect().height > 4
    );
  }
}

export default FaqPage;
