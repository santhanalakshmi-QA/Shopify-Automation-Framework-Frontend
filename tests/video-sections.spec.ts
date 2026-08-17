// tests/video-sections.spec.ts
// ─────────────────────────────────────────────────────────────
// The theme's two video sections, in one file because they ask the
// same questions of the same subject.
//
//   VB   video_banner      khajal, dense
//   SV   shoppable_video   khajal (5 cards), doll (12), moonlight (10)
//
// Three video attributes carry more weight than they look, and each
// has its own check because each fails differently:
//
//   muted        browsers refuse to autoplay a video with sound. Lose
//                it and the banner is a still frame — on every store,
//                silently, with nothing in the console.
//   playsinline  without it iOS Safari takes the video FULL SCREEN as
//                soon as it plays. A shopper on a phone taps the page
//                and the video swallows the screen.
//   poster       what occupies the space before the video decodes.
//                Missing, the section is a blank band on first paint.
//
// All three are correct across these stores today, so those checks are
// regression guards. What is NOT correct — and is asserted here — is
// the alt text: every shoppable card ships one image without it, and
// khajal's banner poster has none at all.
// ─────────────────────────────────────────────────────────────

import { test, expect } from '../utils/fixtures';
import AxeBuilder from '@axe-core/playwright';
import { VideoBannerPage, ShoppableVideoPage } from '../pages/VideoSectionPages.js';
import { rootSelector } from '../utils/simple-sections.js';
import { mountNarrator, spot, spotVerdicts } from '../utils/demo-hud.js';
import { checksFor } from '../utils/slideshow-checks.js';

