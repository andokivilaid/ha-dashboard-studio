"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { Filter, Search, SlidersHorizontal, Star, X } from "lucide-react";
import {
  queryDashboards,
  type CatalogFacets,
  type DashboardEntry,
} from "@ha-studio/catalog";
import { GalleryCard } from "./gallery-card";

type Sort = "stars" | "cards" | "recent" | "title";

const SORTS: Array<{ value: Sort; label: string }> = [
  { value: "stars", label: "Most starred" },
  { value: "cards", label: "Most cards" },
  { value: "recent", label: "Recently updated" },
  { value: "title", label: "A–Z" },
];

export function GalleryClient({
  entries,
  facets,
}: {
  entries: DashboardEntry[];
  facets: CatalogFacets;
}) {
  const [q, setQ] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [customCards, setCustomCards] = useState<string[]>([]);
  const [cardTypes, setCardTypes] = useState<string[]>([]);
  const [viewTypes, setViewTypes] = useState<string[]>([]);
  const [renderableOnly, setRenderableOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("stars");
  const [limit, setLimit] = useState(24);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const deferredQ = useDeferredValue(q);

  const results = useMemo(
    () =>
      queryDashboards(
        { q: deferredQ, tags, customCards, cardTypes, viewTypes, renderableOnly, sort },
        entries,
      ),
    [deferredQ, tags, customCards, cardTypes, viewTypes, renderableOnly, sort, entries],
  );

  const activeCount =
    tags.length + customCards.length + cardTypes.length + viewTypes.length + (renderableOnly ? 1 : 0);

  const toggle = (list: string[], set: (v: string[]) => void, value: string) => {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
    setLimit(24);
  };

  const clearAll = () => {
    setTags([]);
    setCustomCards([]);
    setCardTypes([]);
    setViewTypes([]);
    setRenderableOnly(false);
    setQ("");
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-[1.75rem] font-semibold tracking-tight">Dashboard gallery</h1>
        <p className="mt-1 max-w-2xl text-[14px] text-muted">
          {entries.length} Lovelace dashboards collected from public Home Assistant
          configurations. Previews are live renders with mock entities — open one to see its
          YAML, the cards it uses, and to send it to the builder.
        </p>
      </header>

      <div className="sticky top-14 z-30 -mx-4 mb-6 border-b bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 basis-[280px]">
            <Search
              size={15}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--ink-3)" }}
            />
            <input
              className="hs-input !pl-9"
              placeholder="Search dashboards, repos, cards…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setLimit(24);
              }}
              aria-label="Search dashboards"
            />
          </div>

          <button
            type="button"
            className="hs-btn"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal size={15} aria-hidden /> Filters
            {activeCount ? (
              <span
                className="ml-1 rounded-full px-1.5 text-[11px] font-semibold"
                style={{ background: "var(--brand)", color: "#04121b" }}
              >
                {activeCount}
              </span>
            ) : null}
          </button>

          <label className="hs-btn cursor-pointer gap-2">
            <input
              type="checkbox"
              checked={renderableOnly}
              onChange={(e) => setRenderableOnly(e.target.checked)}
              className="accent-[var(--brand)]"
            />
            Renderable only
          </label>

          <select
            className="hs-input w-auto"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label="Sort by"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {filtersOpen ? (
          <div className="mt-3 grid gap-4 border-t pt-3 lg:grid-cols-4">
            <FacetGroup
              title="Style"
              items={facets.tags.slice(0, 22)}
              selected={tags}
              onToggle={(v) => toggle(tags, setTags, v)}
            />
            <FacetGroup
              title="Custom cards"
              items={facets.customCards.slice(0, 22)}
              selected={customCards}
              onToggle={(v) => toggle(customCards, setCustomCards, v)}
            />
            <FacetGroup
              title="Card types"
              items={facets.cardTypes.slice(0, 26)}
              selected={cardTypes}
              onToggle={(v) => toggle(cardTypes, setCardTypes, v)}
            />
            <FacetGroup
              title="View types"
              items={facets.viewTypes.slice(0, 12)}
              selected={viewTypes}
              onToggle={(v) => toggle(viewTypes, setViewTypes, v)}
            />
          </div>
        ) : null}

        {activeCount ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {[
              ...tags.map((v) => ({ v, set: () => toggle(tags, setTags, v) })),
              ...customCards.map((v) => ({ v, set: () => toggle(customCards, setCustomCards, v) })),
              ...cardTypes.map((v) => ({ v, set: () => toggle(cardTypes, setCardTypes, v) })),
              ...viewTypes.map((v) => ({ v, set: () => toggle(viewTypes, setViewTypes, v) })),
            ].map(({ v, set }) => (
              <button key={v} type="button" className="hs-chip" data-active="true" onClick={set}>
                {v} <X size={12} aria-hidden />
              </button>
            ))}
            <button type="button" className="hs-btn hs-btn--ghost hs-btn--sm" onClick={clearAll}>
              Clear all
            </button>
          </div>
        ) : null}
      </div>

      <p className="mb-4 flex items-center gap-2 text-[13px] text-muted" aria-live="polite">
        <Filter size={14} aria-hidden />
        {results.length} {results.length === 1 ? "dashboard" : "dashboards"}
        {activeCount ? " matching your filters" : ""}
      </p>

      {results.length === 0 ? (
        <div className="hs-card grid place-items-center p-16 text-center">
          <Star size={22} aria-hidden style={{ color: "var(--ink-3)" }} />
          <p className="mt-3 text-[15px] font-medium">Nothing matches those filters</p>
          <p className="mt-1 text-[13px] text-muted">Try removing a filter or searching for a card name.</p>
          <button type="button" className="hs-btn mt-4" onClick={clearAll}>
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {results.slice(0, limit).map((entry, i) => (
              <GalleryCard key={entry.id} entry={entry} priority={i < 6} />
            ))}
          </div>
          {results.length > limit ? (
            <div className="mt-8 flex justify-center">
              <button type="button" className="hs-btn" onClick={() => setLimit((l) => l + 24)}>
                Show more ({results.length - limit} left)
              </button>
            </div>
          ) : null}
        </>
      )}

      <p className="mt-10 text-[12.5px] text-faint">
        Dashboards are catalogued with their author, source link and licence. YAML is only
        re-hosted when the upstream project is permissively licensed —{" "}
        <Link href="/sources" className="underline">
          read the policy
        </Link>
        .
      </p>
    </div>
  );
}

function FacetGroup({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: Array<{ value: string; count: number }>;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div>
      <h2 className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-faint">{title}</h2>
      <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto pr-1">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            className="hs-chip"
            data-active={selected.includes(item.value)}
            onClick={() => onToggle(item.value)}
          >
            {item.value}
            <span className="text-faint">{item.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
