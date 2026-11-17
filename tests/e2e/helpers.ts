import { expect, type Page } from "@playwright/test";

/** Waits until the Lovelace renderer has painted real cards, not skeletons. */
export async function waitForRender(page: Page, minCards = 1) {
  const root = page.locator('[data-testid="dashboard-render-root"]').first();
  await expect(root).toBeVisible({ timeout: 20_000 });
  await expect
    .poll(async () => root.locator(".ha-card, ha-card, .hui-heading, .hui-badge").count(), { timeout: 20_000 })
    .toBeGreaterThanOrEqual(minCards);
  // MDI is a webfont; without it every icon is a blank box in the screenshot.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
}

/** Freezes anything that would make a screenshot flaky. */
export async function stabilise(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
      }
      .hui-skeleton { animation: none !important; }
    `,
  });
}

export async function dismissToasts(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll("[data-sonner-toaster]").forEach((el) => el.remove());
  });
}

/** Fails the test if the renderer produced an HA error card. */
export async function expectNoRenderErrors(page: Page) {
  await expect(page.locator(".hui-error-card")).toHaveCount(0);
}
