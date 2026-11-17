import { expect, test } from "@playwright/test";
import { dismissToasts, stabilise, waitForRender } from "./helpers";

test.describe("mobile", () => {
  test("the landing page is usable at phone width", async ({ page }) => {
    await page.goto("/");
    await stabilise(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // No horizontal overflow.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("the gallery stacks to one column", async ({ page }) => {
    await page.goto("/gallery");
    await stabilise(page);
    await waitForRender(page, 1);
    const cards = page.locator('a[href^="/gallery/"]');
    const first = await cards.first().boundingBox();
    const second = await cards.nth(1).boundingBox();
    expect(first!.y).toBeLessThan(second!.y);
    expect(Math.abs(first!.x - second!.x)).toBeLessThan(2);
  });

  test("visual: gallery on a phone", async ({ page }) => {
    await page.goto("/gallery");
    await stabilise(page);
    await waitForRender(page, 1);
    await dismissToasts(page);
    await page.waitForTimeout(600);
    await expect(page).toHaveScreenshot("gallery-mobile.png");
  });
});
