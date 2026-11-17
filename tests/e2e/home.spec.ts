import { expect, test } from "@playwright/test";
import { dismissToasts, expectNoRenderErrors, stabilise, waitForRender } from "./helpers";

test.describe("landing page", () => {
  test("renders the hero with a live dashboard preview", async ({ page }) => {
    await page.goto("/");
    await stabilise(page);

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Home Assistant dashboards");
    await waitForRender(page, 4);
    await expectNoRenderErrors(page);

    // The hero preview is a real render: it must contain HA cards with entity names.
    const preview = page.locator('[data-testid="dashboard-preview"]').first();
    await expect(preview).toBeVisible();
    await expect(preview.getByText("Living room ceiling").first()).toBeVisible();
  });

  test("switching the hero style re-renders", async ({ page }) => {
    await page.goto("/");
    await stabilise(page);
    await waitForRender(page, 4);

    await page.getByRole("tab", { name: "Mushroom mobile" }).click();
    await expect(page.getByRole("tab", { name: "Mushroom mobile" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await waitForRender(page, 1);
  });

  test("the stats reflect a non-empty catalogue", async ({ page }) => {
    await page.goto("/");
    const value = await page
      .locator("dd")
      .first()
      .innerText();
    expect(Number(value.replace(/\D/g, ""))).toBeGreaterThan(50);
  });

  test("navigation reaches every top-level page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Gallery", exact: true }).click();
    await expect(page).toHaveURL(/\/gallery$/);
    await page.getByRole("link", { name: "Sources", exact: true }).click();
    await expect(page).toHaveURL(/\/sources$/);
    await page.getByRole("link", { name: "Builder", exact: true }).click();
    await expect(page).toHaveURL(/\/builder$/);
  });

  test("visual: landing page", async ({ page }) => {
    await page.goto("/");
    await stabilise(page);
    await waitForRender(page, 4);
    await dismissToasts(page);
    await expect(page).toHaveScreenshot("home-dark.png", {
      fullPage: false,
      mask: [page.locator("dd")],
    });
  });
});
