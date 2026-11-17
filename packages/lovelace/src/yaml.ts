import { parse, parseDocument, stringify, type Scalar, type Tags } from "yaml";
import type { LovelaceConfig } from "./types";

/**
 * Home Assistant YAML uses non-standard tags (`!include`, `!secret`,
 * `!include_dir_merge_list`, ...). The upstream parser would throw on those,
 * so we register a permissive catch-all that keeps the tag visible as a string
 * such as `"!include lights.yaml"`. Dashboards stay renderable and the UI can
 * show the user exactly which file reference it could not resolve.
 */
export const HA_YAML_TAGS: Tags = [
  {
    tag: "!include",
    collection: "map",
    identify: () => false,
    resolve: (value: unknown) => `!include ${String(value)}`,
  },
];

const HA_TAG_RE =
  /^!(include|include_dir_list|include_dir_merge_list|include_dir_named|include_dir_merge_named|secret|env_var|input)\b/;

/** Rewrites HA-only tags to quoted strings so a standard YAML parse succeeds. */
export function neutralizeHaTags(source: string): { text: string; tags: string[] } {
  const found: string[] = [];
  const text = source
    .split("\n")
    .map((line) => {
      // Only touch tags in value position: `key: !include foo.yaml` or `- !include foo.yaml`
      const m = line.match(/^(\s*(?:-\s+)?(?:[A-Za-z0-9_."'[\]-]+\s*:\s*)?)(!\S+)(.*)$/);
      if (!m) return line;
      const [, prefix, tag, rest] = m;
      if (!HA_TAG_RE.test(tag)) return line;
      const literal = `${tag}${rest}`.trim();
      found.push(literal);
      return `${prefix}"${literal.replace(/"/g, '\\"')}"`;
    })
    .join("\n");
  return { text, tags: found };
}

export interface ParsedLovelace {
  config: LovelaceConfig | null;
  errors: string[];
  unresolvedIncludes: string[];
}

/** Parse a Lovelace YAML document defensively; never throws. */
export function parseLovelaceYaml(source: string): ParsedLovelace {
  const errors: string[] = [];
  const { text, tags } = neutralizeHaTags(source);
  let config: LovelaceConfig | null = null;
  try {
    const doc = parseDocument(text, { strict: false, uniqueKeys: false });
    for (const err of doc.errors) errors.push(err.message);
    const value = doc.toJS({ maxAliasCount: -1 }) as unknown;
    config = normalizeLovelaceConfig(value);
    if (!config) errors.push("Document did not contain a Lovelace dashboard (no `views`).");
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }
  return { config, errors, unresolvedIncludes: tags };
}

/**
 * Accepts the several shapes people publish: a full dashboard, a bare list of
 * views, a single view, or a single card.
 */
export function normalizeLovelaceConfig(value: unknown): LovelaceConfig | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    const arr = value as Record<string, unknown>[];
    if (arr.length === 0) return null;
    if (arr.every((v) => v && typeof v === "object" && ("cards" in v || "sections" in v || "badges" in v)))
      return { views: arr as LovelaceConfig["views"] };
    if (arr.every((v) => v && typeof v === "object" && "type" in v))
      return { views: [{ title: "Imported", cards: arr as LovelaceConfig["views"][number]["cards"] }] };
    return null;
  }
  const obj = value as Record<string, unknown>;
  if (Array.isArray(obj.views)) return obj as unknown as LovelaceConfig;
  if (Array.isArray(obj.cards) || Array.isArray(obj.sections))
    return { views: [obj as LovelaceConfig["views"][number]] };
  if (typeof obj.type === "string")
    return { views: [{ title: "Imported", cards: [obj as never] }] };
  return null;
}

export function toLovelaceYaml(config: unknown): string {
  return stringify(config, {
    indent: 2,
    lineWidth: 0,
    defaultStringType: "PLAIN" as Scalar.Type,
    defaultKeyType: "PLAIN" as Scalar.Type,
    nullStr: "",
  });
}

/** Round-trip helper used by the editor to keep formatting predictable. */
export function formatYaml(source: string): string {
  const { text } = neutralizeHaTags(source);
  const value = parse(text, { strict: false, uniqueKeys: false });
  return toLovelaceYaml(value);
}
