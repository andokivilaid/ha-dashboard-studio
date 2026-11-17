import { describe, expect, it } from "vitest";
import { extractYaml, stripYaml, DEFAULT_MODELS, PROVIDER_KEY_HELP } from "@/lib/ai/types";
import {
  buildAreaBlock,
  buildGeneratorUserMessage,
  buildInventoryBlock,
  CRITIC_SYSTEM,
  GENERATOR_SYSTEM,
} from "@/lib/ai/prompts";
import { buildEntityInventory, createMockHass } from "@ha-studio/lovelace";

describe("extractYaml", () => {
  it("pulls a fenced yaml block", () => {
    expect(extractYaml("Here you go:\n```yaml\nviews: []\n```")).toBe("views: []");
  });
  it("accepts an unlabelled fence", () => {
    expect(extractYaml("```\nviews: []\n```")).toBe("views: []");
  });
  it("takes the last block when several are present", () => {
    expect(extractYaml("```yaml\na: 1\n```\ntext\n```yaml\nb: 2\n```")).toBe("b: 2");
  });
  it("returns null when there is no block", () => {
    expect(extractYaml("No YAML here.")).toBeNull();
    expect(extractYaml("```yaml\n\n```")).toBeNull();
  });
});

describe("stripYaml", () => {
  it("leaves only the prose", () => {
    expect(stripYaml("Added a tile.\n\n```yaml\nviews: []\n```")).toBe("Added a tile.");
  });
  it("collapses the gap left behind", () => {
    expect(stripYaml("A\n\n```yaml\nx\n```\n\n\nB")).toBe("A\n\nB");
  });
});

describe("prompts", () => {
  it("tells the model to emit exactly one complete yaml block", () => {
    expect(GENERATOR_SYSTEM).toMatch(/exactly one fenced/i);
    expect(GENERATOR_SYSTEM).toMatch(/COMPLETE dashboard config/);
  });
  it("teaches current sections-view practice", () => {
    expect(GENERATOR_SYSTEM).toContain("type: sections");
    expect(GENERATOR_SYSTEM).toContain("grid_options");
    expect(GENERATOR_SYSTEM).toContain("light-brightness");
  });
  it("forbids invented entity ids", () => {
    expect(GENERATOR_SYSTEM).toMatch(/Never invent entity ids/);
  });
  it("asks the critic to judge only what it can see", () => {
    expect(CRITIC_SYSTEM).toMatch(/Judge only what you can SEE/);
    expect(CRITIC_SYSTEM).toMatch(/empty issues list/);
  });
});

describe("buildInventoryBlock", () => {
  const hass = createMockHass();
  const inventory = buildEntityInventory(hass);
  const block = buildInventoryBlock(inventory);

  it("groups by domain with counts", () => {
    expect(block).toMatch(/^# light \(\d+\)$/m);
  });
  it("includes ids, names, areas and states", () => {
    expect(block).toContain("light.living_room_ceiling");
    expect(block).toContain('"Living room ceiling"');
    expect(block).toContain("area=Living room");
  });
  it("notes how many entities it omitted", () => {
    const short = buildInventoryBlock(inventory, 5);
    expect(short).toMatch(/further entities omitted/);
  });
});

describe("buildAreaBlock", () => {
  it("renders areas with floor and counts", () => {
    expect(buildAreaBlock([{ name: "Kitchen", floor: "Ground floor", entityCount: 7 }])).toBe(
      "  Kitchen [Ground floor] — 7 entities",
    );
  });
  it("handles an empty registry", () => {
    expect(buildAreaBlock([])).toBe("(no areas defined)");
  });
});

describe("buildGeneratorUserMessage", () => {
  it("omits the current-yaml section when there is none", () => {
    const msg = buildGeneratorUserMessage({ request: "Make a view", inventory: "x", areas: "y" });
    expect(msg).not.toContain("CURRENT DASHBOARD YAML");
    expect(msg).toContain("USER REQUEST\nMake a view");
  });
  it("includes the current yaml for an edit", () => {
    const msg = buildGeneratorUserMessage({
      request: "Add a light",
      inventory: "x",
      areas: "y",
      currentYaml: "views: []",
    });
    expect(msg).toContain("CURRENT DASHBOARD YAML");
    expect(msg).toContain("views: []");
  });
});

describe("provider defaults", () => {
  it("defaults Anthropic to the current Opus", () => {
    expect(DEFAULT_MODELS.anthropic.generate).toBe("claude-opus-5-5");
    expect(DEFAULT_MODELS.anthropic.vision).toBe("claude-opus-5-5");
  });
  it("knows where to send users for a key", () => {
    expect(PROVIDER_KEY_HELP.anthropic.url).toMatch(/console\.anthropic\.com/);
    expect(PROVIDER_KEY_HELP.gemini.url).toMatch(/aistudio\.google\.com/);
  });
});
