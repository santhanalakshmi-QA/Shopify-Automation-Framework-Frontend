// locators/shopify-locators.js
// ─────────────────────────────────────────────────────────────
// All CSS selectors for Shopify theme testing in one place.
// When a selector breaks after a theme update — fix it here
// and all tests update automatically.
// ─────────────────────────────────────────────────────────────

const LOCATORS = {

  // ── Header ────────────────────────────────────────────────
  // The Khajal theme renders its header as a <site-header> custom
  // element with BEM class names. Verified against all four preset
  // stores (khajal / doll / dense / moonlight) — the markup is
  // identical across presets; only content and layout modifiers vary.
  header: {
    container:   'site-header',
    root:        'site-header',
    wrapper:     '.site-header__shell',
    inner:       '.site-header__inner',
    logo:        'site-header a.header-logo',
    logoLink:    'site-header a.header-logo',
    logoImg:     'site-header a.header-logo img',
    cartIcon:    'site-header a.header-cart',
    cartLink:    'site-header a.header-cart',
    // Rendered with the `hidden` attribute while the cart is empty,
    // so read it with textContent rather than innerText.
    cartCount:   'site-header .header-cart__count, site-header [data-cart-count]',
    searchIcon:  'site-header button.header-search__icon-btn',
    searchToggle:'site-header button.header-search__icon-btn',
    // Desktop account block (.d-none.d-lg-flex) wrapping Shopify's
    // <shopify-account> custom element.
    accountIcon: 'site-header .header-account, site-header shopify-account',
    menuButton:  'site-header button.header-menu__toggle',
  },

  // ── Navigation ────────────────────────────────────────────
  nav: {
    container:       'site-header nav.header-menu__nav',
    desktopContainer:'site-header nav.header-menu__nav',
    desktopMenu:     'site-header ul.header-menu__list',
    links:           'site-header a.header-menu__link, site-header a.header-menu__link-text',
    topLevelItems:   'site-header ul.header-menu__list > li.header-menu__item',
    // Items with children render an <a class="header-menu__link-text">
    // instead of the plain <a class="header-menu__link">.
    topLevelLinks:   'site-header ul.header-menu__list > li.header-menu__item a.header-menu__link, site-header ul.header-menu__list > li.header-menu__item a.header-menu__link-text',
    itemWithChildren:'site-header li.header-menu__item--has-children',
    dropdownToggle:  'site-header li.header-menu__item--has-children > a.header-menu__link-text',
    dropdownMenu:    'site-header ul.header-menu__dropdown',
    level2Links:     'site-header .header-menu__dropdown-item > a.header-menu__dropdown-link',
    level3Links:     'site-header .header-menu__dropdown .header-menu__dropdown a.header-menu__dropdown-link',
    // Mega menu is opt-in per preset; the trigger points at its panel
    // through aria-controls, and the panel is rendered outside the <li>.
    megaItem:        'site-header li.header-menu__item--has-children:has(a[aria-controls*="HeaderMegaMenu"])',
    megaToggle:      'site-header a[aria-controls*="HeaderMegaMenu"]',
    megaContent:     '.header-mega-menu',
    megaTabs:        '.header-mega-menu__tab-list',
    mobileMenu:      '.header-menu__drawer.offcanvas',
    closeButton:     'button.header-menu__drawer-close',
  },

  // ── Mobile navigation drawer (<dialog>) ───────────────────
  // Nested entries use native <details>/<summary>, so "expanded"
  // is the presence of the `open` attribute rather than a CSS class.
  mobileNav: {
    drawer:    '.header-menu__drawer.offcanvas',
    // The top-level <ul> carries only generic utility classes
    // ("list-unstyled px-1") — there is no .header-menu__drawer-list.
    // Identify it by the items it holds instead of by a class name.
    menu:      '.header-menu__drawer ul:has(> li.header-menu__drawer-item)',
    items:     'li.header-menu__drawer-item',
    // Scope to the drawer, not to a list class that does not exist.
    links:     '.header-menu__drawer a.header-menu__drawer-link',
    details:   'details.header-menu__drawer-details',
    summary:   'summary.header-menu__drawer-summary',
    // Click the chevron, not the <summary>: the summary also contains the
    // parent item's <a>, so clicking it navigates instead of expanding.
    expanders: '.header-menu__drawer-chevron',
    submenu:   'ul.header-menu__drawer-sublist',
    subItems:  'li.header-menu__drawer-subitem',
    subLinks:  'a.header-menu__drawer-sublink',
    closeBtn:  'button.header-menu__drawer-close',
  },

  // ── Storefront password gate ──────────────────────────────
  // Shown by Shopify while a store is unpublished / "Opening soon".
  // Submitting the storefront password sets the `storefront_digest`
  // cookie, which the setup project caches into .auth/<preset>.json.
  password: {
    form:   'form[action="/password"]',
    input:  'form[action="/password"] input[type="password"], #Password, input[name="password"]',
    submit: 'form[action="/password"] [type="submit"]',
    error:  '.errors, .password-form__message, [class*="error"]',
  },

  // (The footer block lives further down, with the other verified
  // Selena selectors. A generic placeholder used to sit here and was
  // silently overridden by it — duplicate keys in an object literal
  // resolve to the last one — so it has been removed.)

  // ── Search (predictive-search off-canvas) ─────────────────
  // Opened by the header search icon. The panel has no submit button —
  // the query is submitted with Enter — so `button` is intentionally
  // absent and HeaderPage.submitSearch() presses Enter instead.
  search: {
    modal:       '#PredictiveSearchDrawer',
    input:       '#PredictiveSearchInput',
    results:     '#PredictiveSearchDrawer .predictive-search__body',
    suggestions: '#PredictiveSearchDrawer .predictive-search__pill',
    closeBtn:    '#PredictiveSearchDrawer .predictive-search__close',
  },

  // ── Collection page ───────────────────────────────────────
  collection: {
    grid:        '.product-grid, #product-grid, .grid, .collection-grid',
    productCard: '.product-card-wrapper, .card-wrapper, .product-card, .grid__item',
    productLink: '.product-card-wrapper a, .card-wrapper a, a[href*="/products/"]',
    sortDropdown:'#dropdownMenuSorting, .sort-by.dropdown, #FacetSortForm, select#SortBy',
    filterBtn:   '.facets__summary, .facet-filters__field, .filter-button, [aria-controls*="Facet"]',
    filterCheck: '.facets__item input[type="checkbox"], .filter-value input[type="checkbox"]',
    pagination:  '.pagination, nav[aria-label*="pagination" i]',
  },

  // ── Product page ──────────────────────────────────────────
  product: {
    title:       '.product-title, .product__title, .product-single__title, h1',
    price:       '.price_block .price, .price, .product__price, [class*="price"]',
    gallery:     '.product-media-gallery, .product__media-list, [class*="product__media"], .product-gallery',
    atcButton:   'button[name="add"], .shopify-product-form button[type="submit"], .product-form__submit',
    variantBtn:  '.variant-option-item, .swatch-option, input[type="radio"] + label',
    variantSelect:'.product-variants-selector-select, select[name*="options"], select[id*="Option"]',
    quantity:    'input[name="quantity"], .quantity-input, .quantity__input',
    soldOutMsg:  '.product__sold-out, [class*="sold-out"], .badge--sold-out',
    description: '.product__description, .product-single__description, #ProductDescription',
  },

  // ── Cart ──────────────────────────────────────────────────
  cart: {
    drawer:      '#CartDrawer, .cart-drawer, .drawer--active, .cart-notification',
    checkoutBtn: 'button[name="checkout"], #CartDrawer-Checkout, .cart__checkout-button',
    itemName:    '.cart_item_name, .cart-item__name, .cart-item h3',
    itemPrice:   '.cart-item .price, .cart-item [class*="price"]',
    emptyMsg:    '.cart__empty-text, .is-empty, .empty-cart',
    continueBtn: 'a[href="/collections/all"], .cart__continue-shopping',
    removeBtn:   '.cart-item__remove, button[aria-label*="remove" i]',
  },

  // ── Account ───────────────────────────────────────────────
  account: {
    emailInput:  'input[type="email"], #CustomerEmail',
    passInput:   'input[type="password"], #CustomerPassword',
    submitBtn:   'button[type="submit"], input[type="submit"]',
    errorMsg:    '.errors, .form__message--error, [class*="error"]',
    registerLink:'a[href*="/account/register"]',
    forgotLink:  'a[href*="/account/recover"]',
  },

  // ── Contact form ──────────────────────────────────────────
  contact: {
    form:        'form#ContactForm, #contact_form, .contact-form',
    nameInput:   'input[name*="name"], #ContactForm-name',
    emailInput:  'input[name*="email"], #ContactForm-email',
    msgInput:    'textarea, #ContactForm-body',
    submitBtn:   'button[type="submit"], input[type="submit"]',
    successMsg:  '.form__message--success, [class*="success"]',
    errorMsg:    '.form__message--error, [class*="error"]',
  },

  // ── Blog ──────────────────────────────────────────────────
  blog: {
    grid:        '.blog, .article-list, .articles-grid',
    articleCard: '.article, .article-card, .blog-article',
    articleLink: '.article a, .article-card a',
    articleBody: 'article, .article__content, .article-template',
  },

  // ── Main content ──────────────────────────────────────────
  main: {
    container:   'main, #MainContent, .main-content',
  },
// ── Home page sections ──────────────────────────────
  // Slideshow — a Swiper carousel. Verified against all four preset
  // stores; the markup is identical, only slide counts and which
  // controls are enabled differ per preset.
  slideshow: {
    section:   '.slideshow-section',
    swiper:    '.slideshow__swiper',
    wrapper:   '.slideshow__wrapper',
    // Swiper clones slides in loop mode; :not(.swiper-slide-duplicate)
    // keeps the count equal to the authored slide count.
    slide:     '.swiper-slide.slide:not(.swiper-slide-duplicate)',
    activeSlide: '.swiper-slide-active',
    image:     '.slide__img',
    content:   '.slide__content-wrapper',
    // Slide copy is rendered as <p>, not h1-h3 — the theme uses no
    // heading element inside a slide.
    text:      '.slide__content-wrapper p',
    cta:       'a.btn',
    bullets:   '.swiper-pagination-bullet',
    nextArrow: '.swiper-button-next',
    prevArrow: '.swiper-button-prev',
  },
  featuredProduct: {
    section:     '[id^="shopify-section"] .featured-product, [id^="shopify-section"] [class*="featured-product"]',
    title:       '[class*="product__title"], h1, h2, h3',
    price:       '[class*="price"]',
    productLink: 'a[href*="/products/"]',
    addToCart:   'button[name="add"], [class*="add-to-cart"]',
    quantity:    'input[name="quantity"], input[type="number"][class*="quantity"]',
  },
  featuredCollection: {
    section:        '[id^="shopify-section"] .featured-collection, [id^="shopify-section"] [class*="featured-collection"], [id^="shopify-section"] [class*="collection__products"]',
    title:          '[class*="title"], h2, h3',
    collectionLink: 'a[href*="/collections/"]',
    productCard:    '[class*="product-card"], [class*="card--product"], a[href*="/products/"]',
  },
  // Collection list — a Swiper carousel of collection cards. Verified
  // against khajal (10 cards, arrows visible, autoplay on) and doll
  // (4 cards, arrows hidden, autoplay off).
  //
  // Note the card IS the swiper slide: `.cl-collection-card` carries the
  // `swiper-slide` class rather than sitting inside one.
  collectionList: {
    section:     '.collection-list',
    carousel:    '.collection-list-carousel',
    swiper:      '.collection-list .swiper',
    card:        '.cl-collection-card',
    cardInner:   '.cl-card__inner',
    imageLink:   'a.cl-collection-image__media',
    image:       '.cl-collection-card img',
    titleWrap:   '.collection-title',
    titleLink:   'a.collection-title__link',
    itemCount:   '.collection-title__count',
    // The section heading carries a generated block id, so match on the
    // stable "__heading" fragment rather than the full class.
    heading:     '[class*="__heading"]',
    nextArrow:   '.swiper-button-next',
    prevArrow:   '.swiper-button-prev',
    bullets:     '.swiper-pagination-bullet',
  },
  imageWithText: {
    section: '[id^="shopify-section"] .image-with-text, [id^="shopify-section"] [class*="image-with-text"]',
    heading: 'h2, h3, [class*="heading"]',
    text:    '[class*="text"], [class*="content"], p',
  },
  newsletter: {
    section: '[id^="shopify-section"] .newsletter, [id^="shopify-section"] [class*="newsletter"]',
    email:   'input[type="email"], input[name*="email" i]',
    submit:  'button[type="submit"], input[type="submit"]',
  },
  // Rich text — on the Khajal presets this renders as a promo banner
  // carrying a discount code and a copy-to-clipboard button, not a plain
  // block of prose. Verified against khajal-theme.
  richText: {
    section:      '.rich-text',
    inner:        '.rich-text__inner',
    heading:      '.rich-text__heading, h1, h2, h3',
    body:         '.rich-text p',
    codeWrap:     '.rich-text__code-wrap',
    codeBox:      '.rich-text__code-box',
    codeText:     '.rich-text__code-text',
    copyButton:   'button.rich-text__code-copy',
    stateDefault: '.rich-text__code-copy-state--default',
    stateSuccess: '.rich-text__code-copy-state--success',
    link:         '.rich-text a',
  },
  blogPosts: {
    section:     '[id^="shopify-section"] .blog-posts, [id^="shopify-section"] [class*="blog-posts"], [id^="shopify-section"] [class*="article"]',
    article:     '[class*="article"], a[href*="/blogs/"]',
    articleLink: 'a[href*="/blogs/"]',
  },
  video: {
    section:     '[id^="shopify-section"] .video, [id^="shopify-section"] [class*="video"]',
    player:      'video, iframe[src*="youtube"], iframe[src*="vimeo"], iframe[title*="video" i]',
    playTrigger: '[class*="deferred-media__poster"], button[aria-label*="play" i]',
  },

  // ── WeDesignTech custom sections ──────────────────────
  // These sections are specific to the WeDesignTech themes and are not
  // part of Dawn. They are carried over from an earlier suite and are
  // NOT verified against the Khajal preset stores — unlike the header
  // groups above, which were verified against all four. Re-check these
  // against the live storefronts before writing home-page specs.

  // Wave / scrolling marquee announcement strip
  waveMarquee: {
    section:  '.marquee-wave, [class*="marquee-wave"], [id*="__wave_marquee"]',
    track:    '.marquee_annoucement, [class*="marquee_annoucement"]',
    item:     '.marquee_annoucement > *, [class*="marquee"] a, [class*="marquee"] span',
  },

  // Content showcase (media + text promo blocks)
  contentShowcase: {
    section:  '.content_showcase, [class*="content_showcase"], [id*="__content_showcase"]',
    heading:  'h2, h3, [class*="heading"], [class*="title"]',
    item:     '[class*="content_showcase"] a, [class*="showcase"] [class*="item"]',
    cta:      'a[class*="button"], .btn, a[role="button"]',
  },

  // Shop the look (shoppable lookbook with product hotspots)
  shopTheLook: {
    section:      '.section-shop-the-look, .shop-the-look, [id*="__shop_the_look"]',
    media:        '.shop-the-look__media, .shop-the-look__media-wrapper',
    hotspot:      '.shop-the-look__media [class*="dot"], button[aria-label*="product" i], [class*="hotspot"]',
    productLink:  'a[href*="/products/"]',
  },

  // Brand logos (swiper carousel of brand images)
  brandLogos: {
    section:  '.section-brand-logos, .brand-logos, [id*="__brand_logos"]',
    track:    '.brand-logos-cotainer, .swiper-wrapper.brand-logos-gap',
    logo:     '.swiper-slide img, .brand-logos img',
  },

  // Comparison banner (two-column us-vs-them banner)
  comparisonBanner: {
    section:  '.section-comparison-banner, .comparison-banner, [id*="__comparison_banner"]',
    heading:  'h2, h3, [class*="heading"], [class*="title"]',
    column:   '[class*="comparison-banner"] [class*="col"]',
    cta:      'a[class*="button"], .btn, a[role="button"]',
  },

  // Product comparison table (feature grid across products)
  comparisonTable: {
    section:      '.section-comparison-table, .product-comparison-table, [id*="__product_comparison_table"]',
    table:        '.compare_container, .comparison-table.table, table',
    productMedia: '.product-table-media',
    productList:  '.product-table-list',
    productLink:  'a[href*="/products/"]',
  },

  // Text with icons (icon + copy feature columns)
  textWithIcons: {
    section:  '.text-with-icons, [class*="text-with-icon"], [id*="__text_with_icons"]',
    block:    '.icon-block, .section-text-with-icon',
    icon:     '.icon-block img, .icon-block svg',
    heading:  'h2, h3, [class*="heading"], [class*="title"]',
    text:     'p, [class*="text"]',
  },

  // Image gallery (swiper of images)
  imageGallery: {
    section:  '.image-gallery, [class*="image-gallery"], [id*="__image_gallery"]',
    item:     '.image-gallery-item, .swiper-slide[class*="gallery"]',
    image:    '.image-gallery-item img, .swiper-slide img',
    link:     '.image-gallery-item a',
  },

  // Quiz (interactive product-finder quiz)
  quiz: {
    section:     '.quiz-section, .quiz_section, .quiz, [id*="__quiz"]',
    imageBlock:  '.quiz-image-block',
    qaBlock:     '.quiz-qa-block',
    question:    '.quiz_options_block, [class*="quiz_question"]',
    option:      '.quiz_options_block [class*="option"], [class*="quiz_answer"]',
    answer:      '.quiz_answer, .quiz-answer_block',
    nextButton:  '.quiz-button-next',
    prevButton:  '.quiz-button-prev',
  },

  // Testimonials — a Swiper carousel of quote cards. Verified against
  // all four presets: identical markup, different content and layout
  // variants (`--overlay` on khajal, `--grid` elsewhere).
  //
  // Quote and author use generated block ids, so match on the stable
  // "__heading" / "__description" fragments rather than the full class.
  testimonials: {
    section:      '.testimonial',
    content:      '.testimonial-content',
    carousel:     '.testimonial-content__carousel',
    track:        '.testimonial-content__track',
    card:         '.testimonial-card',
    media:        '.testimonial-card__media',
    image:        '.testimonial-card__img',
    body:         '.testimonial-card__body',
    rating:       '.testimonial-rating',
    ratingStars:  '.testimonial-rating__stars',
    quote:        '[class*="__heading"]',
    author:       '[class*="__description"]',
    nextArrow:    '.swiper-button-next',
    prevArrow:    '.swiper-button-prev',
    bullets:      '.swiper-pagination-bullet',
  },

  // Shoppable videos (renders as the theme's video grid)
  shoppableVideos: {
    section:  '.section-video-grid, .video-grid, [id*="__shoppable_videos"]',
    wrapper:  '.video-grid-wrapper',
    player:   'video, iframe[src*="youtube"], iframe[src*="vimeo"]',
    trigger:  '[class*="deferred-media__poster"], button[aria-label*="play" i]',
  },

  // ── Footer ─────────────────────────────────────────────────
  // Verified against all four presets. The structure is identical
  // everywhere; only the content and which optional blocks are
  // present differ (declared in data/presets.json).
  //
  // Menu columns are native <details>/<summary>, exactly like the
  // mobile nav drawer — they collapse into accordions on small
  // screens and sit open on desktop. "Expanded" is therefore the
  // `open` attribute, not a CSS class.
  //
  // Note: block-scoped classes carry a generated suffix
  // (footer-menu__list-AV05Ba...__footer_menu_2), so never match on a
  // full class string — always the stable BEM root.
  footer: {
    root:        'footer.footer',
    inner:       '.footer__inner',
    blocks:      '.footer__blocks',

    // Link columns
    menu:        '.footer-menu',
    menuTitle:   '.footer-menu__title',
    menuDetails: 'details.footer-menu__details',
    menuSummary: 'summary.footer-menu__summary',
    menuChevron: '.footer-menu__chevron',
    menuList:    'ul.footer-menu__list',
    menuItem:    'li.footer-menu__item',
    menuLink:    'a.footer-menu__link',

    // Brand block (logo / description / social)
    brandBlock:  '.footer-brand-block',
    brandInfo:   '.footer-brand-info',
    brandLogo:   '.footer-brand-info__logo',
    brandLogoImg:'.footer-brand-info__logo-img',

    // Social icons reuse the announcement-bar component.
    socialWrap:  '.footer-brand-info__social',
    socialList:  '.announcement-bar-social__list',
    socialItem:  'li.announcement-bar-social__item',
    socialLink:  'a.announcement-bar-social__link',

    // Newsletter signup.
    //
    // Addressed semantically, NOT by class. The theme shipped this
    // input as `newsletter__input--border-solid` — the BEM modifier
    // without its base class — so `input.newsletter__input` matched
    // nothing and every newsletter check failed at once. The email
    // field is the only type="email" in this form, and that is a far
    // more stable thing to point at than a class the theme rewrites.
    newsletterForm:   'form.newsletter__form',
    newsletterInput:  'form.newsletter__form input[type="email"]',
    newsletterSubmit: 'form.newsletter__form button[type="submit"], form.newsletter__form button',
  },

  // ── FAQ (native <details> accordion) ──────────────────────
  // Verified on khajal, doll and dense: identical markup, and all
  // three behave one-at-a-time with the first question open at load.
  // Root selector comes from utils/simple-sections.js so that   // never picks up .
  // ── FAQ (native <details> accordion) ──────────────────────
  // Verified on khajal, doll and dense: identical markup, and all
  // three open the first question at load and allow only one open at
  // a time. The root selector comes from utils/simple-sections.js so
  // that "faq" can never pick up "faq_with_tabs".
  faq: {
    item:    'details.faq-item',
    trigger: 'summary.faq-item__trigger',
    heading: '.faq-heading',
    body:    '.faq-item__body',
    icon:    '.faq-item__icon-wrap',

    // Two-column layout: copy + CTA on the left, questions on the
    // right. The left column is declared `position: sticky; top:100px`
    // so it stays in view while the questions scroll past.
    // dense ships only the accordion column.
    inner:        '.faq-section__inner',
    contentCol:   '.faq-section__content-col',
    accordionCol: '.faq-section__accordion-col',
    // "Need Help?" on khajal, "Contact us" on doll.
    cta:          '.faq-section__inner a.btn, .faq-section__inner .btn',
  },

  // ── Comparison sliders ────────────────────────────────────
  // Two sections, one mechanic: two images stacked, a draggable
  // divider revealing more or less of the one underneath.
  //
  //   image_comparison  dense      5 sliders, profile thumbnails
  //   before_after      moonlight  3 sliders, each selling a product
  //
  // Both declare role="slider" on the container. Neither carries
  // aria-valuenow, which is what that role exists to expose.
  imageComparison: {
    container: '.comparison-container',
    // The MAIN comparison widget — five of them on dense.
    // .comparison-profile-slider is a DIFFERENT, smaller thing (the
    // profile thumbnails), and there are ten of those, so matching on
    // it counts twice as many sliders as exist.
    slider:    '.comparison-container',
    profileSlider: '.comparison-profile-slider',
    divider:   '.comparison-slider__divider',
    // The element the theme actually binds its drag handler to. The
    // __divider is decorative and carries pointer-events: none, so
    // dragging it can never do anything on either section.
    handle:    '[data-before-after-handle]',
    grip:      '.comparison-slider__circle_line',
    layer:     '.comparison-slider-layer',
    image:     '.comparison-slider__img',
    label:     '.comparison-slider__label',
    profile:   '.comparison-profile__image',
    role:      '[role="slider"]',
  },
  beforeAfter: {
    container: '.before-after-container',
    slider:    '.before-after-slider',
    divider:   '.before-after-slider__divider',
    handle:    '[data-before-after-handle]',
    grip:      '.before-after-slider__circle_line',
    layer:     '.before-after-slider__layer',
    image:     '.before-after-slider__img',
    label:     '.before-after-slider__label',
    feature:   '.before-after-product__feat',
    productImg:'.before-after-product__img',
    atc:       '.before-after-product__atc',
    role:      '[role="slider"]',
  },

  // ── Video banner (single autoplaying background video) ────
  // khajal and dense. Muted + loop + playsinline + autoplay on both,
  // which is what a background video must be to play at all on iOS.
  videoBanner: {
    banner:   '.video-banner__banner',
    media:    '.video-banner__media',
    video:    'video',
    slot:     '.video-banner__content-slot',
    poster:   'img',
    cta:      'a.btn, button',
  },

  // ── Shoppable video (carousel of video cards with products) ──
  // khajal (5 cards), doll (12), moonlight (10). Identical markup.
  // Each card carries its own play and mute toggles and an overlay
  // of product cards.
  shoppableVideo: {
    card:        '.sv-card',
    media:       '.sv-card__media',
    videoWrap:   '.sv-card__video-wrap',
    video:       '.sv-card__video',
    playToggle:  '.sv-card__play-toggle',
    muteToggle:  '.sv-card__mute-toggle',
    expand:      '.sv-card__expand',
    productOverlay: '.sv-card__product-overlay',
    productGroup:   '.sv-card__product-group',
    productLink:    'a[href*="/products/"]',
    price:          '[class*="price"]',
    nextArrow:   '.swiper-button-next',
    prevArrow:   '.swiper-button-prev',
  },

  // ── Featured collection (row of product cards) ────────────
  // Verified on khajal (x2), doll and moonlight (x2).
  //
  // Two traps worth knowing:
  //   * the card contains TWO anchors to the same product — the image
  //     link (no text) and the title link. Reading the first one gives
  //     an empty title, so the title has its own selector.
  //   * khajal wraps each card's images in a NESTED swiper, so
  //     ".swiper" inside this section is not the product carousel.
  featuredCollection: {
    item:       '.featured-collection__item',
    card:       '.product-card',
    mediaLink:  '.product-card__media-link',
    image:      '.product-card__img',
    badges:     '.product-card__badges',
    badge:      '.product-card__badge',
    quickView:  '.product-card__quick-view',
    title:      '.product-title',
    titleLink:  '.product-title a',
    vendor:     '.product-vendor',
    price:      '.product-price',
    priceNow:   '.product-price__current',
    priceWas:   '.product-price__compare',
    swatches:   '.product-card__swatch',
    // The OUTER carousel — the one whose slides are product cards.
    carousel:   '.swiper:has(.featured-collection__item)',
    // NOT [class*="next"]: Swiper marks the upcoming SLIDE with
    // .swiper-slide-next, so a substring match grabs a product card
    // instead of the arrow, and clicking it does nothing.
    nextArrow:  '.swiper-button-next',
    prevArrow:  '.swiper-button-prev',
  },

  // ── FAQ with tabs ─────────────────────────────────────────
  // A DIFFERENT section from `faq`, not a variant of it. dense ships
  // both: a plain accordion near the bottom of the page, and this
  // tabbed one higher up.
  //
  // Structure: a tablist of numbered buttons, one panel per tab, and
  // a nested accordion of questions inside each panel. Only the
  // active panel is rendered with height.
  //
  //   role="tablist" > button.faq-tab__btn[aria-selected]
  //   .faq-tab__panel > .faq-tab__panel-heading + details.faq-item
  faqTabs: {
    section:      '.faq-tabs-section',
    root:         '.faq-tabs-root',
    tablist:      '[role="tablist"]',
    tab:          'button.faq-tab__btn',
    tabNumber:    '.faq-tab__btn-num',
    tabLabel:     '.faq-tab__btn-label',
    panel:        '.faq-tab__panel',
    panelHeading: '.faq-tab__panel-heading',
    panelSubtitle:'.faq-tab__panel-subtitle',
    // Questions reuse the same accordion markup as the plain FAQ.
    item:         'details.faq-item',
    trigger:      'summary.faq-item__trigger',
    heading:      '.faq-heading',
    body:         '.faq-item__body',
    icon:         '.faq-item__icon-wrap',
  },

  home: {
    sectionWrapper: '[id^="shopify-section-"]',
    mainSections:   'main [id^="shopify-section-"], #MainContent [id^="shopify-section-"]',
  },
};

export default LOCATORS;
