import { describe, expect, it } from "vitest";
import { analyzeDashboard, deriveTags, type LovelaceConfig } from "@ha-studio/lovelace";

const CONFIG: LovelaceConfig = {
  theme: "ios-dark-mode",
  views: [
    {
      title: "Home",
      type: "sections",
      badges: [{ type: "entity", entity: "person.ando" }, "sensor.outdoor_temperature"],
      sections: [
        {
          type: "grid",
          cards: [
            { type: "heading", heading: "Living room" },
            { type: "tile", entity: "light.living_room", features: [{ type: "light-brightness" }] },
            { type: "custom:mushroom-light-card", entity: "light.kitchen" },
            { type: "custom:bubble-card", card_type: "button", entity: "switch.fan" },
            {
              type: "vertical-stack",
              cards: [{ type: "entities", entities: ["sensor.a", { entity: "sensor.b" }] }],
            },
          ],
        },
      ],
    },
    { title: "Map", panel: true, cards: [{ type: "map", entities: ["person.ando"] }] },
  ],
};

describe("analyzeDashboard", () => {
  const analysis = analyzeDashboard(CONFIG);

  it("separates built-in and custom cards", () => {
    expect(analysis.customCards).toEqual(["bubble-card", "mushroom-light-card"]);
    expect(analysis.cardTypes).toContain("tile");
    expect(analysis.cardTypes).toContain("entities");
    expect(analysis.cardTypes).not.toContain("custom:mushroom-light-card");
  });

  it("does not count view or badge types as cards", () => {
    expect(analysis.cardTypes).not.toContain("sections");
    expect(analysis.viewTypes).toEqual(expect.arrayContaining(["sections", "panel"]));
  });

  it("collects entities from every shape", () => {
    expect(analysis.entities).toEqual(
      expect.arrayContaining([
        "light.living_room",
        "light.kitchen",
        "switch.fan",
        "sensor.a",
        "sensor.b",
        "person.ando",
      ]),
    );
  });

  it("derives domains from entities", () => {
    expect(analysis.domains).toEqual(expect.arrayContaining(["light", "sensor", "person", "switch"]));
  });

  it("counts views, sections, cards and badges", () => {
    expect(analysis.counts.views).toBe(2);
    expect(analysis.counts.sections).toBe(1);
    expect(analysis.counts.cards).toBe(6);
    expect(analysis.counts.badges).toBe(2);
  });

  it("records the pinned theme", () => {
    expect(analysis.theme).toBe("ios-dark-mode");
  });
});

describe("deriveTags", () => {
  it("tags a mushroom sections dashboard", () => {
    const tags = deriveTags(analyzeDashboard(CONFIG));
    expect(tags).toEqual(expect.arrayContaining(["sections-view", "panel", "mushroom", "bubble-card"]));
  });

  it("flags card-mod usage", () => {
    const analysis = analyzeDashboard({
      views: [{ cards: [{ type: "tile", entity: "light.a", card_mod: { style: "" } }] }],
    });
    expect(analysis.usesCardMod).toBe(true);
    expect(deriveTags(analysis)).toContain("card-mod");
  });

  it("flags Jinja templates", () => {
    const analysis = analyzeDashboard({
      views: [{ cards: [{ type: "markdown", content: "{{ states('sensor.a') }}" }] }],
    });
    expect(analysis.usesJinjaTemplates).toBe(true);
  });
});
