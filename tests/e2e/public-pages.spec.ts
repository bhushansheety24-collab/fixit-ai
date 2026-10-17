import { test, expect } from "@playwright/test";

test.describe("public pages", () => {
  test("landing page renders the core value proposition", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Fix More. Waste Less." })).toBeVisible();
    await expect(page.getByRole("link", { name: /Analyze an Item/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
  });

  test("privacy and terms pages are reachable", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();

    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible();
  });

  test("professionals listing shows seeded demo data, clearly labelled", async ({ page }) => {
    await page.goto("/professionals");
    await expect(page.getByText("GreenTech Electronics Repair")).toBeVisible();
    await expect(page.getByText("Demo data").first()).toBeVisible();
  });

  test("unknown routes render the not-found page", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page.getByText("Page not found")).toBeVisible();
  });
});

test.describe("auth protection", () => {
  test("protected pages redirect anonymous visitors to sign-in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in/);

    await page.goto("/sustainability");
    await expect(page).toHaveURL(/\/sign-in/);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("sign-in form validates input client-side", async ({ page }) => {
    await page.goto("/sign-in");
    await page.locator('form[data-hydrated="true"]').waitFor({ state: "attached" });
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  });
});
