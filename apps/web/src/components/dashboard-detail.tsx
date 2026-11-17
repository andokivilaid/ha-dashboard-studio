"use client";

import { useMemo, useState } from "react";
import { useAppTheme } from "@/lib/use-app-theme";
import { Check, Copy, Monitor, Smartphone, Tablet } from "lucide-react";
import { toast } from "sonner";
import {
  createMockHass,
  parseLovelaceYaml,
  type CustomCardBundle,
  type DashboardAnalysis,
} from "@ha-studio/lovelace";
import { DashboardRenderer } from "@ha-studio/lovelace-render";
import type { DashboardEntry } from "@ha-studio/catalog";
import { CodeBlock } from "./code-block";

const DEVICES = [
  { id: "desktop", label: "Desktop", width: 1280, icon: Monitor },
  { id: "tablet", label: "Tablet", width: 834, icon: Tablet },
  { id: "phone", label: "Phone", width: 414, icon: Smartphone },
] as const;

export function DashboardDetail({
  entry,
  yaml,
  bundles,
}: {
  entry: DashboardEntry;
  yaml: string | null;
  bundles: Array<{ type: string; bundle: CustomCardBundle | null }>;
}) {
  const theme = useAppTheme();
  const [device, setDevice] = useState<(typeof DEVICES)[number]["id"]>("desktop");
  const [viewIndex, setViewIndex] = useState(0);
  const [tab, setTab] = useState<"render" | "yaml" | "elements">("render");
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => (yaml ? parseLovelaceYaml(yaml) : null), [yaml]);
  const hass = useMemo(() => createMockHass({ darkMode: theme === "dark" }), [theme]);
  const width = DEVICES.find((d) => d.id === device)!.width;
  const views = parsed?.config?.views ?? [];

  const copy = async () => {
    if (!yaml) return;
    await navigator.clipboard.writeText(yaml);
    setCopied(true);
    toast.success("YAML copied to clipboard");
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-[10px] border p-1">
            {(["render", "yaml", "elements"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className="hs-btn hs-btn--ghost hs-btn--sm capitalize"
                data-active={tab === t}
                style={tab === t ? { background: "var(--brand-soft)", color: "var(--brand)" } : undefined}
                onClick={() => setTab(t)}
                disabled={t !== "elements" && !yaml}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "render" ? (
            <>
              <div className="flex gap-1 rounded-[10px] border p-1">
                {DEVICES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    className="hs-btn hs-btn--ghost hs-btn--sm"
                    style={device === id ? { background: "var(--brand-soft)", color: "var(--brand)" } : undefined}
                    onClick={() => setDevice(id)}
                    aria-label={label}
                    title={label}
                  >
                    <Icon size={15} aria-hidden />
                  </button>
                ))}
              </div>
              {views.length > 1 ? (
                <select
                  className="hs-input w-auto"
                  value={viewIndex}
                  onChange={(e) => setViewIndex(Number(e.target.value))}
                  aria-label="View"
                >
                  {views.map((v, i) => (
                    <option key={i} value={i}>
                      {v.title ?? `View ${i + 1}`}
                    </option>
                  ))}
                </select>
              ) : null}
            </>
          ) : null}

          {tab === "yaml" && yaml ? (
            <button type="button" className="hs-btn hs-btn--sm ml-auto" onClick={copy}>
              {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
              {copied ? "Copied" : "Copy YAML"}
            </button>
          ) : null}
        </div>

        {tab === "render" ? (
          parsed?.config ? (
            <div className="hs-card overflow-hidden" data-testid="detail-render">
              <div className="overflow-x-auto" style={{ background: theme === "dark" ? "#111" : "#fafafa" }}>
                <div style={{ width, margin: "0 auto", maxWidth: "100%" }}>
                  <DashboardRenderer
                    config={parsed.config}
                    hass={hass}
                    theme={theme}
                    viewIndex={viewIndex}
                    onViewChange={setViewIndex}
                    showTabs
                    width={width}
                    options={{ interactive: false, loadCustomCards: true }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="hs-card p-10 text-center text-[13.5px] text-muted">
              This dashboard could not be parsed into a renderable config.
              {parsed?.errors.length ? (
                <pre className="mt-3 text-left text-[11.5px]">{parsed.errors.slice(0, 4).join("\n")}</pre>
              ) : null}
            </div>
          )
        ) : null}

        {tab === "yaml" ? (
          yaml ? (
            <CodeBlock code={yaml} language="yaml" maxHeight={720} />
          ) : (
            <div className="hs-card p-10 text-center text-[13.5px] text-muted">
              YAML is not stored for this entry.
            </div>
          )
        ) : null}

        {tab === "elements" ? <ElementsTable analysis={entry.analysis} bundles={bundles} /> : null}

        {parsed?.unresolvedIncludes.length ? (
          <p className="mt-3 text-[12px] text-faint">
            {parsed.unresolvedIncludes.length} unresolved HA YAML tag(s) such as{" "}
            <code>{parsed.unresolvedIncludes[0]}</code> — these reference other files in the
            author&apos;s repository and are shown verbatim.
          </p>
        ) : null}
      </div>

      <aside className="space-y-4">
        <SidebarCard title="At a glance">
          <dl className="grid grid-cols-2 gap-y-2 text-[13px]">
            <Stat label="Views" value={entry.analysis.counts.views} />
            <Stat label="Cards" value={entry.analysis.counts.cards} />
            <Stat label="Sections" value={entry.analysis.counts.sections} />
            <Stat label="Badges" value={entry.analysis.counts.badges} />
            <Stat label="Entities" value={entry.analysis.entities.length} />
            <Stat label="Custom cards" value={entry.analysis.customCards.length} />
          </dl>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {entry.analysis.usesCardMod ? <span className="hs-tag">card-mod styling</span> : null}
            {entry.analysis.usesJinjaTemplates ? <span className="hs-tag">Jinja templates</span> : null}
            {entry.analysis.theme ? <span className="hs-tag">theme: {entry.analysis.theme}</span> : null}
          </div>
        </SidebarCard>

        <SidebarCard title="Tags">
          <div className="flex flex-wrap gap-1.5">
            {entry.tags.length ? (
              entry.tags.map((t) => (
                <a key={t} href={`/gallery?tag=${encodeURIComponent(t)}`} className="hs-chip">
                  {t}
                </a>
              ))
            ) : (
              <span className="text-[13px] text-faint">None</span>
            )}
          </div>
        </SidebarCard>

        <SidebarCard title="View types">
          <div className="flex flex-wrap gap-1.5">
            {entry.analysis.viewTypes.map((v) => (
              <span key={v} className="hs-tag">
                {v}
              </span>
            ))}
          </div>
        </SidebarCard>

        <SidebarCard title="Licence">
          <p className="text-[13px] text-muted">
            {entry.license.name ?? entry.license.spdx ?? "No licence stated by the author."}
          </p>
          <p className="mt-2 text-[12px] text-faint">
            {entry.license.permissive
              ? "Permissive — the YAML is mirrored here with attribution."
              : "Not permissive — only metadata and a link are stored."}
          </p>
          {entry.license.url ? (
            <a
              className="mt-2 inline-block text-[12.5px] underline"
              href={entry.license.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              Licence text
            </a>
          ) : null}
        </SidebarCard>
      </aside>
    </div>
  );
}

function SidebarCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="hs-card p-4">
      <h2 className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-faint">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{value}</dd>
    </>
  );
}

