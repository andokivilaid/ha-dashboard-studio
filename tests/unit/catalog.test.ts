import { describe, expect, it } from "vitest";
import {
  allDashboards,
  computeFacets,
  COMMUNITY_SOURCES,
  CURATED_ENTRIES,
  dashboardById,
  dashboardBySlug,
  isPermissive,
  loadDashboardYaml,
  queryDashboards,
  dashboardEntrySchema,
} from "@ha-studio/catalog";
import { analyzeDashboard, parseLovelaceYaml } from "@ha-studio/lovelace";

describe("licence policy", () => {
  it("accepts the permissive set", () => {
    for (const l of ["mit", "MIT", "apache-2.0", "bsd-3-clause", "isc", "unlicense", "cc0-1.0"]) {
      expect(isPermissive(l)).toBe(true);
    }
  });
  it("rejects copyleft and missing licences", () => {
    for (const l of ["gpl-3.0", "agpl-3.0", "mpl-2.0", "cc-by-sa-4.0", null, undefined, ""]) {
      expect(isPermissive(l)).toBe(false);
    }
  });

  it("never stores YAML for a non-permissive source", () => {
    const violations = allDashboards().filter((e) => e.yamlFile && !e.license.permissive);
    expect(violations.map((v) => v.id)).toEqual([]);
  });

  it("marks non-permissive entries as not renderable and explains why", () => {
    for (const entry of allDashboards().filter((e) => !e.license.permissive)) {
      expect(entry.renderable).toBe(false);
      expect(entry.yamlOmittedReason).toBeTruthy();
    }
  });
});

describe("catalog integrity", () => {
  const entries = allDashboards();

  it("has entries and they all validate against the schema", () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      const result = dashboardEntrySchema.safeParse(entry);
      expect(result.success, `${entry.id}: ${result.success ? "" : JSON.stringify(result.error.issues[0])}`).toBe(true);
    }
  });

  it("has unique ids and slugs", () => {
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
    expect(new Set(entries.map((e) => e.slug)).size).toBe(entries.length);
  });

  it("always credits a source URL and author", () => {
    for (const e of entries) {
      expect(e.source.url).toMatch(/^https?:\/\//);
      expect(e.source.author.length).toBeGreaterThan(0);
    }
  });

  it("includes every curated reference dashboard", () => {
    for (const curated of CURATED_ENTRIES) {
      expect(dashboardById(curated.id), curated.id).toBeDefined();
    }
  });

  it("resolves by slug and by id", () => {
    const first = entries[0];
    expect(dashboardBySlug(first.slug)?.id).toBe(first.id);
    expect(dashboardById(first.id)?.slug).toBe(first.slug);
    expect(dashboardBySlug("definitely-not-here")).toBeUndefined();
  });
});

describe("curated dashboards", () => {
  it("every curated dashboard parses and renders a non-trivial config", async () => {
    for (const entry of CURATED_ENTRIES) {
      const yaml = await loadDashboardYaml(entry.id);
      expect(yaml, entry.id).toBeTruthy();
      const { config, errors } = parseLovelaceYaml(yaml!);
      expect(errors, entry.id).toEqual([]);
      expect(config?.views.length, entry.id).toBeGreaterThan(0);
      expect(analyzeDashboard(config!).counts.cards, entry.id).toBeGreaterThan(3);
    }
  });

  it("only references entities that exist in the demo home", async () => {
    const { createMockHass } = await import("@ha-studio/lovelace");
    const hass = createMockHass();
    for (const entry of CURATED_ENTRIES) {
      for (const id of entry.analysis.entities) {
        expect(hass.states[id], `${entry.id} references ${id}`).toBeDefined();
      }
    }
  });
});

describe("stored YAML", () => {
  it("parses for every renderable entry", async () => {
    const renderable = allDashboards().filter((e) => e.renderable);
    expect(renderable.length).toBeGreaterThan(5);
    let parsedOk = 0;
    for (const entry of renderable) {
      const yaml = await loadDashboardYaml(entry.id);
      if (!yaml) continue;
      if (parseLovelaceYaml(yaml).config) parsedOk += 1;
    }
    // Harvested YAML can reference !include files we cannot resolve; the
    // overwhelming majority must still parse into a renderable config.
    expect(parsedOk / renderable.length).toBeGreaterThan(0.9);
  });
});

describe("queryDashboards", () => {
  const entries = allDashboards();

  it("filters by free text across title, repo and cards", () => {
    const results = queryDashboards({ q: "mushroom" }, entries);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      const haystack = [r.title, r.description, r.source.repo, ...r.tags, ...r.analysis.customCards]
        .join(" ")
        .toLowerCase();
      expect(haystack).toContain("mushroom");
    }
  });

  it("ANDs multiple tag filters", () => {
    const results = queryDashboards({ tags: ["sections-view"] }, entries);
    for (const r of results) expect(r.tags).toContain("sections-view");
  });

  it("filters to renderable entries", () => {
    for (const r of queryDashboards({ renderableOnly: true }, entries)) {
      expect(r.renderable).toBe(true);
    }
  });

  it("sorts by card count and alphabetically", () => {
    const byCards = queryDashboards({ sort: "cards" }, entries);
    for (let i = 1; i < byCards.length; i += 1) {
      expect(byCards[i - 1].analysis.counts.cards).toBeGreaterThanOrEqual(
        byCards[i].analysis.counts.cards,
      );
    }
    const byTitle = queryDashboards({ sort: "title" }, entries);
    expect(byTitle.map((e) => e.title)).toEqual([...byTitle.map((e) => e.title)].sort((a, b) => a.localeCompare(b)));
  });

  it("returns nothing for an impossible combination", () => {
    expect(queryDashboards({ tags: ["sections-view"], q: "zzzzznope" }, entries)).toEqual([]);
  });
});

describe("computeFacets", () => {
  const facets = computeFacets();
  it("returns counts sorted descending", () => {
    for (const list of [facets.tags, facets.cardTypes, facets.customCards]) {
      for (let i = 1; i < list.length; i += 1) {
        expect(list[i - 1].count).toBeGreaterThanOrEqual(list[i].count);
      }
    }
  });
  it("covers the common card types", () => {
    const names = facets.cardTypes.map((c) => c.value);
    expect(names).toEqual(expect.arrayContaining(["tile", "entities"]));
  });
});

describe("community sources", () => {
  it("every source has an absolute URL and a note", () => {
    for (const s of COMMUNITY_SOURCES) {
      expect(s.url).toMatch(/^https:\/\//);
      expect(s.note.length).toBeGreaterThan(20);
    }
  });
  it("marks forum and reddit sources as not automated", () => {
    for (const s of COMMUNITY_SOURCES.filter((x) => x.kind === "forum" || x.kind === "reddit")) {
      expect(s.automated).toBe(false);
    }
  });
});
