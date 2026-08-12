# Shopify Playwright Automation Framework

This project is built using Playwright with JavaScript.

## Folder Structure

tests/
- Contains all Playwright test files.

pages/
- Contains Page Object Model classes.

utils/
- Contains reusable helper methods.

data/
- Contains test data in JSON format.

reports/
- Stores Playwright HTML reports.

screenshots/
- Stores screenshots for failed tests.

playwright.config.ts
- Playwright configuration.

.env
- Environment variables.

## Coding Rules

- Use JavaScript.
- Follow Page Object Model.
- Never write locators directly in test files.
- Reuse page methods whenever possible.
- Keep tests clean.
- Use async/await.
- Use Playwright expect assertions.
- Use descriptive method names.
- Avoid duplicate code.

## Locator Priority

1. data-testid
2. id
3. role
4. aria-label
5. CSS
6. XPath (last option)

## Output Format

Whenever generating automation:

1. Analyze Requirement
2. Required Files
3. Page Object
4. Test File
5. Helper Methods
6. Notes

Never generate a new framework.

Always follow this project's existing structure.