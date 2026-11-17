import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Scale, Star, Wand2 } from "lucide-react";
import { allDashboards, dashboardBySlug, loadDashboardYaml } from "@ha-studio/catalog";
import { bundleForCustomCard } from "@ha-studio/lovelace";
import { DashboardDetail } from "@/components/dashboard-detail";

export const dynamicParams = true;

export async function generateStaticParams() {
  // Pre-render the curated set and the most prominent harvested dashboards.
  return allDashboards()
    .slice(0, 60)
    .map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = dashboardBySlug(slug);
  if (!entry) return { title: "Dashboard not found" };
  return {
    title: entry.title,
    description: entry.description,
  };
}

export default async function DashboardDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = dashboardBySlug(slug);
  if (!entry) notFound();

  const yaml = await loadDashboardYaml(entry.id);
  const bundles = entry.analysis.customCards.map((c) => ({
    type: c,
    bundle: bundleForCustomCard(c) ?? null,
  }));

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6">
      <Link href="/gallery" className="hs-btn hs-btn--ghost hs-btn--sm mb-4">
        <ArrowLeft size={14} aria-hidden /> Back to gallery
      </Link>

      <header className="mb-6 flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-[1.6rem] font-semibold leading-tight tracking-tight">{entry.title}</h1>
          <p className="mt-1.5 max-w-3xl text-[14px] leading-relaxed text-muted">{entry.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-muted">
            <a
              href={entry.source.authorUrl ?? entry.source.url}
              target="_blank"
              rel="noreferrer noopener"
              className="hover:underline"
            >
              {entry.source.author}
            </a>
            {typeof entry.stars === "number" ? (
              <span className="flex items-center gap-1">
                <Star size={12} aria-hidden /> {entry.stars}
              </span>
            ) : null}
            <span className="flex items-center gap-1">
              <Scale size={12} aria-hidden />
              {entry.license.name ?? entry.license.spdx ?? "No licence stated"}
            </span>
            {entry.lastCommit ? (
              <span>updated {new Date(entry.lastCommit).toLocaleDateString("en-GB")}</span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <a className="hs-btn" href={entry.source.url} target="_blank" rel="noreferrer noopener">
            <ExternalLink size={14} aria-hidden /> View source
          </a>
          {yaml ? (
            <Link className="hs-btn hs-btn--primary" href={`/builder?from=${entry.id}`}>
              <Wand2 size={14} aria-hidden /> Open in builder
            </Link>
          ) : null}
        </div>
      </header>

      {!yaml ? (
        <div
          className="hs-card mb-6 p-4 text-[13.5px]"
          style={{ borderColor: "color-mix(in srgb, var(--accent) 45%, var(--line))" }}
        >
          <strong>YAML not re-hosted.</strong>{" "}
          {entry.yamlOmittedReason ??
            "This source is not permissively licensed, so only metadata and a link are kept."}{" "}
          Follow the source link to read it on the author&apos;s own terms.
        </div>
      ) : null}

      <DashboardDetail entry={entry} yaml={yaml} bundles={bundles} />
    </div>
  );
}
