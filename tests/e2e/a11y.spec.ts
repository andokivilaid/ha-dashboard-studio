import { expect, test } from "@playwright/test";

const PAGES = ["/", "/gallery", "/gallery/studio-sections-home", "/builder", "/sources", "/docs/connect"];

test.describe("accessibility basics", () => {
  for (const path of PAGES) {
    test(`${path} has one h1, a main landmark and a title`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(400);
      await expect(page).toHaveTitle(/.+/);
      await expect(page.locator("main")).toHaveCount(1);
      if (path !== "/builder") {
        // A rendered dashboard may contain its own headings; only the page
        // chrome is under test here.
        const chromeH1s = await page.evaluate(
          () =>
            [...document.querySelectorAll("h1")].filter((h) => !h.closest(".ha-render-root")).length,
        );
        expect(chromeH1s).toBe(1);
      }
    });
  }

  test("every image has alt text", async ({ page }) => {
    await page.goto("/gallery/studio-sections-home");
    const missing = await page.locator("img:not([alt])").count();
    expect(missing).toBe(0);
  });

  test("the theme toggle is reachable and labelled", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: /Theme:/ });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(toggle).toBeVisible();
  });

  test("light theme applies to the renderer too", async ({ page }) => {
    await page.goto("/gallery/studio-sections-home");
    await page.evaluate(() => window.localStorage.setItem("theme", "light"));
    await page.reload();
    await expect(page.locator("html.dark")).toHaveCount(0);
    await expect(page.locator('[data-testid="dashboard-render-root"]')).toHaveAttribute(
      "data-theme",
      "light",
    );
  });
});
