// pages/VideoSectionPages.js
// ─────────────────────────────────────────────────────────────
// Two page objects for the theme's two video sections. They live in
// one file because they share the same subject — an autoplaying,
// muted, inline background video — and the same set of questions
// about it.
//
//   VideoBannerPage      one full-width video with a text slot
//                        khajal, dense
//
//   ShoppableVideoPage   a carousel of video cards, each with its own
//                        play/mute controls and product overlay
//                        khajal (5), doll (12), moonlight (10)
//
// Why the video attributes matter more than they look:
//
//   muted        a browser refuses to autoplay a video with sound.
//                Lose `muted` and the banner is a still frame.
//   playsinline  without it, iOS Safari takes the video FULL SCREEN
//                the moment it plays. On a phone that means a shopper
//                taps the page and the video hijacks the screen.
//   poster       what fills the space before the video is decoded.
//                Missing, the section is blank on first paint.
//
// All three are correct across these stores today, so the checks are
// regression guards on the things most likely to be lost in an edit.
// ─────────────────────────────────────────────────────────────

import { BasePage } from './BasePage.js';
import { rootSelector } from '../utils/simple-sections.js';

/** Shared reader for a <video> element's playback contract. */
const VIDEO_STATE = (v) => ({
  muted: v.muted,
  loop: v.loop,
  autoplay: v.autoplay,
  playsInline: v.playsInline,
  controls: v.controls,
  hasPoster: !!v.getAttribute('poster'),
  paused: v.paused,
  readyState: v.readyState,
  currentTime: v.currentTime,
  ariaLabel: v.getAttribute('aria-label'),
  src: (v.currentSrc || v.querySelector('source')?.getAttribute('src') || ''),
});

// ═════════════════════════════════════════════════════════════
export class VideoBannerPage extends BasePage {

  constructor(page, preset = null) {
    super(page, preset);
    this.v = this.locators.videoBanner;
    this.rootSel = rootSelector('video_banner');
  }

  roots()         { return this.page.locator(this.rootSel); }
  root(index = 0) { return this.roots().nth(index); }
  video(index = 0)  { return this.root(index).locator(this.v.video).first(); }
  slots(index = 0)  { return this.root(index).locator(this.v.slot); }
  posters(index = 0){ return this.root(index).locator(this.v.poster); }
  ctas(index = 0)   { return this.root(index).locator(this.v.cta); }

  async open() {
    await this.gotoHome();
    await this.root().waitFor({ state: 'attached', timeout: 30_000 });
    await this.focus(0);
  }

  async focus(index = 0) {
    await this.scrollSectionIntoView(this.root(index));
    // Give a lazily-started background video a moment to begin.
    await this.page.waitForTimeout(1200);
  }

  async videoState(index = 0) {
    if (!(await this.video(index).count())) return null;
    return this.video(index).evaluate(VIDEO_STATE);
  }

  /** Poster / fallback images and their alt text. */
  async posterAlts(index = 0) {
    return this.posters(index).evaluateAll((els) =>
      els.map((e) => ({
        alt: e.getAttribute('alt'),
        src: (e.getAttribute('src') ?? '').split('/').pop()?.split('?')[0] ?? '',
      }))
    );
  }

  /** Buttons and links in the banner, with whatever names they expose. */
  async ctaNames(index = 0) {
    return this.ctas(index).evaluateAll((els) =>
      els.map((e) => ({
        tag: e.tagName.toLowerCase(),
        text: (e.textContent ?? '').trim().replace(/\s+/g, ' '),
        ariaLabel: (e.getAttribute('aria-label') ?? '').trim(),
        title: (e.getAttribute('title') ?? '').trim(),
        href: e.getAttribute('href'),
        visible: e.getBoundingClientRect().width > 0,
      }))
    );
  }

  /**
   * Wait until the video has actually buffered something.
   *
   * readyState is the honest signal here: 0 means HAVE_NOTHING, and a
   * video with no data reports paused=false while its position never
   * moves — it is *trying* to play. Asserting playback before the data
   * arrives reads that as "frozen banner" and blames the theme for a
   * download that simply had not finished.
   *
   * Returns the final readyState so a genuine never-loads can be told
   * apart from a slow one.
   */
  async waitForVideoData(index = 0, timeout = 10_000) {
    const started = Date.now();
    let last = 0;
    while (Date.now() - started < timeout) {
      last = await this.video(index).evaluate((v) => v.readyState).catch(() => 0);
      if (last >= 2) return last;                       // HAVE_CURRENT_DATA
      await this.page.waitForTimeout(300);
    }
    return last;
  }

  /** Has the video actually started, given time to buffer and play? */
  async isPlaying(index = 0) {
    const ready = await this.waitForVideoData(index);
    if (ready < 2) return { playing: false, ready, reason: 'no data buffered' };

    const a = await this.videoState(index);
    await this.page.waitForTimeout(1200);
    const b = await this.videoState(index);
    return {
      playing: !b.paused && b.currentTime > a.currentTime,
      ready,
      from: a.currentTime,
      to: b.currentTime,
      reason: b.paused ? 'paused' : 'position did not advance',
    };
  }
}

// ═════════════════════════════════════════════════════════════
export class ShoppableVideoPage extends BasePage {

