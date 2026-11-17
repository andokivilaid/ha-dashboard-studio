import { NextResponse } from "next/server";
import { dashboardById, loadDashboardYaml } from "@ha-studio/catalog";

export const dynamic = "force-static";

/** Serves a catalogued dashboard's YAML. Only permissive sources have one. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const entry = dashboardById(id);
  if (!entry) return NextResponse.json({ error: "Unknown dashboard" }, { status: 404 });
  const yaml = await loadDashboardYaml(id);
  if (!yaml) {
    return NextResponse.json(
      { error: entry.yamlOmittedReason ?? "No YAML stored for this entry" },
      { status: 404 },
    );
  }
  return new NextResponse(yaml, {
    headers: {
      "Content-Type": "text/yaml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
