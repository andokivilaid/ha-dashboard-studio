import { expect, test } from "@playwright/test";
import { dismissToasts, expectNoRenderErrors, stabilise, waitForRender } from "./helpers";

test.describe("builder (mock mode)", () => {
  test("opens with a renderable template", async ({ page }) => {
    await page.goto("/builder");
    await stabilise(page);
    await waitForRender(page, 5);
    await expectNoRenderErrors(page);

    await expect(page.locator('[data-testid="preview-pane"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-panel"]')).toBeVisible();
    await expect(page.getByText("Mock data")).toBeVisible();
  });

  test("the YAML editor drives the preview", async ({ page }) => {
    await page.goto("/builder?template=blank");
    await stabilise(page);

    const editor = page.locator(".cm-content");
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.press("ControlOrMeta+a");
    // insertText, not type(): CodeMirror auto-indents typed newlines and would
    // mangle the YAML.
    await page.keyboard.insertText(
      [
        "views:",
        "  - title: Test view",
        "    type: sections",
        "    sections:",
        "      - type: grid",
        "        cards:",
        "          - type: heading",
        "            heading: Playwright section",
        "          - type: tile",
        "            entity: light.living_room_ceiling",
        "          - type: tile",
        "            entity: sensor.living_room_temperature",
      ].join("\n"),
    );

    await waitForRender(page, 2);
    await expect(page.getByText("Playwright section")).toBeVisible();
    await expect(page.locator('[data-testid="preview-pane"]').getByText("Living room ceiling")).toBeVisible();
    await expect(page.locator('[data-testid="yaml-status"]')).toContainText("1 views");
  });

  test("invalid YAML is reported instead of crashing", async ({ page }) => {
    await page.goto("/builder?template=blank");
    const editor = page.locator(".cm-content");
    await editor.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.insertText("not: a dashboard\n");
    await expect(page.locator('[data-testid="yaml-status"]')).toContainText("views");
    await expect(page.getByText("Nothing to render")).toBeVisible();
  });

  test("templates can be swapped from the toolbar", async ({ page }) => {
    await page.goto("/builder");
    await stabilise(page);
    await page.getByLabel("Start from a template").selectOption("classic-masonry");
    await waitForRender(page, 5);
    await expect(page.locator('[data-testid="preview-pane"]').getByText("Doors & windows")).toBeVisible();
  });

  test("device switches resize the canvas", async ({ page }) => {
    await page.goto("/builder");
    await stabilise(page);
    await waitForRender(page, 4);
    const root = page.locator('[data-testid="dashboard-render-root"]');
    const desktop = (await root.boundingBox())!.width;
    await page.locator('[data-testid="device-phone"]').click();
    await expect.poll(async () => (await root.boundingBox())!.width).toBeLessThan(desktop);
  });

  test("copies YAML to the clipboard", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/builder");
    await page.locator('[data-testid="copy-yaml"]').click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain("views:");
  });

  test("asks for an API key before chatting", async ({ page }) => {
    await page.goto("/builder");
    await expect(page.getByRole("button", { name: "Add an API key to start" })).toBeVisible();
    await page.getByRole("button", { name: "Add an API key to start" }).click();
    await expect(page.getByRole("dialog", { name: "Builder settings" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Anthropic (Claude)", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Google (Gemini)", exact: true })).toBeVisible();
  });

  test("the chat panel works end to end against a stubbed provider", async ({ page }) => {
    // Stub the studio's own API routes so the flow is exercised without
    // spending a real provider call.
    await page.route("**/api/ai/generate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          text: "Built a two-card test view.",
          yaml: [
            "views:",
            "  - title: Stubbed",
            "    type: sections",
            "    sections:",
            "      - type: grid",
            "        cards:",
            "          - type: heading",
            "            heading: Stubbed heading",
            "          - type: tile",
            "            entity: light.kitchen_spots",
          ].join("\n"),
          model: "stub",
        }),
      });
    });
    await page.route("**/api/ai/critique", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ text: "No issues found.", yaml: null, model: "stub" }),
      });
    });

    await page.goto("/builder");
    await page.evaluate(() => {
      window.localStorage.setItem(
        "ha-studio.builder-settings.v1",
        JSON.stringify({
          provider: "anthropic",
          anthropicKey: "sk-ant-test-key-for-e2e-only",
          geminiKey: "",
          model: "",
          visualSelfCheck: true,
          loadCustomCards: false,
        }),
      );
    });
    await page.reload();
    await stabilise(page);

    await page.locator('[data-testid="chat-input"]').fill("Make a test view");
    await page.locator('[data-testid="chat-send"]').click();

    await expect(page.locator('[data-testid="assistant-message"]')).toContainText(
      "Built a two-card test view.",
      { timeout: 30_000 },
    );
    await expect(page.locator('[data-testid="preview-pane"]').getByText("Stubbed heading")).toBeVisible();

    // The visual self-check must actually capture a screenshot and show it.
    const critic = page.locator('[data-testid="critic-message"]');
    await expect(critic).toBeVisible({ timeout: 60_000 });
    await expect(critic.locator("img")).toHaveAttribute("src", /^data:image\/png;base64,/);
    await expect(critic).toContainText("No issues found");
  });

  test("a provider error is surfaced, not swallowed", async ({ page }) => {
    await page.route("**/api/ai/generate", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "invalid x-api-key" }),
      }),
    );
    await page.goto("/builder");
    await page.evaluate(() => {
      window.localStorage.setItem(
        "ha-studio.builder-settings.v1",
        JSON.stringify({
          provider: "anthropic",
          anthropicKey: "sk-ant-bad",
          geminiKey: "",
          model: "",
          visualSelfCheck: false,
          loadCustomCards: false,
        }),
      );
    });
    await page.reload();
    await page.locator('[data-testid="chat-input"]').fill("anything");
    await page.locator('[data-testid="chat-send"]').click();
    await expect(
      page.locator('[data-testid="chat-panel"]').getByRole("alert"),
    ).toContainText("invalid x-api-key");
  });

  test("the connect dialog explains the read-only guarantee", async ({ page }) => {
    await page.goto("/builder");
    await page.locator('[data-testid="connect-button"]').click();
    const dialog = page.getByRole("dialog", { name: "Connect to Home Assistant" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("only ever reads");
    await expect(dialog.getByLabel(/Instance URL/)).toBeVisible();
  });

  test("visual: builder in mock mode", async ({ page }) => {
    await page.goto("/builder");
    await stabilise(page);
    await waitForRender(page, 6);
    await dismissToasts(page);
    await expect(page).toHaveScreenshot("builder-dark.png");
  });
});
