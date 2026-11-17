import Link from "next/link";
import { ArrowRight, Boxes, Eye, Sparkles, Wifi } from "lucide-react";
import { allDashboards, computeFacets } from "@ha-studio/catalog";
import { CUSTOM_CARD_BUNDLES } from "@ha-studio/lovelace";
import { STARTER_TEMPLATES } from "@ha-studio/lovelace";
import { DashboardPreview } from "@/components/dashboard-preview";
import { GithubMark } from "@/components/icons";
import { HomeHeroPreview } from "@/components/home-hero-preview";

export default function HomePage() {
  const entries = allDashboards();
  const facets = computeFacets(entries);
  const renderable = entries.filter((e) => e.renderable).length;
  const repos = new Set(entries.map((e) => e.source.repo).filter(Boolean)).size;
  const featured = entries.filter((e) => e.renderable).slice(0, 3);

  const stats = [
    { label: "dashboards catalogued", value: entries.length },
    { label: "renderable live", value: renderable },
    { label: "source repositories", value: repos },
    { label: "distinct card types", value: facets.cardTypes.length },
  ];

  return (
    <>
      <section className="relative overflow-hidden border-b">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            background:
              "radial-gradient(900px 420px at 15% -10%, var(--brand-soft), transparent 70%), radial-gradient(700px 360px at 85% 0%, rgba(245,165,36,0.1), transparent 70%)",
          }}
        />
        <div className="relative mx-auto grid max-w-[1400px] gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:py-20">
          <div className="hs-animate-in flex flex-col justify-center">
            <span className="hs-chip hs-chip--static mb-5 w-fit" style={{ color: "var(--brand)" }}>
              <Sparkles size={13} aria-hidden /> Lovable, but for Home Assistant
            </span>
            <h1 className="text-balance text-[2.3rem] font-semibold leading-[1.08] tracking-tight sm:text-[3.1rem]">
              Browse real Home Assistant dashboards.
              <br />
              <span style={{ color: "var(--brand)" }}>Then build your own.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
              A searchable gallery of Lovelace dashboards collected from public GitHub
              configurations, every one of them rendered live with mock entities — not a
              screenshot. Then open any of them in a builder where you describe what you want,
              an LLM writes the YAML, and it <em>looks at its own render</em> before handing it
              back.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/gallery" className="hs-btn hs-btn--primary">
                Browse the gallery <ArrowRight size={15} aria-hidden />
              </Link>
              <Link href="/builder" className="hs-btn">
                <Sparkles size={15} aria-hidden /> Open the builder
              </Link>
              <a
                className="hs-btn hs-btn--ghost"
                href="https://github.com/andokivilaid/ha-dashboard-studio"
                target="_blank"
                rel="noreferrer noopener"
              >
                <GithubMark size={15} /> Source
              </a>
            </div>

            <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4 lg:max-w-lg">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="text-[11.5px] uppercase tracking-wide text-faint">{s.label}</dt>
                  <dd className="text-[1.6rem] font-semibold tabular-nums leading-tight">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="hs-animate-in" style={{ animationDelay: "90ms" }}>
            <HomeHeroPreview />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1400px] px-4 py-14 sm:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          <Feature
            icon={<Eye size={18} aria-hidden />}
            title="Live renders, not screenshots"
            body="The renderer implements the Home Assistant card set — tile with features, sections views, badges, heading cards — against a mock hass object, and loads real HACS bundles (Mushroom, Bubble Card, button-card, mini-graph-card, apexcharts) for custom cards."
          />
          <Feature
            icon={<Sparkles size={18} aria-hidden />}
            title="An AI that checks its work"
            body="Describe a dashboard; the model inventories your entities, hides diagnostics and unavailables, writes current-best-practice YAML, renders it, screenshots it, and feeds the image back to a vision model to fix layout problems before you see it."
          />
          <Feature
            icon={<Wifi size={18} aria-hidden />}
            title="Read-only by design"
            body="Connect a real instance with a long-lived token and the studio reads states, registries and your existing dashboards over the websocket API. It never calls a service and never writes. The token stays in your browser."
          />
        </div>
      </section>

      {featured.length ? (
        <section className="mx-auto w-full max-w-[1400px] px-4 pb-16 sm:px-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Featured dashboards</h2>
              <p className="text-[13.5px] text-muted">Rendered right now, in your browser.</p>
            </div>
            <Link href="/gallery" className="hs-btn hs-btn--sm">
              All {entries.length} <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((entry) => (
              <Link key={entry.id} href={`/gallery/${entry.slug}`} className="hs-card hs-card--hover block">
                <FeaturedPreview slug={entry.slug} id={entry.id} />
                <div className="p-4">
                  <h3 className="text-[14.5px] font-semibold">{entry.title}</h3>
                  <p className="mt-1 line-clamp-2 text-[13px] text-muted">{entry.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="border-t">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-14 sm:px-6">
          <h2 className="text-xl font-semibold tracking-tight">What the renderer supports</h2>
          <p className="mt-1 max-w-3xl text-[13.5px] text-muted">
            Built-in cards are implemented natively against Home Assistant&apos;s own design
            tokens. These HACS bundles are proxied and executed for real:
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CUSTOM_CARD_BUNDLES.map((b) => (
              <a
                key={b.slug}
                href={b.homepage}
                target="_blank"
                rel="noreferrer noopener"
                className="hs-card hs-card--hover p-4"
              >
                <div className="flex items-center gap-2">
                  <Boxes size={15} aria-hidden style={{ color: "var(--brand)" }} />
                  <span className="text-[14px] font-semibold">{b.name}</span>
                  <span className="hs-tag ml-auto">{b.version}</span>
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{b.description}</p>
                <p className="mt-2 text-[11.5px] text-faint">{b.license}</p>
              </a>
            ))}
          </div>

          <h3 className="mt-10 text-[15px] font-semibold">Starter templates in the builder</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {STARTER_TEMPLATES.map((t) => (
              <Link key={t.id} href={`/builder?template=${t.id}`} className="hs-chip">
                {t.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="hs-card p-5">
      <div
        className="grid h-9 w-9 place-items-center rounded-[10px]"
        style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
      >
        {icon}
      </div>
      <h3 className="mt-3 text-[15px] font-semibold">{title}</h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}

async function FeaturedPreview({ slug, id }: { slug: string; id: string }) {
  const { loadDashboardYaml } = await import("@ha-studio/catalog");
  const yaml = await loadDashboardYaml(id);
  void slug;
  return <DashboardPreview yaml={yaml} height={230} loadCustomCards />;
}
