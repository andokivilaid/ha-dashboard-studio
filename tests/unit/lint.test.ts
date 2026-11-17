import { describe, expect, it } from "vitest";
import { formatLintForModel, lintDashboard, type LovelaceConfig } from "@ha-studio/lovelace";

const rules = (config: LovelaceConfig, ctx = {}) =>
  lintDashboard(config, ctx).map((i) => i.rule);

describe("Bubble Card pop-up rules", () => {
  const popUp = { type: "custom:bubble-card", card_type: "pop-up", hash: "#living-room" };
  const tile = { type: "tile", entity: "light.a" };

  it("accepts pop-ups placed last", () => {
    const issues = rules({
      views: [{ title: "Home", path: "home", cards: [tile, popUp] }],
    } as LovelaceConfig);
    expect(issues).not.toContain("bubble-popup-last");
    expect(issues).not.toContain("bubble-popup-hash");
  });

  it("rejects a visible card after a pop-up", () => {
    expect(
      rules({ views: [{ title: "Home", path: "home", cards: [popUp, tile] }] } as LovelaceConfig),
    ).toContain("bubble-popup-last");
  });

  it("accepts several pop-ups in a row at the end", () => {
    expect(
      rules({
        views: [{ title: "H", path: "h", cards: [tile, popUp, { ...popUp, hash: "#kitchen" }] }],
      } as LovelaceConfig),
    ).not.toContain("bubble-popup-last");
  });

  it("requires a hash that opens the pop-up", () => {
    const noHash = { type: "custom:bubble-card", card_type: "pop-up" };
    expect(
      rules({ views: [{ title: "H", path: "h", cards: [noHash] }] } as LovelaceConfig),
    ).toContain("bubble-popup-hash");
    const badHash = { type: "custom:bubble-card", card_type: "pop-up", hash: "living-room" };
    expect(
      rules({ views: [{ title: "H", path: "h", cards: [badHash] }] } as LovelaceConfig),
    ).toContain("bubble-popup-hash");
  });

  it("warns when a pop-up is buried in a section grid", () => {
    expect(
      rules({
        views: [
          { title: "H", path: "h", type: "sections", sections: [{ type: "grid", cards: [popUp] }] },
        ],
      } as LovelaceConfig),
    ).toContain("bubble-popup-in-section");
  });

  it("ignores non-pop-up bubble cards", () => {
    const button = { type: "custom:bubble-card", card_type: "button", entity: "light.a" };
    const issues = rules({
      views: [{ title: "H", path: "h", cards: [button, tile] }],
    } as LovelaceConfig);
    expect(issues).not.toContain("bubble-popup-last");
    expect(issues).not.toContain("bubble-popup-hash");
  });
});

describe("sections view rules", () => {
  it("rejects a sections view with no sections", () => {
    expect(
      rules({ views: [{ title: "H", path: "h", type: "sections" }] } as LovelaceConfig),
    ).toContain("sections-view-empty");
  });

  it("warns about loose cards in a sections view", () => {
    expect(
      rules({
        views: [
          {
            title: "H",
            path: "h",
            type: "sections",
            sections: [{ type: "grid", cards: [{ type: "tile", entity: "light.a" }] }],
            cards: [{ type: "tile", entity: "light.b" }],
          },
        ],
      } as LovelaceConfig),
    ).toContain("sections-view-loose-cards");
  });

  it("allows pop-ups as the view's only loose cards", () => {
    expect(
      rules({
        views: [
          {
            title: "H",
            path: "h",
            type: "sections",
            sections: [{ type: "grid", cards: [{ type: "tile", entity: "light.a" }] }],
            cards: [{ type: "custom:bubble-card", card_type: "pop-up", hash: "#a" }],
          },
        ],
      } as LovelaceConfig),
    ).not.toContain("sections-view-loose-cards");
  });

  it("nudges for a title and a path", () => {
    const issues = rules({ views: [{ cards: [] }] } as LovelaceConfig);
    expect(issues).toEqual(expect.arrayContaining(["view-title", "view-path"]));
  });
});

describe("custom card availability", () => {
  const config = {
    views: [
      {
        title: "H",
        path: "h",
        cards: [
          { type: "custom:mushroom-light-card", entity: "light.a" },
          { type: "custom:some-card-nobody-has", entity: "light.a" },
        ],
      },
    ],
  } as LovelaceConfig;

  it("flags only the cards the instance lacks", () => {
    const issues = lintDashboard(config, {
      availableCustomCards: ["mushroom-light-card"],
    }).filter((i) => i.rule === "custom-card-unavailable");
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("some-card-nobody-has");
    expect(issues[0].severity).toBe("error");
  });

  it("checks nothing when no vocabulary is supplied", () => {
    expect(rules(config)).not.toContain("custom-card-unavailable");
  });

  it("finds custom cards nested inside stacks", () => {
    const nested = {
      views: [
        {
          title: "H",
          path: "h",
          cards: [
            { type: "vertical-stack", cards: [{ type: "custom:deep-card", entity: "light.a" }] },
          ],
        },
      ],
    } as LovelaceConfig;
    const issues = lintDashboard(nested, { availableCustomCards: [] });
    expect(issues.some((i) => i.message.includes("deep-card"))).toBe(true);
  });
});

describe("entity checks", () => {
  const config = {
    views: [
      {
        title: "H",
        path: "h",
        cards: [
          { type: "tile", entity: "light.real" },
          { type: "tile", entity: "light.imaginary" },
        ],
      },
    ],
  } as LovelaceConfig;

  it("flags ids that are not in the inventory", () => {
    const issues = lintDashboard(config, { knownEntities: ["light.real"] });
    const missing = issues.filter((i) => i.rule === "unknown-entity");
    expect(missing).toHaveLength(1);
    expect(missing[0].message).toContain("light.imaginary");
  });

  it("accepts a Set as well as an array", () => {
    expect(
      lintDashboard(config, { knownEntities: new Set(["light.real", "light.imaginary"]) }).filter(
        (i) => i.rule === "unknown-entity",
      ),
    ).toEqual([]);
  });

  it("summarises instead of listing dozens", () => {
    const many = {
      views: [
        {
          title: "H",
          path: "h",
          cards: Array.from({ length: 20 }, (_, i) => ({ type: "tile", entity: `light.x${i}` })),
        },
      ],
    } as LovelaceConfig;
    const issues = lintDashboard(many, { knownEntities: [] }).filter(
      (i) => i.rule === "unknown-entity",
    );
    expect(issues).toHaveLength(13);
    expect(issues.at(-1)!.message).toContain("further entity ids");
  });
});

describe("formatLintForModel", () => {
  it("omits informational nudges and returns nothing when clean", () => {
    expect(formatLintForModel([{ rule: "view-title", severity: "info", message: "x" }])).toBe("");
    expect(formatLintForModel([])).toBe("");
  });

  it("renders errors and warnings as an instruction", () => {
    const out = formatLintForModel([
      { rule: "bubble-popup-last", severity: "error", message: "Move pop-ups last.", where: "view 1" },
      { rule: "sections-view-loose-cards", severity: "warning", message: "Cards belong in a section." },
    ]);
    expect(out).toContain("fix every one of these");
    expect(out).toContain("[error] view 1: Move pop-ups last.");
    expect(out).toContain("[warning] Cards belong in a section.");
  });
});
