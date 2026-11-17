/**
 * Catalog of the HACS custom cards the renderer can load.
 *
 * The browser cannot load most of these straight from their upstream home:
 * GitHub release assets are served as `application/octet-stream` with no
 * `Access-Control-Allow-Origin`, which a `<script type="module">` refuses. The
 * web app therefore proxies each bundle through `/api/hacs/[slug]`, which
 * fetches server-side and re-serves it same-origin with the right MIME type.
 */
export interface CustomCardBundle {
  /** Stable slug used in the proxy URL. */
  slug: string;
  name: string;
  repo: string;
  homepage: string;
  license: string;
  /** Upstream file the proxy fetches. */
  source: string;
  /** Version pinned in `source`, shown in the UI. */
  version: string;
  /** Custom element prefixes this bundle defines (without `custom:`). */
  provides: string[];
  /** A bundle that only augments other cards (card-mod) rather than defining one. */
  augmentsOnly?: boolean;
  description: string;
}

export const CUSTOM_CARD_BUNDLES: CustomCardBundle[] = [
  {
    slug: "mushroom",
    name: "Mushroom",
    repo: "piitaya/lovelace-mushroom",
    homepage: "https://github.com/piitaya/lovelace-mushroom",
    license: "Apache-2.0",
    source: "https://github.com/piitaya/lovelace-mushroom/releases/download/v5.3.0/mushroom.js",
    version: "v5.3.0",
    provides: [
      "mushroom-alarm-control-panel-card",
      "mushroom-chips-card",
      "mushroom-climate-card",
      "mushroom-cover-card",
      "mushroom-entity-card",
      "mushroom-fan-card",
      "mushroom-humidifier-card",
      "mushroom-light-card",
      "mushroom-lock-card",
      "mushroom-media-player-card",
      "mushroom-number-card",
      "mushroom-person-card",
      "mushroom-select-card",
      "mushroom-template-card",
      "mushroom-title-card",
      "mushroom-update-card",
      "mushroom-vacuum-card",
    ],
    description: "Minimalist, mobile-first card set. The most widely used HACS front-end theme.",
  },
  {
    slug: "bubble-card",
    name: "Bubble Card",
    repo: "Clooos/Bubble-Card",
    homepage: "https://github.com/Clooos/Bubble-Card",
    license: "MIT",
    source: "https://cdn.jsdelivr.net/gh/Clooos/Bubble-Card@main/dist/bubble-card.js",
    version: "main",
    provides: ["bubble-card"],
    description: "Pop-up driven, iOS-flavoured card with buttons, sliders and separators.",
  },
  {
    slug: "button-card",
    name: "button-card",
    repo: "custom-cards/button-card",
    homepage: "https://github.com/custom-cards/button-card",
    license: "MIT",
    source: "https://github.com/custom-cards/button-card/releases/download/v7.0.1/button-card.js",
    version: "v7.0.1",
    provides: ["button-card"],
    description: "Fully templatable button with per-state styling. The classic power-user card.",
  },
  {
    slug: "mini-graph-card",
    name: "mini-graph-card",
    repo: "kalkih/mini-graph-card",
    homepage: "https://github.com/kalkih/mini-graph-card",
    license: "MIT",
    source:
      "https://github.com/kalkih/mini-graph-card/releases/download/v0.13.0/mini-graph-card-bundle.js",
    version: "v0.13.0",
    provides: ["mini-graph-card"],
    description: "Compact sensor sparkline with min/max/avg overlays.",
  },
  {
    slug: "apexcharts-card",
    name: "apexcharts-card",
    repo: "RomRider/apexcharts-card",
    homepage: "https://github.com/RomRider/apexcharts-card",
    license: "MIT",
    source:
      "https://github.com/RomRider/apexcharts-card/releases/download/v2.2.3/apexcharts-card.js",
    version: "v2.2.3",
    provides: ["apexcharts-card"],
    description: "Full ApexCharts bridge: line, bar, radial and heatmap series from history.",
  },
  {
    slug: "auto-entities",
    name: "auto-entities",
    repo: "thomasloven/lovelace-auto-entities",
    homepage: "https://github.com/thomasloven/lovelace-auto-entities",
    license: "MIT",
    source: "https://cdn.jsdelivr.net/gh/thomasloven/lovelace-auto-entities@master/auto-entities.js",
    version: "master",
    provides: ["auto-entities"],
    description: "Fills another card with entities matched by a filter instead of a fixed list.",
  },
  {
    slug: "layout-card",
    name: "layout-card",
    repo: "thomasloven/lovelace-layout-card",
    homepage: "https://github.com/thomasloven/lovelace-layout-card",
    license: "MIT",
    source: "https://cdn.jsdelivr.net/gh/thomasloven/lovelace-layout-card@master/layout-card.js",
    version: "master",
    provides: ["layout-card", "grid-layout", "masonry-layout", "horizontal-layout", "vertical-layout"],
    description: "Grid and masonry layout engines for views and nested card groups.",
  },
  {
    slug: "card-mod",
    name: "card-mod",
    repo: "thomasloven/lovelace-card-mod",
    homepage: "https://github.com/thomasloven/lovelace-card-mod",
    license: "MIT",
    source: "https://cdn.jsdelivr.net/gh/thomasloven/lovelace-card-mod@master/card-mod.js",
    version: "master",
    provides: [],
    augmentsOnly: true,
    description: "Injects CSS into any card's shadow DOM via a `card_mod:` key.",
  },
];

const BY_ELEMENT = new Map<string, CustomCardBundle>();
for (const bundle of CUSTOM_CARD_BUNDLES) {
  for (const el of bundle.provides) BY_ELEMENT.set(el, bundle);
}

export function bundleForCustomCard(type: string): CustomCardBundle | undefined {
  const tag = type.startsWith("custom:") ? type.slice("custom:".length) : type;
  return BY_ELEMENT.get(tag);
}

export function bundleBySlug(slug: string): CustomCardBundle | undefined {
  return CUSTOM_CARD_BUNDLES.find((b) => b.slug === slug);
}

/** Bundles needed to render a dashboard that uses `customCards`. */
export function requiredBundles(customCards: string[]): CustomCardBundle[] {
  const out = new Map<string, CustomCardBundle>();
  for (const card of customCards) {
    const bundle = bundleForCustomCard(card);
    if (bundle) out.set(bundle.slug, bundle);
  }
  return [...out.values()];
}
