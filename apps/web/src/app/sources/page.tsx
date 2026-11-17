import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { allDashboards, COMMUNITY_SOURCES, computeFacets } from "@ha-studio/catalog";

export const metadata: Metadata = {
  title: "Sources & licences",
  description:
    "Where the dashboards come from, and the licence rule that decides whether YAML is mirrored or only linked.",
};

export default function SourcesPage() {
  const entries = allDashboards();
  const facets = computeFacets(entries);
  const withYaml = entries.filter((e) => e.renderable).length;

  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-10 sm:px-6">
      <h1 className="text-[1.75rem] font-semibold tracking-tight">Sources &amp; licences</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-muted">
        Every dashboard in the gallery is someone else&apos;s work. The catalogue records who made
        it, where it lives and under what licence, and the rule below decides whether the YAML is
        mirrored here or only linked.
      </p>

      <section className="hs-card mt-8 p-5">
        <h2 className="text-[15px] font-semibold">The rule</h2>
        <ul className="mt-2 space-y-2 text-[13.5px] leading-relaxed text-muted">
          <li>
            <strong className="text-[var(--ink)]">Permissive licence</strong> (MIT, Apache-2.0,
            BSD, ISC, Unlicense, CC0, 0BSD, Zlib) — the dashboard YAML is copied into this
            repository with the author, repository and licence recorded next to it, and the gallery
            renders it live.
          </li>
          <li>
            <strong className="text-[var(--ink)]">Copyleft or no licence</strong> (GPL, AGPL, MPL,
            CC-BY-SA, or a repository with no LICENSE file) — nothing is copied. The entry keeps
            metadata only: title, author, card inventory, star count and a link to the original.
          </li>
          <li>
            <strong className="text-[var(--ink)]">Forum and Reddit posts</strong> — never scraped
            for content. Those platforms&apos; terms do not permit re-hosting, and most posts are
            screenshots anyway. They are credited below as places to look.
          </li>
        </ul>
        <p className="mt-3 text-[13px] text-faint">
          If you are an author and would rather not be listed at all, open an issue and the entry is
          removed — no questions asked.
        </p>
      </section>

      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "dashboards", value: entries.length },
          { label: "YAML mirrored", value: withYaml },
          { label: "link only", value: entries.length - withYaml },
          { label: "licences seen", value: facets.licenses.length },
        ].map((s) => (
          <div key={s.label} className="hs-card p-4">
            <dt className="text-[11.5px] uppercase tracking-wide text-faint">{s.label}</dt>
            <dd className="text-[1.5rem] font-semibold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-10 text-[1.1rem] font-semibold">Licence breakdown</h2>
      <div className="hs-card mt-3 divide-y">
        {facets.licenses.map((l) => (
          <div key={l.value} className="flex items-center gap-3 px-4 py-2.5 text-[13.5px]">
            <code className="font-mono">{l.value === "none" ? "no licence" : l.value}</code>
            <span className="ml-auto tabular-nums text-muted">{l.count}</span>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-[1.1rem] font-semibold">Where we look</h2>
      <div className="mt-3 space-y-3">
        {COMMUNITY_SOURCES.map((s) => (
          <a
            key={s.url}
            href={s.url}
            target="_blank"
            rel="noreferrer noopener"
            className="hs-card hs-card--hover block p-4"
          >
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold">{s.name}</span>
              <span className="hs-tag">{s.kind}</span>
              {s.automated ? (
                <span className="hs-tag" style={{ color: "var(--ok)" }}>
                  harvested automatically
                </span>
              ) : (
                <span className="hs-tag">credited, not scraped</span>
              )}
              <ExternalLink size={13} aria-hidden className="ml-auto shrink-0" />
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{s.note}</p>
          </a>
        ))}
      </div>

      <h2 className="mt-10 text-[1.1rem] font-semibold">Reproducing the catalogue</h2>
      <pre className="hs-card mt-3 overflow-x-auto p-4 text-[12.5px]" style={{ fontFamily: "var(--font-mono)" }}>
{`GITHUB_TOKEN=$(gh auth token) pnpm catalog:ingest --max-repos 400
pnpm catalog:validate     # fails if any non-permissive entry stored YAML
pnpm catalog:bundle       # regenerates the static modules the app imports`}
      </pre>
    </div>
  );
}
