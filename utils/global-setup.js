// utils/global-setup.js
// ─────────────────────────────────────────────────────────────
// Runs once, before any project, on every `playwright test` call.
//
// Clears ./allure-results so each report reflects ONLY the run that
// produced it. Without this the allure-playwright reporter appends to
// whatever is already there, and `allure generate` merges every run
// you have ever done into one report — old failures showing up beside
// new passes, with counts that match no single run.
//
// Opt out when you deliberately want to merge several runs into one
// report (e.g. sharding across machines, or running each preset
// separately and reporting them together):
//
//     ALLURE_KEEP=1 npm run test:doll
//     ALLURE_KEEP=1 npm run test:dense
//     npm run allure          # one report covering both
//
// Trend history is NOT stored here — it lives in reports/allure/_history
// and is restored by scripts/allure-archive.mjs at generate time, so
// wiping results never loses the run-over-run trend.
// ─────────────────────────────────────────────────────────────

import { rmSync, mkdirSync } from 'node:fs';

export default function globalSetup() {
  if (process.env.ALLURE_KEEP === '1') {
    console.log('↻  ALLURE_KEEP=1 — appending to existing allure-results');
    return;
  }

  rmSync('allure-results', { recursive: true, force: true });
  mkdirSync('allure-results', { recursive: true });
}
