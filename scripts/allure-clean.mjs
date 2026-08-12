// scripts/allure-clean.mjs
// Removes previous Allure results and generated report so the next run
// starts from a clean slate (avoids stale history / orphaned attachments).
import { rmSync } from 'node:fs';

for (const dir of ['allure-results', 'allure-report']) {
  rmSync(dir, { recursive: true, force: true });
  console.log(`🧹 removed ${dir}`);
}
