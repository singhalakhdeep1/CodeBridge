import { test, expect } from "@playwright/test";

test.describe("Auth flows", () => {
    test("login page renders", async ({ page }) => {
        await page.goto("/login");
        await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
        await expect(page.getByLabel(/email/i)).toBeVisible();
        await expect(page.getByLabel(/password/i)).toBeVisible();
    });

    test("shows validation errors on empty submit", async ({ page }) => {
        await page.goto("/login");
        await page.getByRole("button", { name: /sign in/i }).click();
        await expect(page.getByText(/email/i)).toBeVisible();
    });

    test("register page renders", async ({ page }) => {
        await page.goto("/register");
        await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible();
    });

    test("forgot-password page renders", async ({ page }) => {
        await page.goto("/forgot-password");
        await expect(page.getByRole("button", { name: /send reset/i })).toBeVisible();
    });

    test("login page links to register", async ({ page }) => {
        await page.goto("/login");
        await page.getByRole("link", { name: /sign up/i }).click();
        await expect(page).toHaveURL(/register/);
    });
});
