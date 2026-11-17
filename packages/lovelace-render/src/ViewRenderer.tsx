"use client";

import type { LovelaceCardConfig, LovelaceSectionConfig, LovelaceViewConfig } from "@ha-studio/lovelace";
import { BadgeRenderer } from "./Badge";
import { CardRenderer } from "./CardRenderer";
import { useRenderOptions } from "./context";

function gridColumns(card: LovelaceCardConfig): number {
  const opts = (card.grid_options ?? card.layout_options) as
    | { columns?: number | "full" }
    | undefined;
  const raw = opts?.columns;
  if (raw === "full") return 12;
  if (typeof raw === "number" && raw > 0) return Math.min(12, raw);
  // Match the `getGridOptions()` each card type declares upstream: headings and
  // wide content span the grid, compact controls take half of it.
  if (card.type === "heading") return 12;
  if (card.type === "tile" || card.type === "button" || card.type === "entity") return 6;
  if (card.type?.startsWith("custom:")) {
    const tag = card.type.slice("custom:".length);
    // Mushroom, Bubble and button-card are all compact control cards.
    if (/^(mushroom-(?!chips|title)|bubble-card$|button-card$|mini-graph-card$)/.test(tag)) return 6;
    return 12;
  }
  return 12;
}

function SectionRenderer({
  section,
  viewIndex,
  sectionIndex,
}: {
  section: LovelaceSectionConfig;
  viewIndex: number;
  sectionIndex: number;
}) {
  const cards = (section.cards as LovelaceCardConfig[] | undefined) ?? [];
  const span = Number(section.column_span ?? 1);
  return (
    <div className="hui-section" style={{ ["--hui-section-span" as string]: span } as never} data-section={sectionIndex}>
      {section.title ? <h2 className="hui-section__title">{section.title}</h2> : null}
      {cards.map((card, i) => (
        <div
          key={i}
          className="hui-section__item"
          style={{ ["--hui-card-cols" as string]: gridColumns(card) } as never}
        >
          <CardRenderer config={card} path={{ view: viewIndex, section: sectionIndex, card: i }} />
        </div>
      ))}
    </div>
  );
}

/** HA distributes masonry cards by running card-size total, not round-robin. */
function distributeMasonry(cards: LovelaceCardConfig[], columns: number): LovelaceCardConfig[][] {
  const buckets: LovelaceCardConfig[][] = Array.from({ length: columns }, () => []);
  const sizes = new Array(columns).fill(0);
  const estimate = (card: LovelaceCardConfig): number => {
    switch (card.type) {
      case "entities":
        return 1 + ((card.entities as unknown[] | undefined)?.length ?? 0) * 0.5;
      case "thermostat":
      case "light":
      case "humidifier":
        return 5;
      case "weather-forecast":
        return 4;
      case "history-graph":
      case "statistics-graph":
        return 4;
      case "picture-glance":
      case "picture-entity":
      case "picture":
      case "map":
      case "media-control":
        return 3;
      case "markdown":
        return Math.max(2, String(card.content ?? "").split("\n").length * 0.4);
      case "tile":
      case "button":
        return 1.5;
      case "vertical-stack":
        return ((card.cards as unknown[] | undefined)?.length ?? 1) * 2;
      default:
        return 3;
    }
  };
  for (const card of cards) {
    let target = 0;
    for (let i = 1; i < columns; i += 1) if (sizes[i] < sizes[target]) target = i;
    buckets[target].push(card);
    sizes[target] += estimate(card);
  }
  return buckets;
}

export function ViewRenderer({ view, viewIndex = 0 }: { view: LovelaceViewConfig; viewIndex?: number }) {
  useRenderOptions();
  const type = view.type ?? (view.panel ? "panel" : "masonry");
  const badges = (view.badges ?? []) as Array<never>;
  const cards = (view.cards ?? []) as LovelaceCardConfig[];

  const badgeRow = badges.length ? (
    <div className="hui-badges">
      {badges.map((badge, i) => (
        <BadgeRenderer key={i} config={badge} />
      ))}
    </div>
  ) : null;

  if (type === "sections") {
    const sections = (view.sections ?? []) as LovelaceSectionConfig[];
    const columns = Math.min(Math.max(Number(view.max_columns ?? 4), 1), 6);
    return (
      <div className="hui-view hui-view--sections-wrap" data-view-type="sections">
        {badgeRow}
        <div className="hui-view hui-view--sections" style={{ ["--hui-columns" as string]: columns } as never}>
          {sections.map((section, i) => (
            <SectionRenderer key={i} section={section} viewIndex={viewIndex} sectionIndex={i} />
          ))}
        </div>
      </div>
    );
  }

  if (type === "panel") {
    return (
      <div className="hui-view hui-view--panel" data-view-type="panel">
        {badgeRow}
        {cards.slice(0, 1).map((card, i) => (
          <CardRenderer key={i} config={card} path={{ view: viewIndex, card: i }} />
        ))}
      </div>
    );
  }

  if (type === "sidebar") {
    const main = cards.filter((_, i) => i % 3 !== 2);
    const side = cards.filter((_, i) => i % 3 === 2);
    return (
      <div data-view-type="sidebar">
        {badgeRow}
        <div className="hui-view hui-view--sidebar">
          <div className="hui-masonry-column">
            {main.map((card, i) => (
              <CardRenderer key={i} config={card} path={{ view: viewIndex, card: cards.indexOf(card) }} />
            ))}
          </div>
          <div className="hui-masonry-column">
            {side.map((card, i) => (
              <CardRenderer key={i} config={card} path={{ view: viewIndex, card: cards.indexOf(card) }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const columns = 3;
  const buckets = distributeMasonry(cards, columns);
  return (
    <div data-view-type={type}>
      {badgeRow}
      <div className="hui-view hui-view--masonry" style={{ ["--hui-columns" as string]: columns } as never}>
        {buckets.map((bucket, col) => (
          <div className="hui-masonry-column" key={col}>
            {bucket.map((card) => (
              <CardRenderer key={cards.indexOf(card)} config={card} path={{ view: viewIndex, card: cards.indexOf(card) }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
