import { expect, test } from "@playwright/test";
import { dismissToasts, expectNoRenderErrors, stabilise, waitForRender } from "./helpers";

test.describe("gallery", () => {
  test("lists dashboards and renders previews live", async ({ page }) => {
    await page.goto("/gallery");
    await stabilise(page);

    await expect(page.getByRole("heading", { name: "Dashboard gallery" })).toBeVisible();

    const cards = page.locator('a[href^="/gallery/"]');
    await expect.poll(() => cards.count()).toBeGreaterThan(10);

    // Previews are real renders, so HA cards must appear inside the grid.
    await waitForRender(page, 4);
    await expectNoRenderErrors(page);
  });

  test("search narrows the result count", async ({ page }) => {
    await page.goto("/gallery");
    const counter = page.getByText(/dashboards?$|dashboards? matching/);
    const before = Number((await counter.first().innerText()).replace(/\D/g, ""));

    await page.getByLabel("Search dashboards").fill("mushroom");
    await expect
      .poll(async () => Number((await counter.first().innerText()).replace(/\D/g, "")), {
        timeout: 10_000,
      })
      .toBeLessThan(before);
    await expect.poll(async () => Number((await counter.first().innerText()).replace(/\D/g, ""))).toBeGreaterThan(0);
  });

  test("filters by style tag and clears again", async ({ page }) => {
    await page.goto("/gallery");
    await page.getByRole("button", { name: /Filters/ }).click();

    const chip = page.getByRole("button", { name: /^sections-view/ }).first();
    await chip.click();
    await expect(page.getByRole("button", { name: /^sections-view/ }).first()).toHaveAttribute(
      "data-active",
      "true",
    );

    await page.getByRole("button", { name: "Clear all" }).click();
    await expect(page.getByRole("button", { name: "Clear all" })).toHaveCount(0);
  });

  test("renderable-only filter removes metadata-only entries", async ({ page }) => {
    await page.goto("/gallery");
    await page.getByText("Renderable only").click();
    await expect.poll(() => page.getByText("Metadata only").count(), { timeout: 10_000 }).toBe(0);
  });

  test("empty state appears for nonsense queries", async ({ page }) => {
    await page.goto("/gallery");
    await page.getByLabel("Search dashboards").fill("zzzzz-no-such-dashboard");
    await expect(page.getByText("Nothing matches those filters")).toBeVisible();
  });

  test("visual: gallery grid", async ({ page }) => {
    await page.goto("/gallery");
    await stabilise(page);
    await waitForRender(page, 4);
    await dismissToasts(page);
    await page.waitForTimeout(600);
    await expect(page).toHaveScreenshot("gallery-dark.png", { fullPage: false });
  });
});
