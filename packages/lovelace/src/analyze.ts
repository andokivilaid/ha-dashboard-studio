import type { LovelaceCardConfig, LovelaceConfig, LovelaceViewConfig } from "./types";

export interface DashboardAnalysis {
  /** Built-in card types, e.g. `tile`, `entities`. */
  cardTypes: string[];
  /** HACS card types without the `custom:` prefix, e.g. `mushroom-light-card`. */
  customCards: string[];
  /** Distinct view types used (`masonry`, `sections`, `panel`, ...). */
  viewTypes: string[];
  /** Badge types used. */
  badgeTypes: string[];
  /** Entity ids referenced anywhere in the config. */
  entities: string[];
  /** Domains derived from the referenced entities. */
  domains: string[];
  /** Theme name if the dashboard pins one. */
  theme?: string;
  counts: { views: number; sections: number; cards: number; badges: number };
  /** True when any `card_mod`/`styles` key is present. */
  usesCardMod: boolean;
  usesJinjaTemplates: boolean;
}

const ENTITY_RE = /^[a-z_]+\.[a-z0-9_]+$/;

function walk(value: unknown, visit: (node: Record<string, unknown>) => void): void {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
    return;
  }
  if (value && typeof value === "object") {
    visit(value as Record<string, unknown>);
    for (const item of Object.values(value as Record<string, unknown>)) walk(item, visit);
  }
}

export function analyzeDashboard(config: LovelaceConfig): DashboardAnalysis {
  const cardTypes = new Set<string>();
  const customCards = new Set<string>();
  const viewTypes = new Set<string>();
  const badgeTypes = new Set<string>();
  const entities = new Set<string>();
  let sections = 0;
  let cards = 0;
  let badges = 0;
  let usesCardMod = false;
  let usesJinjaTemplates = false;

  const views: LovelaceViewConfig[] = Array.isArray(config.views) ? config.views : [];
  for (const view of views) {
    viewTypes.add(typeof view.type === "string" ? view.type : view.panel ? "panel" : "masonry");
    if (Array.isArray(view.sections)) sections += view.sections.length;
  }

  walk(config, (node) => {
    if (typeof node.type === "string") {
      const t = node.type;
      if (t.startsWith("custom:")) customCards.add(t.slice("custom:".length));
      else if (!t.startsWith("divider") || true) cardTypes.add(t);
    }
    if ("card_mod" in node || "style" in node || "styles" in node) usesCardMod = true;
    for (const [key, raw] of Object.entries(node)) {
      if (typeof raw !== "string") continue;
      if (raw.includes("{{") || raw.includes("{%")) usesJinjaTemplates = true;
      if ((key === "entity" || key === "entity_id" || key === "camera_image") && ENTITY_RE.test(raw))
        entities.add(raw);
      if (key === "entities" || key === "badges") continue;
    }
    if (Array.isArray(node.entities)) {
      for (const e of node.entities) {
        if (typeof e === "string" && ENTITY_RE.test(e)) entities.add(e);
        else if (e && typeof e === "object") {
          const ent = (e as Record<string, unknown>).entity;
          if (typeof ent === "string" && ENTITY_RE.test(ent)) entities.add(ent);
        }
      }
    }
  });

  for (const view of views) {
    const collect = (list: LovelaceCardConfig[] | undefined) => {
      if (Array.isArray(list)) cards += list.length;
    };
    collect(view.cards);
    for (const section of view.sections ?? []) collect(section.cards as LovelaceCardConfig[]);
    for (const badge of view.badges ?? []) {
      badges += 1;
      if (typeof badge === "object" && badge && typeof badge.type === "string")
        badgeTypes.add(badge.type);
      else badgeTypes.add("entity");
    }
  }

  // View types are not card types.
  for (const vt of viewTypes) cardTypes.delete(vt);
  for (const bt of badgeTypes) cardTypes.delete(bt);

  const domains = new Set<string>();
  for (const e of entities) domains.add(e.split(".")[0]);

  return {
    cardTypes: [...cardTypes].sort(),
    customCards: [...customCards].sort(),
    viewTypes: [...viewTypes].sort(),
    badgeTypes: [...badgeTypes].sort(),
    entities: [...entities].sort(),
    domains: [...domains].sort(),
    theme: typeof config.theme === "string" ? config.theme : undefined,
    counts: { views: views.length, sections, cards, badges },
    usesCardMod,
    usesJinjaTemplates,
  };
}

/** Heuristic tags used by the gallery filters. */
export function deriveTags(analysis: DashboardAnalysis): string[] {
  const tags = new Set<string>();
  if (analysis.viewTypes.includes("sections")) tags.add("sections-view");
  if (analysis.viewTypes.includes("panel")) tags.add("panel");
  if (analysis.customCards.some((c) => c.startsWith("mushroom"))) tags.add("mushroom");
  if (analysis.customCards.some((c) => c.startsWith("bubble"))) tags.add("bubble-card");
  if (analysis.customCards.includes("button-card")) tags.add("button-card");
  if (analysis.usesCardMod) tags.add("card-mod");
  if (analysis.customCards.some((c) => c.includes("graph") || c.includes("apex")))
    tags.add("charts");
  if (analysis.domains.includes("climate")) tags.add("climate");
  if (analysis.domains.includes("media_player")) tags.add("media");
  if (analysis.domains.includes("camera")) tags.add("cameras");
  if (analysis.cardTypes.some((c) => c.startsWith("energy"))) tags.add("energy");
  if (analysis.cardTypes.includes("area")) tags.add("room-based");
  if (analysis.cardTypes.includes("map")) tags.add("presence");
  if (analysis.counts.cards > 40) tags.add("dense");
  if (analysis.cardTypes.includes("picture-elements")) tags.add("floorplan");
  return [...tags];
}
