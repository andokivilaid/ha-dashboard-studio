import { NextResponse } from "next/server";
import { bundleBySlug } from "@ha-studio/lovelace";

/**
 * Proxies a HACS card bundle.
 *
 * Most of these live as GitHub release assets, which are served as
 * `application/octet-stream` with no `Access-Control-Allow-Origin` — a browser
 * refuses to execute them as a module. Fetching server-side and re-serving
 * them same-origin with `text/javascript` fixes both problems, and lets us
 * pin an exact version per bundle.
 */
export const revalidate = 86400;

const MAX_BYTES = 8 * 1024 * 1024;

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const clean = slug.replace(/\.js$/, "");
  const bundle = bundleBySlug(clean);
  if (!bundle) {
    return NextResponse.json({ error: `Unknown bundle: ${clean}` }, { status: 404 });
  }

  try {
    const upstream = await fetch(bundle.source, {
      headers: { "User-Agent": "ha-dashboard-studio" },
      next: { revalidate: 86400 },
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream ${upstream.status} for ${bundle.name}` },
        { status: 502 },
      );
    }
    const text = await upstream.text();
    if (text.length > MAX_BYTES) {
      return NextResponse.json({ error: "Bundle too large" }, { status: 502 });
    }
    return new NextResponse(text, {
      headers: {
        "Content-Type": "text/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        "X-Bundle-Version": bundle.version,
        "X-Bundle-Source": bundle.source,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fetch failed" },
      { status: 502 },
    );
  }
}
