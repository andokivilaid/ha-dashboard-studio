/**
 * Collects real Home Assistant dashboards from GitHub.
 *
 * Usage:
 *   GITHUB_TOKEN=... pnpm catalog:ingest [--max-repos 250] [--no-code-search]
 *
 * Output:
 *   packages/catalog/data/catalog.json   — metadata for every entry
 *   packages/catalog/data/yaml/<id>.yaml — YAML, permissively licensed sources only
 *
 * The script is incremental: existing entries are kept unless `--fresh`.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeDashboard, deriveTags, parseLovelaceYaml } from "@ha-studio/lovelace";
import { GitHub, type GhRepo } from "./github";
import { isPermissive, type DashboardEntry } from "../src/schema";
import { CURATED_ENTRIES } from "../src/curated";

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(here, "..", "data");
const YAML_DIR = path.join(DATA_DIR, "yaml");
const CATALOG_FILE = path.join(DATA_DIR, "catalog.json");

const args = process.argv.slice(2);
const flag = (name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : (args[i + 1] ?? fallback);
};
const has = (name: string) => args.includes(`--${name}`);

const MAX_REPOS = Number(flag("max-repos", "260"));
const FRESH = has("fresh");

/** Extra queries can be supplied without editing the file: EXTRA_QUERIES="a,b". */
const EXTRA_QUERIES = (process.env.EXTRA_QUERIES ?? "")
  .split(",")
  .map((q) => q.trim())
  .filter(Boolean);

const REPO_QUERIES = [
  "topic:home-assistant-config",
  "topic:homeassistant-config",
  "topic:lovelace-ui",
  "topic:home-assistant-lovelace",
  "topic:lovelace",
  "topic:home-assistant stars:>15 dashboard",
  '"home assistant" config lovelace in:name,description,readme stars:>20',
  "home-assistant-config in:name stars:>5",
  "hass-config in:name stars:>5",
  "homeassistant in:name dashboard stars:>20",
  "topic:home-assistant-dashboard",
  "topic:mushroom stars:>5",
  "topic:home-assistant-frontend stars:>10",
  ...EXTRA_QUERIES,
];

const CODE_QUERIES = [
  "filename:ui-lovelace.yaml views",
  "filename:ui-lovelace.yaml type:sections",
  'filename:lovelace.yaml "custom:mushroom-"',
  'path:dashboards extension:yaml "type: sections"',
];

/** File paths that plausibly hold a Lovelace dashboard. */
const DASHBOARD_PATH_RE =
  /(^|\/)(ui-lovelace[^/]*\.ya?ml|lovelace[^/]*\.ya?ml|.*dashboard[^/]*\.ya?ml)$/i;
const DASHBOARD_DIR_RE = /(^|\/)(lovelace|dashboards|ui|dashboard)\//i;
const SKIP_PATH_RE =
  /(^|\/)(node_modules|\.github|custom_components|themes|blueprints|www|packages\/|automations?|scripts?|scenes?|sensors?|esphome|docs?)\//i;

const MAX_FILE_BYTES = 420_000;
const MIN_CARDS = 4;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function hashId(...parts: string[]): string {
  return createHash("sha1").update(parts.join("::")).digest("hex").slice(0, 12);
}

function titleFromPath(repo: string, filePath: string): string {
  const base = path.basename(filePath).replace(/\.ya?ml$/i, "");
  const name = repo.split("/")[1];
  const pretty = base
    .replace(/^ui-lovelace[-_.]?/i, "")
    .replace(/[-_]/g, " ")
    .trim();
  return pretty && pretty.toLowerCase() !== "lovelace"
    ? `${name} — ${pretty.replace(/^\w/, (c) => c.toUpperCase())}`
    : name;
}

