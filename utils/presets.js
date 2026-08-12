// utils/presets.js
// ─────────────────────────────────────────────────────────────
// Loads data/presets.json and resolves each preset against the
// environment. This is the single source of truth for "which
// stores does the suite run against" — playwright.config.ts, the
// storefront-unlock setup and the test fixtures all read from here.
//
// Playwright transpiles this module to CommonJS, so `require` is
// available at runtime (same pattern the config already uses).
// ─────────────────────────────────────────────────────────────

const { presets: RAW_PRESETS } = require('../data/presets.json');

// Environment variable name for a preset override, e.g.
// key "moonlight" + "PASSWORD" -> PRESET_MOONLIGHT_PASSWORD
function envName(key, suffix) {
  return `PRESET_${String(key).toUpperCase().replace(/-/g, '_')}_${suffix}`;
}

// Strip any trailing slash so baseURL + '/cart' never double-slashes.
function normaliseUrl(url) {
  return String(url).replace(/\/+$/, '');
}

function resolve(raw) {
  return {
    ...raw,
    url: normaliseUrl(process.env[envName(raw.key, 'URL')] ?? raw.url),
    password:
      process.env[envName(raw.key, 'PASSWORD')] ??
      process.env.STOREFRONT_PASSWORD ??
      raw.password ??
      null,
  };
}

// Every preset defined in data/presets.json.
export const PRESETS = RAW_PRESETS.map(resolve);

// Look a preset up by key. Throws loudly rather than returning
// undefined, because a missing preset means a misconfigured project.
export function getPreset(key) {
  const preset = PRESETS.find((p) => p.key === key);
  if (!preset) {
    throw new Error(
      `Unknown preset "${key}". Known presets: ${PRESETS.map((p) => p.key).join(', ')}`
    );
  }
  return preset;
}

// Presets selected for this run. Set PRESETS=doll,dense to narrow the
// project matrix without editing the config; unset runs all of them.
export function activePresets() {
  const filter = (process.env.PRESETS ?? '').trim();
  if (!filter) return PRESETS;

  const wanted = filter.split(',').map((s) => s.trim()).filter(Boolean);
  const selected = PRESETS.filter((p) => wanted.includes(p.key));
  if (selected.length === 0) {
    throw new Error(
      `PRESETS="${filter}" matched no preset. Known presets: ${PRESETS.map((p) => p.key).join(', ')}`
    );
  }
  return selected;
}

// Where the unlocked storefront session (storefront_digest cookie) for
// a preset is cached. Written by the setup project, read by every
// browser project that depends on it.
export function authFile(key) {
  return `.auth/${key}.json`;
}

export default { PRESETS, getPreset, activePresets, authFile };
