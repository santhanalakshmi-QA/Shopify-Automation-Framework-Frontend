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
    mobileMenu:      'dialog.header-menu__drawer',
    closeButton:     'button.header-menu__drawer-close',
  },

  // ── Mobile navigation drawer (<dialog>) ───────────────────
  // Nested entries use native <details>/<summary>, so "expanded"
  // is the presence of the `open` attribute rather than a CSS class.
  mobileNav: {
    drawer:    'dialog.header-menu__drawer',
    menu:      'ul.header-menu__drawer-list',
    items:     'li.header-menu__drawer-item',
    links:     '.header-menu__drawer-list a.header-menu__drawer-link',
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

  // ── Footer ────────────────────────────────────────────────
  footer: {
    container:   'footer, .footer, #shopify-section-footer',
    links:       'footer a',
    newsletter:  'footer input[type="email"], .newsletter input[type="email"]',
    submitBtn:   'footer button[type="submit"], .newsletter button[type="submit"]',
  },

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
  collectionList: {
    section: '[id^="shopify-section"] .collection-list, [id^="shopify-section"] [class*="collection-list"]',
    tile:    'a[href*="/collections/"], [class*="collection-list__item"], [class*="collection-card"]',
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

  // Testimonials (customer quotes with author blocks)
  testimonials: {
    section:      '.section-testimonials, [class*="testimonial"], [id*="__testimonials"]',
    block:        '.testimonial_block, .testimonial-content',
    authorName:   '.testimonial_author_title',
    authorRole:   '.testimonial_author_subtitle',
    image:        '.testimonial_image img, .testimonial_image',
  },

  // Shoppable videos (renders as the theme's video grid)
  shoppableVideos: {
    section:  '.section-video-grid, .video-grid, [id*="__shoppable_videos"]',
    wrapper:  '.video-grid-wrapper',
    player:   'video, iframe[src*="youtube"], iframe[src*="vimeo"]',
    trigger:  '[class*="deferred-media__poster"], button[aria-label*="play" i]',
  },

  home: {
    sectionWrapper: '[id^="shopify-section-"]',
    mainSections:   'main [id^="shopify-section-"], #MainContent [id^="shopify-section-"]',
  },
};

export default LOCATORS;
