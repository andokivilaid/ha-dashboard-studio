import { describe, expect, it } from "vitest";
import {
  bundleBySlug,
  bundleForCustomCard,
  CUSTOM_CARD_BUNDLES,
  requiredBundles,
  STARTER_TEMPLATES,
  starterById,
  analyzeDashboard,
} from "@ha-studio/lovelace";

describe("custom card registry", () => {
  it("resolves a card type with or without the custom: prefix", () => {
    expect(bundleForCustomCard("custom:mushroom-light-card")?.slug).toBe("mushroom");
    expect(bundleForCustomCard("mushroom-light-card")?.slug).toBe("mushroom");
    expect(bundleForCustomCard("bubble-card")?.slug).toBe("bubble-card");
  });

  it("returns undefined for unknown cards", () => {
    expect(bundleForCustomCard("custom:not-a-real-card")).toBeUndefined();
  });

  it("has a unique slug and an https source per bundle", () => {
    const slugs = CUSTOM_CARD_BUNDLES.map((b) => b.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const b of CUSTOM_CARD_BUNDLES) {
      expect(b.source).toMatch(/^https:\/\//);
      expect(b.license.length).toBeGreaterThan(0);
      expect(b.version.length).toBeGreaterThan(0);
    }
  });

  it("only card-mod declares no elements", () => {
    for (const b of CUSTOM_CARD_BUNDLES) {
      if (b.augmentsOnly) expect(b.provides).toEqual([]);
      else expect(b.provides.length).toBeGreaterThan(0);
    }
  });

  it("deduplicates bundles across many card types", () => {
    const bundles = requiredBundles([
      "mushroom-light-card",
      "mushroom-climate-card",
      "bubble-card",
      "unknown-card",
    ]);
    expect(bundles.map((b) => b.slug).sort()).toEqual(["bubble-card", "mushroom"]);
  });

  it("looks up by slug", () => {
    expect(bundleBySlug("button-card")?.name).toBe("button-card");
    expect(bundleBySlug("nope")).toBeUndefined();
  });
});

describe("starter templates", () => {
  it("every template parses into views with cards", () => {
    for (const t of STARTER_TEMPLATES) {
      expect(t.config.views.length, t.id).toBeGreaterThan(0);
      if (t.id !== "blank") {
        expect(analyzeDashboard(t.config).counts.cards, t.id).toBeGreaterThan(3);
      }
    }
  });

  it("every custom card used by a template is in the registry", () => {
    for (const t of STARTER_TEMPLATES) {
      for (const card of analyzeDashboard(t.config).customCards) {
        expect(bundleForCustomCard(card), `${t.id} uses ${card}`).toBeDefined();
      }
    }
  });

  it("resolves by id", () => {
    expect(starterById("sections-home")?.name).toBe("Sections home");
    expect(starterById("nope")).toBeUndefined();
  });
});