// ═══════════════════════════════════════════════════════════
// Video banner
// ═══════════════════════════════════════════════════════════
{
  const { expectNoMissingTranslations, assertNoDeadOrUnsafeLinks,
          assertNoPageOverflow, expectNoPlaceholderText } = checksFor('VB');

  test.describe('Video banner', () => {
    let vb: VideoBannerPage;

    test.skip(({ preset }) => !(preset.sections?.video_banner > 0),
      'This preset does not ship a video banner.');

    test.beforeEach(async ({ page, preset }, testInfo) => {
      vb = new VideoBannerPage(page, preset);
      await mountNarrator(page, {
        title: testInfo.title, preset: preset.key, spotlight: rootSelector('video_banner'),
      });
      await vb.open();
    });

    test('VB-RENDER-01 — the banner is present and visible', async ({ preset }) => {
      await spot(vb.roots());
      expect(
        await vb.roots().count(),
        `VB-RENDER-01 / count: ${preset.label} should render ` +
          `${preset.sections.video_banner} video banner(s).`
      ).toBe(preset.sections.video_banner);
      await expect(vb.root()).toBeVisible();
    });

    test('VB-RENDER-02 — it contains a video', async () => {
      await spot(vb.video());
      expect(
        await vb.video().count(),
        `VB-RENDER-02 / no-video: the video banner section renders no <video> element. ` +
          `Whatever it is showing, it is not the video that was configured.`
      ).toBeGreaterThan(0);
    });

    test('VB-RENDER-03 — no missing translation keys', async () => {
      await expectNoMissingTranslations(vb.root());
    });

    test('VB-RENDER-04 — no theme placeholder text is left on the page', async () => {
      await expectNoPlaceholderText(vb.root());
    });

    test('VB-MEDIA-01 — the video is muted', async () => {
      const s = await vb.videoState();
      await spot(vb.video());
      expect(
        s?.muted,
        `VB-MEDIA-01 / not-muted: the background video is not muted. Browsers refuse to ` +
          `autoplay video with sound, so this banner will show a frozen first frame instead ` +
          `of playing — with nothing reported in the console to explain it.`
      ).toBe(true);
    });

    test('VB-MEDIA-02 — the video plays inline on phones', async () => {
      const s = await vb.videoState();
      expect(
        s?.playsInline,
        `VB-MEDIA-02 / no-playsinline: the video has no playsinline attribute. On iOS ` +
          `Safari it will go FULL SCREEN the moment it starts, so a shopper scrolling the ` +
          `home page on a phone has the video take over the screen.`
      ).toBe(true);
    });

    test('VB-MEDIA-03 — the video has a poster frame', async () => {
      const s = await vb.videoState();
      expect(
        s?.hasPoster,
        `VB-MEDIA-03 / no-poster: the video has no poster image, so the banner is a blank ` +
          `band until enough of the video has downloaded to paint a frame.`
      ).toBe(true);
    });

    test('VB-MEDIA-04 — the fallback image has alt text', async () => {
      const imgs = await vb.posterAlts();
      test.skip(!imgs.length, 'This banner renders no <img> fallback.');
      await spotVerdicts(vb.posters(), imgs.map((i) => !!(i.alt ?? '').trim()));

      const missing = imgs.filter((i) => !(i.alt ?? '').trim()).map((i) => i.src);
      expect(
        missing,
        `VB-MEDIA-04 / missing-alt: the banner's fallback image has no alt text ` +
          `(${missing.join(', ')}). It is the only thing a screen reader could describe ` +
          `about this section — the video itself says nothing.`
      ).toEqual([]);
    });

    test('VB-MEDIA-05 — the video is actually playing', async () => {
      const s = await vb.videoState();
      test.skip(!s?.autoplay, 'This banner does not autoplay.');
      await spot(vb.video());

      const r = await vb.isPlaying();

      // A video that never buffers is an environment problem (codec,
      // network, headless build), not a theme defect — say so rather
      // than reporting a frozen banner the merchant cannot reproduce.
      test.skip(r.ready < 2,
        `The video never buffered any data (readyState ${r.ready}) — cannot judge playback here.`);

      expect(
        r.playing,
        `VB-MEDIA-05 / not-playing: the video is marked autoplay and has buffered data ` +
          `(readyState ${r.ready}), but its playback position did not advance ` +
          `(${r.from}s -> ${r.to}s, ${r.reason}). The banner is showing a still frame.`
      ).toBe(true);
    });

    test('VB-CONTENT-01 — every control has a name', async () => {
      const ctas = await vb.ctaNames();
      const visible = ctas.filter((c) => c.visible);
      test.skip(!visible.length, 'This banner renders no buttons or links.');
      await spotVerdicts(vb.ctas(), ctas.map((c) => !c.visible || !!(c.text || c.ariaLabel || c.title)));

      const unnamed = visible
        .filter((c) => !c.text && !c.ariaLabel && !c.title)
        .map((c) => `<${c.tag}${c.href ? ` href="${c.href}"` : ''}>`);
      expect(
        unnamed,
        `VB-CONTENT-01 / unnamed-control: ${unnamed.join(', ')} render a visible, clickable ` +
          `box with no text, no aria-label and no title. A shopper sees a button with ` +
          `nothing written on it; a screen reader announces only "button".`
      ).toEqual([]);
    });

    test('VB-LINK-01/03/04 — no dead, unsafe or unlabelled links', async () => {
      await assertNoDeadOrUnsafeLinks(vb.root());
    });

    test('VB-LAYOUT-01 — no horizontal page overflow', async ({ page }) => {
      await assertNoPageOverflow(page);
    });

    test('VB-LAYOUT-02 — it holds across the viewport matrix', async ({ page }) => {
      for (const width of [1440, 1200, 1024, 768, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await vb.focus(0);
        await expect(
          vb.root(),
          `VB-LAYOUT-02 / breakpoint: the video banner stopped being visible at ${width}px.`
        ).toBeVisible();
        await assertNoPageOverflow(page);
      }
    });

    test('VB-A11Y-01 — no critical accessibility violations', async ({ page }) => {
      const id = await vb.root().getAttribute('id');
      const results = await new AxeBuilder({ page })
        .include(`#${id}`).withTags(['wcag2a', 'wcag2aa']).analyze();
      const critical = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
      expect(
        critical.map((v) => `${v.id}: ${v.help} -> ${v.nodes[0]?.target?.join(' ')}`),
        `VB-A11Y-01 / axe: ${critical.length} critical violation(s).`
      ).toEqual([]);
    });

    test('VB-A11Y-02 — text contrast is at least 4.5:1', async ({ page }) => {
      const id = await vb.root().getAttribute('id');
      const results = await new AxeBuilder({ page })
        .include(`#${id}`).withRules(['color-contrast']).analyze();
      expect(
        results.violations.flatMap((v) => v.nodes.map((n) => n.target.join(' '))),
        `VB-A11Y-02 / contrast: banner text fails the 4.5:1 minimum. Text over video is ` +
          `the hardest case — the background changes every frame.`
      ).toEqual([]);
    });
  });
}

// ═══════════════════════════════════════════════════════════
// Shoppable video
// ═══════════════════════════════════════════════════════════
{
  const { assertRenderHealth, expectNoMissingTranslations, assertNoDeadOrUnsafeLinks,
          assertNoPageOverflow, assertContentInsideBox,
          expectNoPlaceholderText } = checksFor('SV');

  test.describe('Shoppable video', () => {
    let sv: ShoppableVideoPage;

    test.skip(({ preset }) => !(preset.sections?.shoppable_video > 0),
      'This preset does not ship a shoppable video section.');

    test.beforeEach(async ({ page, preset }, testInfo) => {
      sv = new ShoppableVideoPage(page, preset);
      await mountNarrator(page, {
        title: testInfo.title, preset: preset.key, spotlight: rootSelector('shoppable_video'),
      });
      await sv.open();
    });

    test('SV-RENDER-01 — the section is present and visible', async ({ preset }) => {
      await spot(sv.roots());
      expect(
        await sv.roots().count(),
        `SV-RENDER-01 / count: ${preset.label} should render ` +
          `${preset.sections.shoppable_video} shoppable video section(s).`
      ).toBe(preset.sections.shoppable_video);
      await expect(sv.root()).toBeVisible();
    });

    test('SV-RENDER-02 — it holds the expected number of cards', async ({ preset }) => {
      await spot(sv.cards());
      expect(
        await sv.cardCount(),
        `SV-RENDER-02 / card-count: ${preset.label} should show ` +
          `${preset.shoppableVideo!.cards} video card(s) but shows ${await sv.cardCount()}.`
      ).toBe(preset.shoppableVideo!.cards);
    });

    test('SV-RENDER-03 — every card has a video', async () => {
      const cards = await sv.cardData();
      await spotVerdicts(sv.cards(), cards.map((c) => c.hasVideo));
      const missing = cards.filter((c) => !c.hasVideo).map((c) => `card ${c.n}`);
      expect(
        missing,
        `SV-RENDER-03 / no-video: ${missing.join(', ')} render no video. A shoppable video ` +
          `card without a video is an empty box a shopper cannot interpret.`
      ).toEqual([]);
    });

    test('SV-RENDER-04 — no card has collapsed', async () => {
      await assertRenderHealth(sv.cards(), { minHeight: 60 });
    });

    test('SV-RENDER-05 — no missing translation keys', async () => {
      await expectNoMissingTranslations(sv.root());
    });

    test('SV-RENDER-06 — no theme placeholder text is left on the page', async () => {
      await expectNoPlaceholderText(sv.root());
    });

    test('SV-MEDIA-01 — every video is muted', async () => {
      const cards = await sv.cardData();
      const withVideo = cards.filter((c) => c.hasVideo);
      const loud = withVideo.filter((c) => !c.video!.muted).map((c) => `card ${c.n}`);
      expect(
        loud,
        `SV-MEDIA-01 / not-muted: ${loud.join(', ')} are not muted. Beyond the autoplay ` +
          `problem, a row of ten videos that could play sound at once is its own hazard.`
      ).toEqual([]);
    });

    test('SV-MEDIA-02 — every video plays inline on phones', async () => {
      const cards = await sv.cardData();
      const withVideo = cards.filter((c) => c.hasVideo);
      const bad = withVideo.filter((c) => !c.video!.playsInline).map((c) => `card ${c.n}`);
      expect(
        bad,
        `SV-MEDIA-02 / no-playsinline: ${bad.join(', ')} have no playsinline attribute, so ` +
          `on iOS Safari tapping them takes over the whole screen.`
      ).toEqual([]);
    });

    test('SV-MEDIA-03 — every video has a poster frame', async () => {
      const cards = await sv.cardData();
      const withVideo = cards.filter((c) => c.hasVideo);
      const bad = withVideo.filter((c) => !c.video!.hasPoster).map((c) => `card ${c.n}`);
      expect(
        bad,
        `SV-MEDIA-03 / no-poster: ${bad.join(', ')} have no poster, so the card is blank ` +
          `until the video downloads. In a carousel of ten that is a row of empty boxes.`
      ).toEqual([]);
    });

    test('SV-MEDIA-04 — every image has alt text', async () => {
      const cards = await sv.cardData();
      const verdicts = cards.map((c) => c.images.every((i) => !!(i.alt ?? '').trim()));
      await spotVerdicts(sv.cards(), verdicts);

      const missing = cards.flatMap((c) =>
        c.images.filter((i) => !(i.alt ?? '').trim()).map((i) => `card ${c.n} (${i.src})`)
      );
      expect(
        missing,
        `SV-MEDIA-04 / missing-alt: ${missing.length} image(s) have no alt text:\n  ` +
          `${missing.slice(0, 8).join('\n  ')}${missing.length > 8 ? '\n  …' : ''}`
      ).toEqual([]);
    });

    test('SV-MEDIA-05 — no image is broken', async () => {
      const cards = await sv.cardData();
      const broken = cards.flatMap((c) => c.images.filter((i) => i.broken).map((i) => `card ${c.n} (${i.src})`));
      expect(broken, `SV-MEDIA-05 / broken-image: ${broken.join(', ')}.`).toEqual([]);
    });

    test('SV-CTRL-01 — every card has play and mute controls', async () => {
      const cards = await sv.cardData();
      await spotVerdicts(sv.cards(), cards.map((c) => c.hasPlay && c.hasMute));
      const missing = cards
        .filter((c) => !c.hasPlay || !c.hasMute)
        .map((c) => `card ${c.n}${!c.hasPlay ? ' (no play)' : ''}${!c.hasMute ? ' (no mute)' : ''}`);
      expect(
        missing,
        `SV-CTRL-01 / no-controls: ${missing.join(', ')}. These videos autoplay without ` +
          `browser controls, so the card's own buttons are the only way to stop or unmute one.`
      ).toEqual([]);
    });

    test('SV-CTRL-02 — the play and mute buttons have names', async () => {
      const cards = await sv.cardData();
      const unnamed = cards.flatMap((c) => [
        c.hasPlay && !c.playName ? `card ${c.n} play` : null,
        c.hasMute && !c.muteName ? `card ${c.n} mute` : null,
      ].filter(Boolean));
      expect(
        unnamed,
        `SV-CTRL-02 / unnamed-control: ${unnamed.join(', ')} expose no text, aria-label or ` +
          `title. They are icon-only buttons — a screen reader announces "button" and ` +
          `nothing more, so there is no way to know which stops the video and which mutes it.`
      ).toEqual([]);
    });

    test('SV-CTRL-03 — the play button starts its video', async () => {
      const cards = await sv.cardData();
      // Drive a card that is actually on screen: these are carousels,
      // and card 0 can be parked off to the side.
      const n = await sv.firstVisibleCardIndex();
      test.skip(!cards[n]?.hasPlay, );
      await spot(sv.playToggles().nth(n));

      const r = await sv.togglePlay(n);
      // The toggle may pause a playing video or start a paused one;
      // either way the state must CHANGE, or the control does nothing.
      expect(
        r.after.paused !== r.before.paused || r.after.t !== r.before.t,
        `SV-CTRL-03 / inert-control: pressing the play toggle on card ${n + 1} changed nothing ` +
          `(paused ${r.before.paused} -> ${r.after.paused}, position ${r.before.t} -> ${r.after.t}).`
      ).toBe(true);
    });

    test('SV-PRODUCT-01 — every card links to a product', async () => {
      const cards = await sv.cardData();
      await spotVerdicts(sv.cards(), cards.map((c) => !!c.productHref));
      const missing = cards.filter((c) => !c.productHref).map((c) => `card ${c.n}`);
      expect(
        missing,
        `SV-PRODUCT-01 / no-product: ${missing.join(', ')} link to no product. The whole ` +
          `point of a shoppable video is that the video sells something.`
      ).toEqual([]);
    });

    test('SV-PRODUCT-02 — every card shows a price', async () => {
      const cards = await sv.cardData();
      const missing = cards.filter((c) => !/\d/.test(c.priceText)).map((c) => `card ${c.n}`);
      expect(
        missing,
        `SV-PRODUCT-02 / no-price: ${missing.join(', ')} show no price.`
      ).toEqual([]);
    });

    test('SV-PRODUCT-03 — every linked product still exists', async ({ page }) => {
      const hrefs = await sv.productHrefs();
      const broken: string[] = [];
      for (const href of hrefs) {
        const url = new URL(href, page.url()).toString();
        const res = await page.request.get(url, { failOnStatusCode: false }).catch(() => null);
        const status = res?.status() ?? 0;
        if (status >= 400 || status === 0) broken.push(`${url} (${status || 'unreachable'})`);
      }
      expect(
        broken,
        `SV-PRODUCT-03 / dead-product: video card(s) sell products whose page no longer ` +
          `exists:\n  ${broken.join('\n  ')}`
      ).toEqual([]);
    });

    test('SV-LINK-01/03/04 — no dead, unsafe or unlabelled links', async () => {
      await assertNoDeadOrUnsafeLinks(sv.root());
    });

    test('SV-NAV-01 — the carousel advances', async ({ preset }) => {
      test.skip(!(await sv.canAdvance()), 'Nothing further to scroll at this viewport.');
      await spot(sv.nextArrow());
      const before = await sv.cards().first().boundingBox();
      await sv.nextArrow().click();
      await sv.page.waitForTimeout(900);
      const after = await sv.cards().first().boundingBox();
      expect(
        Math.abs((after?.x ?? 0) - (before?.x ?? 0)),
        `SV-NAV-01 / no-advance: clicking next did not move the row. Cards past the ` +
          `visible few are unreachable.`
      ).toBeGreaterThan(5);
    });

    test('SV-LAYOUT-01 — no horizontal page overflow', async ({ page }) => {
      await assertNoPageOverflow(page);
    });

    test('SV-LAYOUT-02 — card content stays inside the section', async () => {
      await assertContentInsideBox(sv.root(), sv.cards(), { onlyInView: true });
    });

    test('SV-A11Y-01 — no critical accessibility violations', async ({ page }) => {
      const id = await sv.root().getAttribute('id');
      const results = await new AxeBuilder({ page })
        .include(`#${id}`).withTags(['wcag2a', 'wcag2aa']).analyze();
      const critical = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
      expect(
        critical.map((v) => `${v.id}: ${v.help} -> ${v.nodes[0]?.target?.join(' ')}`),
        `SV-A11Y-01 / axe: ${critical.length} critical violation(s).`
      ).toEqual([]);
    });

    test('SV-A11Y-02 — text contrast is at least 4.5:1', async ({ page }) => {
      const id = await sv.root().getAttribute('id');
      const results = await new AxeBuilder({ page })
        .include(`#${id}`).withRules(['color-contrast']).analyze();
      expect(
        results.violations.flatMap((v) => v.nodes.map((n) => n.target.join(' '))),
        `SV-A11Y-02 / contrast: product text over video fails the 4.5:1 minimum.`
      ).toEqual([]);
    });
  });
}
