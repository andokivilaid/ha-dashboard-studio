import { expect, test } from "@playwright/test";
import { dismissToasts, expectNoRenderErrors, stabilise, waitForRender } from "./helpers";

const CURATED = [
  { slug: "studio-sections-home", name: "Sections home", expect: "Living room" },
  { slug: "studio-classic-masonry", name: "Classic masonry", expect: "Lights" },
  { slug: "studio-wall-tablet", name: "Wall tablet", expect: "Scenes" },
  { slug: "studio-mushroom-mobile", name: "Mushroom mobile", expect: "Good evening" },
];

test.describe("dashboard detail", () => {
  for (const entry of CURATED) {
    test(`renders ${entry.name} with real cards`, async ({ page }) => {
      await page.goto(`/gallery/${entry.slug}`);
      await stabilise(page);
      await waitForRender(page, 3);
      await expectNoRenderErrors(page);
      await expect(page.locator('[data-testid="detail-render"]')).toBeVisible();
      await expect(page.getByText(entry.expect).first()).toBeVisible();
    });
  }

  test("shows the YAML and copies it", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/gallery/studio-sections-home");
    await page.getByRole("button", { name: "yaml" }).click();
    await expect(page.locator("pre code")).toContainText("views:");
    await page.getByRole("button", { name: "Copy YAML" }).click();
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
  });

  test("lists the elements the dashboard uses", async ({ page }) => {
    await page.goto("/gallery/studio-mushroom-mobile");
    await page.getByRole("button", { name: "elements" }).click();
    await expect(page.getByText("custom:mushroom-light-card")).toBeVisible();
    await expect(page.getByText("Mushroom — renders").first()).toBeVisible();
  });

  test("device sizes change the rendered width", async ({ page }) => {
    await page.goto("/gallery/studio-sections-home");
    await stabilise(page);
    await waitForRender(page, 3);

    const root = page.locator('[data-testid="dashboard-render-root"]');
    const desktop = (await root.boundingBox())!.width;
    await page.getByRole("button", { name: "Phone" }).click();
    await expect.poll(async () => (await root.boundingBox())!.width).toBeLessThan(desktop);
  });

  test("sends a dashboard to the builder", async ({ page }) => {
    await page.goto("/gallery/studio-sections-home");
    await page.getByRole("link", { name: "Open in builder" }).click();
    await expect(page).toHaveURL(/\/builder\?from=/);
    await expect(page.locator('[data-testid="preview-pane"]')).toBeVisible();
  });

  test("visual: detail render", async ({ page }) => {
    await page.goto("/gallery/studio-sections-home");
    await stabilise(page);
    await waitForRender(page, 6);
    await dismissToasts(page);
    await expect(page.locator('[data-testid="detail-render"]')).toHaveScreenshot(
      "detail-sections.png",
    );
  });

  test("visual: classic masonry render", async ({ page }) => {
    await page.goto("/gallery/studio-classic-masonry");
    await stabilise(page);
    await waitForRender(page, 6);
    await dismissToasts(page);
    await expect(page.locator('[data-testid="detail-render"]')).toHaveScreenshot(
      "detail-masonry.png",
    );
  });
});