  constructor(page, preset = null) {
    super(page, preset);
    this.s = this.locators.shoppableVideo;
    this.rootSel = rootSelector('shoppable_video');
  }

  roots()         { return this.page.locator(this.rootSel); }
  root(index = 0) { return this.roots().nth(index); }

  cards(index = 0)      { return this.root(index).locator(this.s.card); }
  card(n, index = 0)    { return this.cards(index).nth(n); }
  videos(index = 0)     { return this.root(index).locator(this.s.video); }
  playToggles(index = 0){ return this.root(index).locator(this.s.playToggle); }
  muteToggles(index = 0){ return this.root(index).locator(this.s.muteToggle); }
  nextArrow(index = 0)  { return this.root(index).locator(this.s.nextArrow).first(); }

  async open() {
    await this.gotoHome();
    await this.root().waitFor({ state: 'attached', timeout: 30_000 });
    await this.focus(0);
  }

  async focus(index = 0) {
    await this.scrollSectionIntoView(this.root(index));
    await this.page.waitForTimeout(1200);
  }

  async cardCount(index = 0) { return this.cards(index).count(); }

  /**
   * One record per card, read in a single pass. Everything the checks
   * need about the video, its controls and the product it sells.
   */
  async cardData(index = 0) {
    return this.cards(index).evaluateAll((els, state) => {
      const read = new Function('v', `return (${state})(v)`);
      return els.map((card, i) => {
        const v = card.querySelector('.sv-card__video');
        const link = card.querySelector('a[href*="/products/"]');
        const play = card.querySelector('.sv-card__play-toggle');
        const mute = card.querySelector('.sv-card__mute-toggle');
        const name = (el) =>
          el ? ((el.textContent ?? '').trim() || (el.getAttribute('aria-label') ?? '').trim() ||
                (el.getAttribute('title') ?? '').trim()) : '';

        return {
          n: i + 1,
          hasVideo: !!v,
          video: v ? read(v) : null,
          hasPlay: !!play,
          playName: name(play),
          hasMute: !!mute,
          muteName: name(mute),
          productHref: link?.getAttribute('href') ?? null,
          priceText: (card.querySelector('[class*="price"]')?.textContent ?? '').trim().slice(0, 24),
          images: [...card.querySelectorAll('img')].map((img) => ({
            alt: img.getAttribute('alt'),
            src: (img.getAttribute('src') ?? '').split('/').pop()?.split('?')[0] ?? '',
            broken: img.complete && img.naturalWidth === 0,
          })),
        };
      });
    }, VIDEO_STATE.toString());
  }

  async productHrefs(index = 0) {
    return this.cards(index).evaluateAll((els) =>
      [...new Set(
        els.map((c) => c.querySelector('a[href*="/products/"]')?.getAttribute('href')).filter(Boolean)
      )]
    );
  }

  /**
   * Press the nth card's play toggle and report what changed.
   *
   * The card must be scrolled into view first. doll ships twelve cards
   * in a carousel, so the first one sits outside the viewport and
   * Playwright refuses to click it — "Element is outside of the
   * viewport". Without this the check reports an inert control on a
   * button that was never actually pressed.
   */
  /**
   * Index of the first card whose controls are actually on screen.
   *
   * These are carousels: doll shows 12 cards and parks the first one
   * off to the LEFT at x=-1102, so card 0 is unclickable no matter how
   * far the page is scrolled — scrollIntoViewIfNeeded moves the page
   * vertically and cannot change a carousel's horizontal position.
   * Driving "card 0" therefore times out on a control that is working
   * perfectly for the cards a shopper can see.
   */
  async firstVisibleCardIndex(index = 0) {
    const idx = await this.cards(index).evaluateAll((els) =>
      els.findIndex((el) => {
        const b = el.getBoundingClientRect();
        return b.left >= 0 && b.right <= window.innerWidth && b.width > 0;
      })
    );
    return idx >= 0 ? idx : 0;
  }

  async togglePlay(n, index = 0) {
    const card = this.card(n, index);
    await card.scrollIntoViewIfNeeded().catch(() => {});
    await this.page.waitForTimeout(600);

    const video = card.locator(this.s.video);
    // Give the video a chance to buffer, so "position did not advance"
    // means the control did nothing rather than the data not arriving.
    await video.evaluate((v) => new Promise((r) => {
      if (v.readyState >= 2) return r(null);
      const done = () => r(null);
      v.addEventListener('loadeddata', done, { once: true });
      setTimeout(done, 5000);
    })).catch(() => {});

    const before = await video.evaluate((v) => ({ paused: v.paused, t: v.currentTime, ready: v.readyState }));
    await this.playToggles(index).nth(n).click();
    await this.page.waitForTimeout(1600);
    const after = await video.evaluate((v) => ({ paused: v.paused, t: v.currentTime, ready: v.readyState }));

    return { before, after, started: !after.paused && after.t > before.t };
  }

  async canAdvance(index = 0) {
    const arrow = this.nextArrow(index);
    if (!(await arrow.count())) return false;
    return arrow.evaluate((el) =>
      el.getBoundingClientRect().width > 0 && !el.classList.contains('swiper-button-disabled')
    );
  }
}

export default { VideoBannerPage, ShoppableVideoPage };
