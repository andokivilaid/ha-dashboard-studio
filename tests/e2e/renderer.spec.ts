import { expect, test } from "@playwright/test";
import { expectNoRenderErrors, stabilise, waitForRender } from "./helpers";

/**
 * Exercises the card renderer itself by typing configs into the builder and
 * asserting on what lands in the DOM.
 */
async function setYaml(page: import("@playwright/test").Page, yaml: string) {
  await page.goto("/builder?template=blank");
  await stabilise(page);
  const editor = page.locator(".cm-content");
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.insertText(yaml);
  await page.waitForTimeout(400);
}

test.describe("card renderer", () => {
  test("tile card shows name, state and a brightness feature", async ({ page }) => {
    await setYaml(
      page,
      [
        "views:",
        "  - type: sections",
        "    sections:",
        "      - type: grid",
        "        cards:",
        "          - type: tile",
        "            entity: light.living_room_ceiling",
        "            features:",
        "              - type: light-brightness",
      ].join("\n"),
    );
    await waitForRender(page, 1);
    const tile = page.locator(".hui-tile-card").first();
    await expect(tile.locator(".hui-tile__name")).toHaveText("Living room ceiling");
    await expect(tile.locator(".hui-tile__state")).toHaveText("On");
    // 196/255 brightness -> 77%
    await expect(tile.locator(".hui-feature-bar__label")).toHaveText("77%");
  });

  test("entities card renders a row per entity with toggles", async ({ page }) => {
    await setYaml(
      page,
      [
        "views:",
        "  - cards:",
        "      - type: entities",
        "        title: Lights",
        "        show_header_toggle: true",
        "        entities:",
        "          - light.living_room_ceiling",
        "          - light.bedroom",
        "          - type: divider",
        "          - switch.coffee_machine",
      ].join("\n"),
    );
    await waitForRender(page, 1);
    const card = page.locator(".hui-entities-card").first();
    await expect(card.locator(".hui-entities-row")).toHaveCount(3);
    await expect(card.locator(".hui-section-divider")).toHaveCount(1);
    await expect(card.locator('.hui-toggle[data-on="true"]').first()).toBeVisible();
  });

  test("thermostat shows current and target temperature", async ({ page }) => {
    await setYaml(page, "views:\n  - cards:\n      - type: thermostat\n        entity: climate.living_room\n");
    await waitForRender(page, 1);
    await expect(page.locator(".hui-thermostat__target")).toHaveText("21.5");
    await expect(page.locator(".hui-thermostat__current")).toContainText("21.4");
    await expect(page.locator(".hui-thermostat__action")).toHaveText("heating");
  });

  test("weather card shows the forecast row", async ({ page }) => {
    await setYaml(
      page,
      "views:\n  - cards:\n      - type: weather-forecast\n        entity: weather.home\n        show_forecast: true\n",
    );
    await waitForRender(page, 1);
    await expect(page.locator(".hui-weather__day")).toHaveCount(5);
    await expect(page.locator(".hui-weather__temp")).toHaveText("8.6°");
  });

  test("gauge maps the value onto the arc", async ({ page }) => {
    await setYaml(
      page,
      "views:\n  - cards:\n      - type: gauge\n        entity: sensor.phone_battery\n        min: 0\n        max: 100\n",
    );
    await waitForRender(page, 1);
    await expect(page.locator(".hui-gauge__value")).toHaveText("68");
  });

  test("history graph draws one path per entity", async ({ page }) => {
    await setYaml(
      page,
      [
        "views:",
        "  - cards:",
        "      - type: history-graph",
        "        entities:",
        "          - sensor.living_room_temperature",
        "          - sensor.outdoor_temperature",
      ].join("\n"),
    );
    await waitForRender(page, 1);
    await expect(page.locator(".hui-graph__svg path")).toHaveCount(2);
    await expect(page.locator(".hui-graph__legend span")).toHaveCount(2);
  });

  test("badges render above the view", async ({ page }) => {
    await setYaml(
      page,
      [
        "views:",
        "  - type: sections",
        "    badges:",
        "      - type: entity",
        "        entity: person.ando",
        "      - type: entity",
        "        entity: sensor.outdoor_temperature",
        "    sections:",
        "      - type: grid",
        "        cards:",
        "          - type: tile",
        "            entity: light.bedroom",
      ].join("\n"),
    );
    await waitForRender(page, 1);
    await expect(page.locator(".hui-badge")).toHaveCount(2);
    await expect(page.locator(".hui-badge__state").first()).toHaveText("Home");
  });

  test("stacks and grids nest correctly", async ({ page }) => {
    await setYaml(
      page,
      [
        "views:",
        "  - cards:",
        "      - type: horizontal-stack",
        "        cards:",
        "          - type: button",
        "            entity: scene.movie_night",
        "          - type: vertical-stack",
        "            cards:",
        "              - type: button",
        "                entity: scene.dinner",
        "              - type: button",
        "                entity: scene.all_off",
      ].join("\n"),
    );
    await waitForRender(page, 1);
    await expect(page.locator(".hui-stack--horizontal")).toHaveCount(1);
    await expect(page.locator(".hui-stack--vertical")).toHaveCount(1);
    await expect(page.locator(".hui-button-card")).toHaveCount(3);
  });

  test("conditional cards dim when their condition is false", async ({ page }) => {
    await setYaml(
      page,
      [
        "views:",
        "  - cards:",
        "      - type: conditional",
        "        conditions:",
        "          - entity: light.bedroom",
        "            state: 'on'",
        "        card:",
        "          type: tile",
        "          entity: light.bedroom",
      ].join("\n"),
    );
    await waitForRender(page, 1);
    await expect(page.locator('[data-conditional-hidden="true"]')).toHaveCount(1);
  });

  test("an unknown card type degrades to a labelled placeholder", async ({ page }) => {
    await setYaml(page, "views:\n  - cards:\n      - type: some-future-card\n        entity: light.bedroom\n");
    await waitForRender(page, 1);
    const fallback = page.locator(".hui-fallback-card");
    await expect(fallback).toBeVisible();
    await expect(fallback).toContainText("some-future-card");
    await expectNoRenderErrors(page);
  });

  test("an unknown custom card says which bundle is missing", async ({ page }) => {
    await setYaml(page, "views:\n  - cards:\n      - type: custom:totally-made-up-card\n");
    await waitForRender(page, 1);
    await expect(page.locator(".hui-fallback-card")).toContainText("custom:totally-made-up-card");
    await expect(page.locator(".hui-fallback-card")).toContainText("not in the bundled registry");
  });

  test("real Mushroom cards load from the HACS proxy and render", async ({ page }) => {
    await setYaml(
      page,
      [
        "views:",
        "  - type: sections",
        "    sections:",
        "      - type: grid",
        "        cards:",
        "          - type: custom:mushroom-light-card",
        "            entity: light.living_room_ceiling",
        "            show_brightness_control: true",
      ].join("\n"),
    );
    const host = page.locator('[data-custom-card="mushroom-light-card"]');
    await expect(host).toBeVisible({ timeout: 30_000 });
    await expect(host).toHaveAttribute("data-state", "ready", { timeout: 45_000 });
    // The real custom element must exist in the DOM.
    await expect(page.locator("mushroom-light-card")).toHaveCount(1);
  });

  test("the HACS proxy serves JavaScript for every registered bundle", async ({ request }) => {
    for (const slug of ["mushroom", "bubble-card", "button-card", "mini-graph-card", "card-mod"]) {
      const res = await request.get(`/api/hacs/${slug}.js`);
      expect(res.status(), slug).toBe(200);
      expect(res.headers()["content-type"], slug).toContain("javascript");
      expect((await res.text()).length, slug).toBeGreaterThan(5000);
    }
  });

  test("the proxy rejects an unknown bundle", async ({ request }) => {
    const res = await request.get("/api/hacs/not-a-bundle.js");
    expect(res.status()).toBe(404);
  });
});
