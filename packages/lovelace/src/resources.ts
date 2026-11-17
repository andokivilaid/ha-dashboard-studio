import { CUSTOM_CARD_BUNDLES, bundleForCustomCard, type CustomCardBundle } from "./registry";
import type { LovelaceResourceConfig } from "./types";

/**
 * Reconciles what a Home Assistant instance actually has installed with what
 * this renderer can draw.
 *
 * `lovelace/resources` lists the JavaScript modules HACS registered. The file
 * names are the only clue to which cards they define — HA itself never records
 * that — so matching is by repository/bundle name, which is how HACS lays the
 * files out (`/hacsfiles/lovelace-mushroom/mushroom.js`).
 *
 * Two separate questions follow, and the UI should not conflate them:
 *   - Does the *user's instance* have this card? If not, a generated dashboard
 *     that uses it will be broken for them, so the AI should fall back to a
 *     native card.
 *   - Can the *studio* render it? If not, the preview degrades to a
 *     placeholder, but their instance is fine.
 */

/** Fragments that identify a bundle in a HACS resource URL. */
const BUNDLE_URL_HINTS: Record<string, RegExp> = {
  mushroom: /mushroom/i,
  "bubble-card": /bubble[-_]?card/i,
  "button-card": /button[-_]?card/i,
  "mini-graph-card": /mini[-_]?graph[-_]?card/i,
  "apexcharts-card": /apexcharts/i,
  "auto-entities": /auto[-_]?entities/i,
  "layout-card": /layout[-_]?card/i,
  "card-mod": /card[-_]?mod/i,
};

export interface InstalledResource {
  url: string;
  type: string;
  /** The bundle this URL appears to be, when it is one we know. */
  bundle: CustomCardBundle | null;
  /** Best-effort name for an unrecognised resource, from its filename. */
  label: string;
}

function filenameOf(url: string): string {
  const path = url.split("?")[0];
  return path.slice(path.lastIndexOf("/") + 1) || path;
}

export function describeResources(
  resources: Array<Pick<LovelaceResourceConfig, "url" | "type">>,
): InstalledResource[] {
  return resources.map((r) => {
    const slug = Object.keys(BUNDLE_URL_HINTS).find((key) => BUNDLE_URL_HINTS[key].test(r.url));
    return {
      url: r.url,
      type: r.type ?? "module",
      bundle: slug ? (CUSTOM_CARD_BUNDLES.find((b) => b.slug === slug) ?? null) : null,
      label: slug ?? filenameOf(r.url).replace(/\.js$/, ""),
    };
  });
}

export interface CardAvailability {
  /** Card type without the `custom:` prefix. */
  tag: string;
  /** The instance has a resource that looks like this card's bundle. */
  installedUpstream: boolean;
  /** The studio can execute this card in the preview. */
  renderable: boolean;
  bundle: CustomCardBundle | null;
}

export function assessCustomCards(
  customCardTypes: string[],
  resources: InstalledResource[],
): CardAvailability[] {
  const installedSlugs = new Set(
    resources.map((r) => r.bundle?.slug).filter((s): s is string => Boolean(s)),
  );
  const installedLabels = resources.map((r) => r.label.toLowerCase());

  return customCardTypes.map((type) => {
    const tag = type.startsWith("custom:") ? type.slice("custom:".length) : type;
    const bundle = bundleForCustomCard(tag) ?? null;
    const installedUpstream = bundle
      ? installedSlugs.has(bundle.slug)
      : installedLabels.some((label) => tag.includes(label) || label.includes(tag));
    return { tag, installedUpstream, renderable: Boolean(bundle), bundle };
  });
}

/**
 * The card vocabulary a generated dashboard may safely use against a given
 * instance. With no resource list (mock mode) every bundled card is fair game.
 */
export function availableCustomCards(resources: InstalledResource[] | null): string[] {
  if (!resources) return CUSTOM_CARD_BUNDLES.flatMap((b) => b.provides);
  const slugs = new Set(resources.map((r) => r.bundle?.slug).filter(Boolean));
  return CUSTOM_CARD_BUNDLES.filter((b) => slugs.has(b.slug)).flatMap((b) => b.provides);
}
