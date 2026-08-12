# Allure Reporting

This framework produces an Allure execution report on top of the existing
Playwright suite. Nothing in `tests/`, `pages/`, or `utils/` had to change —
Allure reads Playwright's native results, steps, and attachments.

## One-command run

```bash
npm run test:allure
```

This runs the whole suite, generates the Allure report, and opens it in your
browser — in a single command. It forwards extra Playwright args, e.g.:

```bash
npm run test:allure -- --project=desktop-chromium
npm run test:allure -- -g "Navigation"
```

The report is still generated when tests fail (that's when you need it most),
and the command exits with the test run's status so CI stays accurate.

## Prerequisite: Java

The Allure command-line report **generator** is a JVM application, so it needs
**Java 8 or newer** on your `PATH`. Install it once from
<https://adoptium.net/> and re-open your terminal.

> The Playwright run itself and the raw `allure-results/` are pure Node — only
> the final HTML rendering step (`allure generate` / `allure open`) needs Java.
> If Java is missing, `npm run test:allure` still runs the tests and writes
> `allure-results/`, then tells you to install Java and run `npm run allure:report`.

## Individual scripts

| Script                     | What it does                                                        |
| -------------------------- | ------------------------------------------------------------------- |
| `npm test`                 | Runs the suite; the Allure reporter writes raw `./allure-results`.  |
| `npm run allure:generate`  | Builds the static HTML report into `./allure-report`.               |
| `npm run allure:open`      | Serves and opens the last generated `./allure-report`.              |
| `npm run allure:report`    | `generate` + `open` in one step (use after a plain `npm test`).     |
| `npm run test:allure`      | Everything above chained: **run → generate → open**.                |
| `npm run allure:clean`     | Deletes `allure-results/` and `allure-report/` for a fresh start.   |

## What the report includes

Configured in [`playwright.config.ts`](../playwright.config.ts) via the
`allure-playwright` reporter and the framework's existing `use` options:

- **Execution summary** — total / passed / failed / skipped / broken counts.
  Allure treats assertion failures as *Failed* and other exceptions/timeouts as
  *Broken* automatically.
- **Suites & test cases** — the `test.describe()` nesting becomes the Allure
  suite tree (`suiteTitle: true`).
- **Duration & timeline** — per-test timing and the parallel-execution timeline.
- **Steps** — every Playwright step/fixture/command (`detail: true`).
- **Errors & stack traces** — attached to failed cases.
- **Screenshots** — from `use.screenshot: 'only-on-failure'`.
- **Videos** — from `use.video: 'retain-on-failure'`.
- **Trace files** — from `use.trace: 'on-first-retry'`.
- **Environment** — the "Environment" widget (project, base URL, Playwright,
  Node, OS, arch, CI) from the reporter's `environmentInfo`.
- **Browser / device details** — captured per project (desktop-chromium /
  tablet / mobile) as Allure parameters.
- **Categories / tags** — the "Categories" widget from the reporter's
  `categories` rules (Broken / assertion failures / timeouts / skipped).
- **Retry information** — Allure records retries from Playwright's retry runs.

## Trend / history (optional)

To get the cross-run Trend widget, preserve history between runs by copying the
previous report's history into new results before generating:

```bash
# after a run, before allure:generate
cp -r allure-report/history allure-results/history   # if a prior report exists
```

CI systems (the Allure Jenkins/GitHub plugins) handle this automatically.
