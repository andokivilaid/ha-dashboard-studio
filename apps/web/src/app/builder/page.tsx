import type { Metadata } from "next";
import { dashboardById, loadDashboardYaml } from "@ha-studio/catalog";
import { starterById, toLovelaceYaml, STARTER_TEMPLATES } from "@ha-studio/lovelace";
import { BuilderApp } from "@/components/builder/builder-app";

export const metadata: Metadata = {
  title: "Builder",
  description:
    "Describe a Home Assistant dashboard, watch it render live, and let the model review its own screenshot before you take the YAML.",
};

export default async function BuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; template?: string }>;
}) {
  const { from, template } = await searchParams;

  let initialYaml: string | null = null;
  let initialTitle: string | undefined;

  if (from) {
    const entry = dashboardById(from);
    if (entry) {
      initialYaml = await loadDashboardYaml(entry.id);
      initialTitle = entry.title;
    }
  }
  if (!initialYaml && template) {
    const starter = starterById(template);
    if (starter) {
      initialYaml = toLovelaceYaml(starter.config);
      initialTitle = starter.name;
    }
  }
  if (!initialYaml) {
    const fallback = starterById("sections-home") ?? STARTER_TEMPLATES[1];
    initialYaml = toLovelaceYaml(fallback.config);
    initialTitle = fallback.name;
  }

  return <BuilderApp initialYaml={initialYaml} initialTitle={initialTitle} />;
}
