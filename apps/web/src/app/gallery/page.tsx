import type { Metadata } from "next";
import { allDashboards, computeFacets } from "@ha-studio/catalog";
import { GalleryClient } from "@/components/gallery-client";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Every Home Assistant dashboard in the catalogue, filterable by card type, custom card, view type and style.",
};

export default function GalleryPage() {
  const entries = allDashboards();
  const facets = computeFacets(entries);
  return <GalleryClient entries={entries} facets={facets} />;
}