async function main() {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!token) {
    console.error("GITHUB_TOKEN is required. Try: GITHUB_TOKEN=$(gh auth token) pnpm catalog:ingest");
    process.exit(1);
  }
  mkdirSync(YAML_DIR, { recursive: true });
  const gh = new GitHub(token);

  const existing: Map<string, DashboardEntry> = new Map();
  if (!FRESH && existsSync(CATALOG_FILE)) {
    const prev = JSON.parse(readFileSync(CATALOG_FILE, "utf8")) as { entries: DashboardEntry[] };
    for (const e of prev.entries) existing.set(e.id, e);
    console.log(`Loaded ${existing.size} existing entries.`);
  }

  // ---- 1. Discover repositories ----------------------------------------
  const repos = new Map<string, GhRepo>();
  for (const query of REPO_QUERIES) {
    if (repos.size >= MAX_REPOS) break;
    try {
      for (let page = 1; page <= 2 && repos.size < MAX_REPOS; page += 1) {
        const found = await gh.searchRepos(query, 100, page);
        if (!found.length) break;
        for (const repo of found) {
          if (repo.archived || repo.fork) continue;
          if (!repos.has(repo.full_name)) repos.set(repo.full_name, repo);
        }
        console.log(`  repo search "${query}" p${page}: +${found.length} (total ${repos.size})`);
      }
    } catch (err) {
      console.warn(`  repo search failed for "${query}": ${(err as Error).message}`);
    }
  }

  if (!has("no-code-search")) {
    for (const query of CODE_QUERIES) {
      if (repos.size >= MAX_REPOS + 80) break;
      try {
        const found = await gh.searchCode(query, 60, 1);
        for (const item of found) {
          const full = item.repository.full_name;
          if (repos.has(full)) continue;
          try {
            const repo = await gh.getRepo(full);
            if (!repo.archived && !repo.fork) repos.set(full, repo);
          } catch {
            /* repo may be private or gone */
          }
        }
        console.log(`  code search "${query}": ${found.length} hits (total repos ${repos.size})`);
      } catch (err) {
        console.warn(`  code search failed for "${query}": ${(err as Error).message}`);
      }
    }
  }

  console.log(`\nDiscovered ${repos.size} candidate repositories.\n`);

  // ---- 2. Walk each repository for dashboard YAML ----------------------
  const entries: DashboardEntry[] = [];
  const seenContent = new Set<string>();
  let repoIndex = 0;

  for (const repo of repos.values()) {
    repoIndex += 1;
    const spdx = repo.license?.key ?? null;
    const permissive = isPermissive(spdx);
    let tree;
    try {
      tree = await gh.getTree(repo.full_name, repo.default_branch);
    } catch (err) {
      console.warn(`[${repoIndex}/${repos.size}] ${repo.full_name}: tree failed (${(err as Error).message})`);
      continue;
    }

    const candidates = tree
      .filter((t) => t.type === "blob")
      .filter((t) => !SKIP_PATH_RE.test(`/${t.path}`))
      .filter((t) => (t.size ?? 0) > 200 && (t.size ?? 0) < MAX_FILE_BYTES)
      .filter((t) => DASHBOARD_PATH_RE.test(t.path) || (DASHBOARD_DIR_RE.test(t.path) && /\.ya?ml$/i.test(t.path)))
      .slice(0, 12);

    if (!candidates.length) {
      console.log(`[${repoIndex}/${repos.size}] ${repo.full_name}: no dashboard files`);
      continue;
    }

    let kept = 0;
    for (const file of candidates) {
      let text: string;
      try {
        text = await gh.getRawFile(repo.full_name, repo.default_branch, file.path);
      } catch {
        continue;
      }
      const { config } = parseLovelaceYaml(text);
      if (!config) continue;
      const analysis = analyzeDashboard(config);
      if (analysis.counts.cards < MIN_CARDS && analysis.counts.views < 2) continue;

      const contentHash = createHash("sha1").update(text).digest("hex");
      if (seenContent.has(contentHash)) continue;
      seenContent.add(contentHash);

      const id = hashId(repo.full_name, file.path);
      const slug = `${slugify(repo.full_name.replace("/", "-"))}-${slugify(path.basename(file.path, path.extname(file.path)))}-${id.slice(0, 5)}`;
      const yamlFile = permissive ? `${id}.yaml` : null;
      if (yamlFile) writeFileSync(path.join(YAML_DIR, yamlFile), text, "utf8");

      entries.push({
        id,
        slug,
        title: titleFromPath(repo.full_name, file.path),
        description:
          repo.description?.slice(0, 220) ??
          `Lovelace dashboard from ${repo.full_name} (${analysis.counts.views} views, ${analysis.counts.cards} cards).`,
        source: {
          kind: "github",
          url: `${repo.html_url}/blob/${repo.default_branch}/${file.path}`,
          repo: repo.full_name,
          path: file.path,
          author: repo.owner.login,
          authorUrl: repo.owner.html_url,
          via: "GitHub repository search",
        },
        license: {
          spdx,
          name: repo.license?.name ?? null,
          url: repo.license?.url ?? null,
          permissive,
        },
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        lastCommit: repo.pushed_at,
        topics: repo.topics ?? [],
        yamlFile,
        inlineYaml: null,
        yamlOmittedReason: yamlFile
          ? null
          : spdx
            ? `Upstream licence (${repo.license?.name ?? spdx}) is not permissive — metadata and link only.`
            : "Upstream repository has no licence — metadata and link only.",
        yamlBytes: yamlFile ? Buffer.byteLength(text) : null,
        analysis,
        tags: deriveTags(analysis),
        renderable: Boolean(yamlFile),
        screenshot: null,
        collectedAt: new Date().toISOString(),
      });
      kept += 1;
      if (kept >= 4) break;
    }
    console.log(
      `[${repoIndex}/${repos.size}] ${repo.full_name}: kept ${kept}/${candidates.length} (${spdx ?? "no licence"}, ★${repo.stargazers_count})`,
    );
  }

  // ---- 3. Merge with curated + previous runs ---------------------------
  for (const curated of CURATED_ENTRIES) entries.push(curated);
  const merged = new Map<string, DashboardEntry>();
  for (const e of existing.values()) merged.set(e.id, e);
  for (const e of entries) merged.set(e.id, e);

  const all = [...merged.values()].sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0));

  // Drop YAML files no longer referenced.
  const referenced = new Set(all.map((e) => e.yamlFile).filter(Boolean) as string[]);
  for (const f of readdirSync(YAML_DIR)) {
    if (!referenced.has(f)) rmSync(path.join(YAML_DIR, f));
  }

  const catalog = {
    generatedAt: new Date().toISOString(),
    stats: {
      total: all.length,
      withYaml: all.filter((e) => e.yamlFile).length,
      linkOnly: all.filter((e) => !e.yamlFile).length,
      repositories: new Set(all.map((e) => e.source.repo).filter(Boolean)).size,
    },
    entries: all,
  };
  writeFileSync(CATALOG_FILE, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

  console.log(`\nWrote ${all.length} entries (${catalog.stats.withYaml} with YAML) to ${CATALOG_FILE}`);
  console.log(`GitHub requests remaining: ${gh.rateRemaining}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
