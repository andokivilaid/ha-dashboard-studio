"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, FileWarning, Star } from "lucide-react";
import type { DashboardEntry } from "@ha-studio/catalog";
import { DashboardPreview } from "./dashboard-preview";

/**
 * Previews load lazily: the YAML is fetched only once a card approaches the
 * viewport, so a 300-entry gallery stays responsive.
 */
export function GalleryCard({ entry, priority = false }: { entry: DashboardEntry; priority?: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [yaml, setYaml] = useState<string | null>(null);
  const [visible, setVisible] = useState(priority);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (visible || !ref.current) return;
    const io = new IntersectionObserver(
      (items) => {
        if (items.some((i) => i.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || yaml || failed || !entry.renderable) return;
    let cancelled = false;
    fetch(`/api/dashboard/${entry.id}/yaml`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((text) => !cancelled && setYaml(text))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [visible, yaml, failed, entry.id, entry.renderable]);

  const { analysis } = entry;

  return (
    <div ref={ref}>
      <Link href={`/gallery/${entry.slug}`} className="hs-card hs-card--hover block h-full">
        {entry.renderable ? (
          yaml ? (
            <DashboardPreview yaml={yaml} height={230} loadCustomCards />
          ) : (
            <div className="hs-preview-frame hs-grid-bg" style={{ height: 230 }}>
              <div className="hui-skeleton h-full w-full" style={{ borderRadius: 0 }} />
            </div>
          )
        ) : (
          <div
            className="hs-preview-frame hs-grid-bg grid place-items-center px-6 text-center"
            style={{ height: 230 }}
          >
            <div>
              <FileWarning size={20} aria-hidden style={{ color: "var(--ink-3)", margin: "0 auto" }} />
              <p className="mt-2 text-[13px] font-medium">Metadata only</p>
              <p className="mt-1 text-[12px] text-faint">
                {entry.license.spdx ? entry.license.spdx.toUpperCase() : "No licence"} — YAML not
                re-hosted
              </p>
            </div>
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 truncate text-[14.5px] font-semibold">{entry.title}</h3>
            {typeof entry.stars === "number" ? (
              <span className="flex shrink-0 items-center gap-1 text-[12px] text-muted tabular-nums">
                <Star size={12} aria-hidden /> {entry.stars}
              </span>
            ) : null}
          </div>

          <p className="mt-1 line-clamp-2 text-[12.8px] leading-relaxed text-muted">
            {entry.description}
          </p>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {entry.tags.slice(0, 4).map((t) => (
              <span key={t} className="hs-tag">
                {t}
              </span>
            ))}
            {analysis.customCards.length ? (
              <span className="hs-tag" style={{ color: "var(--brand)" }}>
                +{analysis.customCards.length} custom
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex items-center justify-between border-t pt-2.5 text-[11.5px] text-faint">
            <span className="truncate">{entry.source.repo ?? entry.source.author}</span>
            <span className="flex shrink-0 items-center gap-2">
              <span>
                {analysis.counts.views}v · {analysis.counts.cards}c
              </span>
              <ExternalLink size={11} aria-hidden />
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
