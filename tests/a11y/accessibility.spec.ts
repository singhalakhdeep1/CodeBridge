/**
 * CodeSync — Accessibility (A11y) test suite
 *
 * Uses axe-playwright (axe-core under the hood) to run WCAG 2.2 AA audit
 * on the main app pages.
 *
 * Skill coverage: A11y / WCAG 2.2, Playwright
 *
 * Run: pnpm test:a11y
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "axe-playwright";

const PAGES = [
    { name: "Landing", path: "/" },
    { name: "Login", path: "/login" },
    { name: "Dashboard", path: "/dashboard" },
    { name: "Editor", path: "/editor/demo" },
];

for (const page of PAGES) {
    test(`A11y: ${page.name} (${page.path}) passes WCAG 2.2 AA`, async ({ page: pw }) => {
        await pw.goto(page.path);

        // Wait for main content to render
        await pw.waitForLoadState("networkidle");

        const results = await new AxeBuilder({ page: pw })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
            .exclude("#__next-route-announcer__") // Next.js internal — skip
            .analyze();

        expect(
            results.violations,
            `A11y violations on ${page.name}:\n${JSON.stringify(results.violations, null, 2)}`
        ).toHaveLength(0);
    });
}

test("A11y: Editor keyboard navigation — focus moves correctly", async ({ page }) => {
    await page.goto("/editor/demo");
    await page.waitForLoadState("networkidle");

    // Tab through the toolbar — focus should stay within the toolbar
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
    expect(focused).not.toBeNull(); // At least one focusable element

    // Escape from Monaco editor returns focus to toolbar
    await page.keyboard.press("Escape");
    const afterEsc = await page.evaluate(() => document.activeElement?.tagName);
    expect(afterEsc).not.toBe("BODY"); // Focus didn't escape to body
});
