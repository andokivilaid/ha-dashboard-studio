import { ENTRIES, GENERATED_AT } from "./generated/entries";
import type { DashboardEntry } from "./schema";

export * from "./schema";
export * from "./community-sources";
export { CURATED_ENTRIES } from "./curated";
export { ENTRIES, GENERATED_AT };

export function allDashboards(): DashboardEntry[] {
  return ENTRIES;
}

export function dashboardBySlug(slug: string): DashboardEntry | undefined {
  return ENTRIES.find((e) => e.slug === slug);
}

export function dashboardById(id: string): DashboardEntry | undefined {
  return ENTRIES.find((e) => e.id === id);
}

/** YAML lives in a separate chunk; only the pages that need it pay for it. */
export async function loadDashboardYaml(id: string): Promise<string | null> {
  const mod = await import("./generated/yaml");
  return mod.DASHBOARD_YAML[id] ?? null;
}

export interface FacetCount {
  value: string;
  count: number;
}

function tally(values: Iterable<string>): FacetCount[] {
  const map = new Map<string, number>();
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
  return [...map.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

export interface CatalogFacets {
  tags: FacetCount[];
  customCards: FacetCount[];
  cardTypes: FacetCount[];
  viewTypes: FacetCount[];
  licenses: FacetCount[];
  domains: FacetCount[];
}

export function computeFacets(entries: DashboardEntry[] = ENTRIES): CatalogFacets {
  return {
    tags: tally(entries.flatMap((e) => e.tags)),
    customCards: tally(entries.flatMap((e) => e.analysis.customCards)),
    cardTypes: tally(entries.flatMap((e) => e.analysis.cardTypes)),
    viewTypes: tally(entries.flatMap((e) => e.analysis.viewTypes)),
    licenses: tally(entries.map((e) => e.license.spdx ?? "none")),
    domains: tally(entries.flatMap((e) => e.analysis.domains)),
  };
}

export interface CatalogQuery {
  q?: string;
  tags?: string[];
  customCards?: string[];
  cardTypes?: string[];
  viewTypes?: string[];
  renderableOnly?: boolean;
  sort?: "stars" | "cards" | "recent" | "title";
}

export function queryDashboards(query: CatalogQuery, entries: DashboardEntry[] = ENTRIES): DashboardEntry[] {
  const q = query.q?.trim().toLowerCase();
  let out = entries.filter((e) => {
    if (query.renderableOnly && !e.renderable) return false;
    if (query.tags?.length && !query.tags.every((t) => e.tags.includes(t))) return false;
    if (query.customCards?.length && !query.customCards.every((c) => e.analysis.customCards.includes(c)))
      return false;
    if (query.cardTypes?.length && !query.cardTypes.every((c) => e.analysis.cardTypes.includes(c)))
      return false;
    if (query.viewTypes?.length && !query.viewTypes.some((v) => e.analysis.viewTypes.includes(v)))
      return false;
    if (q) {
      const haystack = [
        e.title,
        e.description,
        e.source.repo ?? "",
        e.source.author,
        ...e.tags,
        ...e.analysis.customCards,
        ...e.analysis.cardTypes,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const sort = query.sort ?? "stars";
  out = [...out].sort((a, b) => {
    switch (sort) {
      case "cards":
        return b.analysis.counts.cards - a.analysis.counts.cards;
      case "recent":
        return (b.lastCommit ?? "").localeCompare(a.lastCommit ?? "");
      case "title":
        return a.title.localeCompare(b.title);
      default: {
        const curated = Number(b.source.kind === "curated") - Number(a.source.kind === "curated");
        if (curated) return curated;
        return (b.stars ?? 0) - (a.stars ?? 0);
      }
    }
  });
  return out;
}
