import { describe, expect, it } from "vitest";
import {
  assessCustomCards,
  availableCustomCards,
  describeResources,
  CUSTOM_CARD_BUNDLES,
} from "@ha-studio/lovelace";

/** The shape HACS actually registers in `lovelace/resources`. */
const HACS = [
  { url: "/hacsfiles/lovelace-mushroom/mushroom.js?hacstag=123", type: "module" },
  { url: "/hacsfiles/Bubble-Card/bubble-card.js?hacstag=456", type: "module" },
  { url: "/hacsfiles/lovelace-auto-entities/auto-entities.js", type: "module" },
  { url: "/local/community/some-unknown-thing/thing.js", type: "module" },
];

describe("describeResources", () => {
  const described = describeResources(HACS);

  it("recognises bundles from their HACS path", () => {
    expect(described[0].bundle?.slug).toBe("mushroom");
    expect(described[1].bundle?.slug).toBe("bubble-card");
    expect(described[2].bundle?.slug).toBe("auto-entities");
  });

  it("keeps unknown resources with a readable label", () => {
    expect(described[3].bundle).toBeNull();
    expect(described[3].label).toBe("thing");
  });

  it("strips the hacstag query from the filename", () => {
    expect(described[0].label).toBe("mushroom");
  });

  it("defaults the type when the instance omits it", () => {
    expect(describeResources([{ url: "/x/y.js" } as never])[0].type).toBe("module");
  });
});

describe("assessCustomCards", () => {
  const resources = describeResources(HACS);

  it("separates installed-on-instance from renderable-here", () => {
    const [mushroom, apex, unknown] = assessCustomCards(
      ["custom:mushroom-light-card", "custom:apexcharts-card", "custom:some-card-nobody-has"],
      resources,
    );
    expect(mushroom).toMatchObject({ installedUpstream: true, renderable: true });
    // We can draw apexcharts, but this instance has not installed it.
    expect(apex).toMatchObject({ installedUpstream: false, renderable: true });
    expect(unknown).toMatchObject({ installedUpstream: false, renderable: false });
  });

  it("accepts tags with or without the custom: prefix", () => {
    expect(assessCustomCards(["mushroom-light-card"], resources)[0].installedUpstream).toBe(true);
  });
});

describe("availableCustomCards", () => {
  it("offers everything the renderer supports in mock mode", () => {
    const all = availableCustomCards(null);
    expect(all).toContain("mushroom-light-card");
    expect(all).toContain("apexcharts-card");
    expect(all.length).toBe(CUSTOM_CARD_BUNDLES.flatMap((b) => b.provides).length);
  });

  it("narrows to what the instance installed in live mode", () => {
    const live = availableCustomCards(describeResources(HACS));
    expect(live).toContain("mushroom-light-card");
    expect(live).toContain("bubble-card");
    expect(live).toContain("auto-entities");
    expect(live).not.toContain("apexcharts-card");
  });

  it("returns nothing when the instance registered no recognised resources", () => {
    expect(availableCustomCards([])).toEqual([]);
  });
});