function ElementsTable({
  analysis,
  bundles,
}: {
  analysis: DashboardAnalysis;
  bundles: Array<{ type: string; bundle: CustomCardBundle | null }>;
}) {
  return (
    <div className="space-y-4">
      <section className="hs-card p-4">
        <h2 className="mb-2 text-[13px] font-semibold">Built-in cards ({analysis.cardTypes.length})</h2>
        <div className="flex flex-wrap gap-1.5">
          {analysis.cardTypes.length ? (
            analysis.cardTypes.map((c) => (
              <span key={c} className="hs-tag font-mono">
                {c}
              </span>
            ))
          ) : (
            <span className="text-[13px] text-faint">None</span>
          )}
        </div>
      </section>

      <section className="hs-card p-4">
        <h2 className="mb-2 text-[13px] font-semibold">Custom cards ({bundles.length})</h2>
        {bundles.length ? (
          <ul className="divide-y text-[13px]">
            {bundles.map(({ type, bundle }) => (
              <li key={type} className="flex items-center gap-3 py-2">
                <code className="font-mono text-[12.5px]">custom:{type}</code>
                <span className="ml-auto shrink-0">
                  {bundle ? (
                    <a
                      href={bundle.homepage}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="hs-tag"
                      style={{ color: "var(--ok)" }}
                    >
                      {bundle.name} — renders
                    </a>
                  ) : (
                    <span className="hs-tag">not bundled</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-faint">This dashboard uses no HACS cards.</p>
        )}
      </section>

      <section className="hs-card p-4">
        <h2 className="mb-2 text-[13px] font-semibold">
          Entities referenced ({analysis.entities.length})
        </h2>
        <div className="max-h-64 overflow-y-auto">
          <div className="flex flex-wrap gap-1.5">
            {analysis.entities.map((e) => (
              <span key={e} className="hs-tag font-mono">
                {e}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
