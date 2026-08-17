// utils/simple-sections.js
// ─────────────────────────────────────────────────────────────
// Registry of the "simple" home-page sections — the ones that
// present content without interactive behaviour: no carousel state
// to drive, no multi-step flow, no drag handle.
//
// They are built from ONE shared battery of checks rather than one
// spec file each. What differs between them is declared here and in
// data/presets.json; the spec itself is written once.
//
// Root selectors are not hand-written CSS. Shopify wraps every
// home-page section in an element whose id follows
//
//     shopify-section-template--<store id>__<type>_<suffix>
//
// so the section type IS addressable generically. That is the same
// convention `npm run sync:sections` relies on, which means these
// selectors cannot drift out of step with the section inventory.
//
// `item` is the repeating unit inside the section — a logo, a stat, a
// gallery tile. null means the section is a single block with nothing
// repeating inside it, and the item-level checks are skipped.
//
// Every value below was verified against the live storefronts.
// ─────────────────────────────────────────────────────────────

export const SIMPLE_SECTIONS = [
  { type: 'brand_logo',            prefix: 'BL',   label: 'Brand logos',       item: '.brand-logo-card' },
  { type: 'marquee',               prefix: 'MQ',   label: 'Marquee',           item: '.marquee-item' },
  { type: 'number_counter',        prefix: 'NC',   label: 'Number counter',    item: '.counter-card' },
  { type: 'icon_with_text',        prefix: 'IWT',  label: 'Icon with text',    item: '.support-icon-card' },
  { type: 'image_banner',          prefix: 'IB',   label: 'Image banner',      item: null },
  { type: 'grid_banner',           prefix: 'GB',   label: 'Grid banner',       item: '.grid-card' },
  { type: 'newsletter',            prefix: 'NL',   label: 'Newsletter',        item: null },
  { type: 'specification_section', prefix: 'SPEC', label: 'Specifications',    item: '.spec-card' },
  { type: 'grid_showcase',         prefix: 'GS',   label: 'Grid showcase',     item: '.grid-showcase-item' },
  { type: 'spotlight_gallery',     prefix: 'SG',   label: 'Spotlight gallery', item: '.spotlight-card' },
  { type: 'image_gallery',         prefix: 'IG',   label: 'Image gallery',     item: '.gallery-card' },
];

/**
 * Every section type this theme is known to render. Needed because
 * section ids are matched by substring, and one type name can be a
 * prefix of another: `__faq_` also matches `__faq_with_tabs_`, so a
 * naive selector for "faq" silently picks up the tabs section too.
 *
 * Generated from the live stores by `npm run sync:sections`; keep in
 * step with the `sections` keys in data/presets.json.
 */
export const KNOWN_TYPES = [
  'before_after', 'brand_logo', 'collection_list', 'faq', 'faq_with_tabs',
  'featured_collection', 'featured_product', 'grid_banner', 'grid_showcase',
  'hotspot', 'icon_with_text', 'image_banner', 'image_comparison',
  'image_gallery', 'marquee', 'newsletter', 'number_counter', 'quiz',
  'rich_text', 'shoppable_video', 'slideshow', 'specification_section',
  'spotlight_gallery', 'testimonial', 'video_banner',
];

/**
 * CSS selector matching every instance of `type` on the home page —
 * and nothing else. Any longer type name that starts with this one is
 * explicitly excluded, which is what keeps "faq" from matching
 * "faq_with_tabs".
 */
export function rootSelector(type) {
  const shadowedBy = KNOWN_TYPES
    .filter((t) => t !== type && t.startsWith(`${type}_`))
    .map((t) => `:not([id*="__${t}_"])`)
    .join('');
  return `[id^="shopify-section-template--"][id*="__${type}_"]${shadowedBy}`;
}

export function sectionByPrefix(prefix) {
  return SIMPLE_SECTIONS.find((s) => s.prefix === prefix);
}

export function sectionByType(type) {
  return SIMPLE_SECTIONS.find((s) => s.type === type);
}

/**
 * What the manifest declares for the nth instance of `type` on this
 * preset. Returns null when the preset does not ship the section, so
 * callers can skip rather than assume zero.
 */
export function expectationFor(preset, type, index = 0) {
  return preset.simpleSections?.[type]?.[index] ?? null;
}

export default SIMPLE_SECTIONS;
