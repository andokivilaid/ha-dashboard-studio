import { z } from "zod";

/**
 * Licence policy
 * --------------
 * A dashboard's YAML is only vendored into this repository when the upstream
 * project carries a permissive, redistribution-friendly licence. Everything
 * else is catalogued as metadata plus a link, so the gallery still credits and
 * points at the work without copying it.
 */
export const PERMISSIVE_LICENSES = [
  "mit",
  "mit-0",
  "apache-2.0",
  "bsd-2-clause",
  "bsd-3-clause",
  "isc",
  "unlicense",
  "cc0-1.0",
  "0bsd",
  "zlib",
  "wtfpl",
] as const;

/** Copyleft: linkable and creditable, but we do not re-host the YAML. */
export const COPYLEFT_LICENSES = [
  "gpl-2.0",
  "gpl-3.0",
  "agpl-3.0",
  "lgpl-2.1",
  "lgpl-3.0",
  "mpl-2.0",
  "epl-2.0",
  "cc-by-sa-4.0",
  "osl-3.0",
] as const;

export function isPermissive(spdx: string | null | undefined): boolean {
  if (!spdx) return false;
  return (PERMISSIVE_LICENSES as readonly string[]).includes(spdx.toLowerCase());
}

export const analysisSchema = z.object({
  cardTypes: z.array(z.string()),
  customCards: z.array(z.string()),
  viewTypes: z.array(z.string()),
  badgeTypes: z.array(z.string()),
  entities: z.array(z.string()),
  domains: z.array(z.string()),
  theme: z.string().optional(),
  counts: z.object({
    views: z.number(),
    sections: z.number(),
    cards: z.number(),
    badges: z.number(),
  }),
  usesCardMod: z.boolean(),
  usesJinjaTemplates: z.boolean(),
});

export const sourceSchema = z.object({
  kind: z.enum(["github", "forum", "reddit", "curated", "docs"]),
  url: z.string().url(),
  repo: z.string().nullable(),
  path: z.string().nullable(),
  author: z.string(),
  authorUrl: z.string().url().nullable(),
  /** Short note on where the entry came from, shown in the UI. */
  via: z.string().nullable(),
});

export const licenseSchema = z.object({
  spdx: z.string().nullable(),
  name: z.string().nullable(),
  url: z.string().url().nullable(),
  permissive: z.boolean(),
});

export const dashboardEntrySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  source: sourceSchema,
  license: licenseSchema,
  stars: z.number().nullable(),
  forks: z.number().nullable(),
  lastCommit: z.string().nullable(),
  topics: z.array(z.string()),
  /** Relative path inside `data/yaml`, present only for permissive sources. */
  yamlFile: z.string().nullable(),
  /** YAML carried in the module itself (studio-authored reference dashboards). */
  inlineYaml: z.string().nullable().default(null),
  yamlOmittedReason: z.string().nullable(),
  yamlBytes: z.number().nullable(),
  analysis: analysisSchema,
  tags: z.array(z.string()),
  /** Whether the gallery can render this entry live. */
  renderable: z.boolean(),
  screenshot: z.string().nullable(),
  collectedAt: z.string(),
});

export type DashboardEntry = z.infer<typeof dashboardEntrySchema>;
export type DashboardAnalysisRecord = z.infer<typeof analysisSchema>;
export type DashboardSource = z.infer<typeof sourceSchema>;

export const catalogSchema = z.object({
  generatedAt: z.string(),
  stats: z.object({
    total: z.number(),
    withYaml: z.number(),
    linkOnly: z.number(),
    repositories: z.number(),
  }),
  entries: z.array(dashboardEntrySchema),
});

export type Catalog = z.infer<typeof catalogSchema>;
