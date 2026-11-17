import { describe, expect, it } from "vitest";
import {
  formatYaml,
  neutralizeHaTags,
  normalizeLovelaceConfig,
  parseLovelaceYaml,
  toLovelaceYaml,
} from "@ha-studio/lovelace";

describe("neutralizeHaTags", () => {
  it("quotes HA-only tags so a standard parser accepts them", () => {
    const src = ["views:", "  - cards: !include lights.yaml", "    title: Home"].join("\n");
    const { text, tags } = neutralizeHaTags(src);
    expect(tags).toEqual(["!include lights.yaml"]);
    expect(text).toContain('cards: "!include lights.yaml"');
  });

  it("leaves ordinary values untouched", () => {
    const src = "views:\n  - title: Not! A tag\n";
    expect(neutralizeHaTags(src).tags).toEqual([]);
  });

  it("handles every documented include variant plus !secret", () => {
    const src = [
      "a: !include_dir_merge_list views/",
      "b: !include_dir_named cards/",
      "c: !secret my_token",
      "d: !env_var HOME",
    ].join("\n");
    expect(neutralizeHaTags(src).tags).toHaveLength(4);
  });
});

describe("parseLovelaceYaml", () => {
  it("parses a sections dashboard", () => {
    const { config, errors } = parseLovelaceYaml(`
title: Home
views:
  - title: Main
    type: sections
    sections:
      - type: grid
        cards:
          - type: tile
            entity: light.kitchen
`);
    expect(errors).toEqual([]);
    expect(config?.views).toHaveLength(1);
    expect(config?.views[0].sections?.[0].cards?.[0].type).toBe("tile");
  });

  it("never throws on malformed input", () => {
    const result = parseLovelaceYaml("views:\n  - : : :\n\t bad");
    expect(result.config === null || typeof result.config === "object").toBe(true);
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it("reports unresolved includes alongside the config", () => {
    const { config, unresolvedIncludes } = parseLovelaceYaml(
      "views: !include_dir_merge_list views/\n",
    );
    expect(unresolvedIncludes).toHaveLength(1);
    expect(config).toBeNull();
  });

  it("resolves anchors and aliases without an alias-count error", () => {
    const { config, errors } = parseLovelaceYaml(`
views:
  - title: A
    cards:
      - &tile
        type: tile
        entity: light.a
      - *tile
      - *tile
`);
    expect(errors).toEqual([]);
    expect(config?.views[0].cards).toHaveLength(3);
  });
});

describe("normalizeLovelaceConfig", () => {
  it("wraps a bare list of views", () => {
    const config = normalizeLovelaceConfig([{ title: "A", cards: [] }]);
    expect(config?.views).toHaveLength(1);
  });

  it("wraps a single view object", () => {
    const config = normalizeLovelaceConfig({ title: "A", cards: [{ type: "tile" }] });
    expect(config?.views[0].cards).toHaveLength(1);
  });

  it("wraps a single card", () => {
    const config = normalizeLovelaceConfig({ type: "tile", entity: "light.a" });
    expect(config?.views[0].cards?.[0].type).toBe("tile");
  });

  it("rejects unrelated documents", () => {
    expect(normalizeLovelaceConfig({ automation: [] })).toBeNull();
    expect(normalizeLovelaceConfig("hello")).toBeNull();
    expect(normalizeLovelaceConfig(null)).toBeNull();
  });
});

describe("round trip", () => {
  it("serialises and re-parses to the same structure", () => {
    const config = {
      views: [
        { title: "Home", type: "sections", sections: [{ type: "grid", cards: [{ type: "tile", entity: "light.a" }] }] },
      ],
    };
    const yaml = toLovelaceYaml(config);
    expect(parseLovelaceYaml(yaml).config).toEqual(config);
  });

  it("formatYaml normalises indentation", () => {
    const messy = "views:\n- title: A\n  cards:\n  - type: tile\n    entity: light.a\n";
    expect(formatYaml(messy)).toContain("  - title: A");
  });
});
