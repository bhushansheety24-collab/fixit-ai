import { test, expect, type Page } from "@playwright/test";

/**
 * End-to-end journey tests. These run against a real Next.js server and a real
 * PostgreSQL database (see .env). The AI provider is intentionally unset, so
 * the app runs in clearly-labelled MOCK mode — the journey still exercises the
 * full persistence + deterministic decision engine path.
 */

function uniqueEmail(tag: string) {
  return `e2e.${tag}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
}

/** Wait until the auth form has hydrated so submits are handled client-side. */
async function gotoHydratedAuthPage(page: Page, path: string) {
  await page.goto(path);
  await page.locator('form[data-hydrated="true"]').waitFor({ state: "attached" });
}

async function registerAndLogin(page: Page, tag: string) {
  const email = uniqueEmail(tag);
  await gotoHydratedAuthPage(page, "/sign-up");
  await page.getByLabel("Full name").fill("E2E Tester");
  await page.getByLabel("Email").fill(email);
  // `exact` avoids matching the "Show password" toggle's aria-label.
  await page.getByLabel("Password", { exact: true }).fill("TestPassw0rd!");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/dashboard", { timeout: 30_000 });
  return email;
}

async function analyzeItem(page: Page, itemName: string) {
  await page.goto("/analyze");
  await page.getByRole("button", { name: "Home Appliances" }).click();
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByLabel("Item name").fill(itemName);
  await page
    .getByLabel("Problem description")
    .fill("The kettle stops heating after a few seconds and then cools down.");
  await page.getByRole("button", { name: "Next" }).click(); // images step
  await page.getByRole("button", { name: "Next" }).click(); // review step

  await page.getByRole("button", { name: "Run AI analysis" }).click();
  await page.waitForURL(/\/analysis\//, { timeout: 60_000 });
  return page.url();
}

test("a new user can sign up, analyze an item and read the report", async ({ page }) => {
  await registerAndLogin(page, "analyze");

  // Dashboard renders only real, user-specific data (no seeded fake stats).
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await analyzeItem(page, "E2E Kettle");

  await expect(page.getByRole("heading", { name: "E2E Kettle" })).toBeVisible();
  // The mock provider must be clearly labelled.
  await expect(page.getByText("DEMO MODE — simulated analysis")).toBeVisible();
  await expect(page.getByText("Estimate only — not a verified quote.").first()).toBeVisible();
});

test("repair-vs-replace decision can be saved to the sustainability record", async ({ page }) => {
  await registerAndLogin(page, "compare");
  await analyzeItem(page, "E2E Mixer");

  await page.getByRole("link", { name: /Compare Repair vs Replacement/i }).click();
  await page.waitForURL(/\/compare\//);
  await expect(page.getByRole("heading", { name: /Repair vs\.? Replace/i })).toBeVisible();

  await page.getByLabel(/Repair cost/i).fill("600");
  await page.getByLabel(/Replacement cost/i).fill("2500");
  await page.getByRole("button", { name: /Save this decision/i }).click();

  await page.goto("/sustainability");
  await expect(page.getByRole("heading", { name: "Sustainability impact" })).toBeVisible();
  // Impact figures are labelled as estimates with a documented methodology.
  await expect(page.getByText(/documented estimates|estimate/i).first()).toBeVisible();
  await expect(page.getByText("E2E Mixer")).toBeVisible();
});

test("a user can request a repair quote from a demo professional", async ({ page }) => {
  await registerAndLogin(page, "request");
  await analyzeItem(page, "E2E Toaster");

  await page.goto("/professionals");
  await page.getByRole("link", { name: /GreenTech Electronics Repair/i }).click();
  await page.waitForURL(/\/professionals\//);

  await expect(page.getByText("Demo data")).toBeVisible();
  await page.getByLabel("Item to repair").selectOption({ index: 1 });
  await page
    .getByLabel("Describe the service needed")
    .fill("Please replace the damaged heating element and test the appliance.");
  await page.getByRole("button", { name: "Request a quotation" }).click();

  await page.waitForURL(/\/requests\//, { timeout: 30_000 });
  await expect(page.getByText(/PENDING/i).first()).toBeVisible();
});
