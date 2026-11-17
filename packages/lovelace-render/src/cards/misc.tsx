"use client";

import {
  computeEntityName,
  formatEntityState,
  isActive,
  stateColorVar,
  stateIcon,
  type LovelaceCardConfig,
} from "@ha-studio/lovelace";
import { Icon } from "../Icon";
import { useEntity, useHass } from "../context";
import { FallbackCard, HaCard } from "./shell";

export function MediaControlCard({ config }: { config: LovelaceCardConfig }) {
  const entityId = config.entity as string | undefined;
  const entity = useEntity(entityId);
  if (!entity) return <FallbackCard type="media-control" entity={entityId} reason="Entity not found" icon="mdi:cast" />;
  const a = entity.attributes;
  const playing = entity.state === "playing";
  const pos = Number(a.media_position ?? 0);
  const dur = Number(a.media_duration ?? 0);
  const progress = dur > 0 ? Math.min(100, (pos / dur) * 100) : 0;
  const title = (a.media_title as string) ?? formatEntityState(entity);
  const sub = [a.media_artist, a.media_series_title, a.app_name].filter(Boolean).join(" · ");

  return (
    <HaCard className="hui-media-control-card">
      <div className="hui-media">
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, opacity: 0.85 }}>
          <Icon icon={stateIcon(entity, entityId)} size={18} />
          {computeEntityName(entity, entityId)}
        </div>
        <div>
          <div className="hui-media__title">{title}</div>
          {sub ? <div className="hui-media__sub">{sub}</div> : null}
        </div>
        {dur > 0 ? (
          <div className="hui-media__progress">
            <span style={{ width: `${progress}%` }} />
          </div>
        ) : null}
        <div className="hui-media__controls">
          <Icon icon="mdi:skip-previous" size={22} />
          <Icon icon={playing ? "mdi:pause-circle" : "mdi:play-circle"} size={34} />
          <Icon icon="mdi:skip-next" size={22} />
          <span style={{ flex: 1 }} />
          <Icon icon={a.is_volume_muted ? "mdi:volume-off" : "mdi:volume-high"} size={20} />
          <span style={{ fontSize: 12 }}>{Math.round(Number(a.volume_level ?? 0) * 100)}%</span>
        </div>
      </div>
    </HaCard>
  );
}

function renderMarkdown(src: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = escape(src).split("\n");
  const out: string[] = [];
  let inList = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(bullet[1])}</li>`);
      continue;
    }
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
    if (heading) {
      const level = Math.min(heading[1].length, 3);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    if (!line) continue;
    out.push(`<p>${inline(line)}</p>`);
  }
  if (inList) out.push("</ul>");
  return out.join("");

  function inline(s: string): string {
    return s
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" rel="noreferrer noopener" target="_blank">$1</a>');
  }
}

export function MarkdownCard({ config }: { config: LovelaceCardConfig }) {
  const hass = useHass();
  let content = String(config.content ?? "");
  // Templates are not evaluated (no HA backend); show a readable placeholder.
  content = content.replace(/\{\{[^}]*states\(['"]([^'"]+)['"]\)[^}]*\}\}/g, (_m, id: string) =>
    formatEntityState(hass.states[id]),
  );
  content = content.replace(/\{\{[\s\S]*?\}\}/g, "…").replace(/\{%[\s\S]*?%\}/g, "");
  return (
    <HaCard className="hui-markdown-card">
      <div className="hui-markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
    </HaCard>
  );
}

export function PictureCard({ config }: { config: LovelaceCardConfig }) {
  const image = (config.image as string) ?? "/demo/placeholder.svg";
  return (
    <HaCard className="hui-picture-card">
      <div className="hui-picture">
        <img className="hui-picture__img" src={image} alt="" />
      </div>
    </HaCard>
  );
}

export function PictureEntityCard({ config }: { config: LovelaceCardConfig }) {
  const entityId = config.entity as string | undefined;
  const entity = useEntity(entityId);
  const image =
    (config.image as string) ??
    (entity?.attributes.entity_picture as string | undefined) ??
    "/demo/placeholder.svg";
  return (
    <HaCard className="hui-picture-entity-card">
      <div className="hui-picture">
        <img className="hui-picture__img" src={image} alt="" />
        {config.show_name !== false || config.show_state !== false ? (
          <div className="hui-picture__footer">
            {config.show_name !== false ? <span>{(config.name as string) ?? computeEntityName(entity, entityId)}</span> : <span />}
            {config.show_state !== false ? <span>{formatEntityState(entity)}</span> : null}
          </div>
        ) : null}
      </div>
    </HaCard>
  );
}

export function PictureGlanceCard({ config }: { config: LovelaceCardConfig }) {
  const hass = useHass();
  const entityId = config.camera_image as string | undefined;
  const camera = entityId ? hass.states[entityId] : undefined;
  const image =
    (config.image as string) ??
    (camera?.attributes.entity_picture as string | undefined) ??
    "/demo/placeholder.svg";
  const rows = ((config.entities as Array<string | { entity: string; icon?: string }> | undefined) ?? []).map((e) =>
    typeof e === "string" ? { entity: e } : e,
  );
  return (
    <HaCard className="hui-picture-glance-card">
      <div className="hui-picture">
        <img className="hui-picture__img" src={image} alt="" />
        <div className="hui-picture__footer">
          <span>{(config.title as string) ?? ""}</span>
          <span className="hui-picture__glance">
            {rows.slice(0, 6).map((r) => {
              const ent = hass.states[r.entity];
              return (
                <Icon
                  key={r.entity}
                  icon={r.icon ?? stateIcon(ent, r.entity)}
                  size={20}
                  style={{ opacity: isActive(ent) ? 1 : 0.55, color: isActive(ent) ? "var(--state-active-color)" : "#fff" }}
                  title={computeEntityName(ent, r.entity)}
                />
              );
            })}
          </span>
        </div>
      </div>
    </HaCard>
  );
}

export function PictureElementsCard({ config }: { config: LovelaceCardConfig }) {
  const hass = useHass();
  const image = (config.image as string) ?? "/demo/floorplan.svg";
  const elements = (config.elements as Array<Record<string, unknown>> | undefined) ?? [];
  return (
    <HaCard className="hui-picture-elements-card">
      <div className="hui-picture" style={{ position: "relative" }}>
        <img className="hui-picture__img" src={image} alt="" style={{ aspectRatio: "auto" }} />
        {elements.map((el, i) => {
          const style = (el.style as Record<string, string> | undefined) ?? {};
          const entityId = el.entity as string | undefined;
          const ent = entityId ? hass.states[entityId] : undefined;
          const type = String(el.type ?? "");
          const pos: React.CSSProperties = {
            position: "absolute",
            top: style.top,
            left: style.left,
            right: style.right,
            bottom: style.bottom,
            transform: style.transform ?? "translate(-50%, -50%)",
            color: isActive(ent) ? "var(--state-active-color)" : "#fff",
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,.6))",
            fontSize: 12,
          };
          if (type === "state-label")
            return (
              <span key={i} style={pos}>
                {formatEntityState(ent)}
              </span>
            );
          return (
            <span key={i} style={pos}>
              <Icon icon={(el.icon as string) ?? stateIcon(ent, entityId)} size={22} />
            </span>
          );
        })}
      </div>
    </HaCard>
  );
}

export function IframeCard({ config }: { config: LovelaceCardConfig }) {
  const url = String(config.url ?? "");
  return (
    <HaCard className="hui-iframe-card">
      <div style={{ padding: 10, fontSize: 12, color: "var(--secondary-text-color)", display: "flex", gap: 8, alignItems: "center" }}>
        <Icon icon="mdi:web" size={18} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url || "iframe"}</span>
      </div>
      <div className="hui-iframe" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--secondary-text-color)", fontSize: 12 }}>
        External page not loaded in preview
      </div>
    </HaCard>
  );
}

export function MapCard({ config }: { config: LovelaceCardConfig }) {
  const hass = useHass();
  const ids = ((config.entities as Array<string | { entity: string }> | undefined) ?? []).map((e) =>
    typeof e === "string" ? e : e.entity,
  );
  const pins = ids
    .map((id) => hass.states[id])
    .filter(Boolean)
    .map((ent, i) => ({
      id: ent.entity_id,
      label: computeEntityName(ent).slice(0, 1).toUpperCase(),
      name: computeEntityName(ent),
      x: 22 + ((i * 29) % 56),
      y: 28 + ((i * 37) % 44),
      home: ent.state === "home",
    }));
  return (
    <HaCard className="hui-map-card">
      <div className="hui-map">
        {pins.map((p) => (
          <div className="hui-map__pin" key={p.id} style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            <span className="hui-map__dot" style={{ background: p.home ? "var(--state-person-active-color)" : "var(--grey-color)" }}>
              {p.label}
            </span>
            <span>{p.name}</span>
          </div>
        ))}
        {!pins.length ? (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--secondary-text-color)", fontSize: 12 }}>
            Map preview
          </div>
        ) : null}
      </div>
    </HaCard>
  );
}

export function TodoListCard({ config }: { config: LovelaceCardConfig }) {
  const entityId = config.entity as string | undefined;
  const entity = useEntity(entityId);
  const items = [
    { text: "Oat milk", done: false },
    { text: "Coffee beans", done: false },
    { text: "Dishwasher tablets", done: false },
    { text: "Batteries AA", done: false },
    { text: "Bread", done: true },
  ];
  return (
    <HaCard header={(config.title as string) ?? computeEntityName(entity, entityId)} className="hui-todo-card">
      <div className="hui-todo">
        {items.map((item) => (
          <div className="hui-todo__item" key={item.text} data-done={item.done}>
            <span className="hui-todo__box" />
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </HaCard>
  );
}

export function CalendarCard({ config }: { config: LovelaceCardConfig }) {
  const events = [
    { time: "Sun 09:30", title: "Dentist — Laura" },
    { time: "Mon 08:00", title: "Bin collection — paper" },
    { time: "Mon 18:30", title: "Football practice" },
    { time: "Wed 12:00", title: "Lunch with Mari" },
  ];
  return (
    <HaCard header={(config.title as string) ?? "Calendar"} className="hui-calendar-card">
      <div style={{ padding: "4px 0 12px" }}>
        {events.map((e) => (
          <div className="hui-calendar__event" key={e.title}>
            <span className="hui-calendar__time">{e.time}</span>
            <span>{e.title}</span>
          </div>
        ))}
      </div>
    </HaCard>
  );
}

export function LogbookCard({ config }: { config: LovelaceCardConfig }) {
  const hass = useHass();
  const ids = ((config.entities as string[] | undefined) ?? Object.keys(hass.states).slice(0, 5)).slice(0, 6);
  return (
    <HaCard header={(config.title as string) ?? "Logbook"} className="hui-logbook-card">
      <div style={{ padding: "4px 0 12px" }}>
        {ids.map((id) => {
          const ent = hass.states[id];
          return (
            <div className="hui-entities-row" key={id}>
              <span className="hui-entities-row__icon" style={{ ["--row-color" as string]: stateColorVar(ent) ?? "var(--state-icon-color)" } as never}>
                <Icon icon={stateIcon(ent, id)} size={20} />
              </span>
              <span className="hui-entities-row__name">
                {computeEntityName(ent, id)} changed to {formatEntityState(ent)}
              </span>
            </div>
          );
        })}
      </div>
    </HaCard>
  );
}

export function HeadingCard({ config }: { config: LovelaceCardConfig }) {
  const hass = useHass();
  const style = (config.heading_style as string) ?? "title";
  const badges = (config.badges as Array<Record<string, unknown>> | undefined) ?? [];
  return (
    <div className={`hui-heading hui-heading--${style === "subtitle" ? "subtitle" : "title"}`}>
      {config.icon ? <Icon icon={config.icon as string} size={style === "subtitle" ? 18 : 22} /> : null}
      <span>{String(config.heading ?? "")}</span>
      {badges.length ? (
        <span className="hui-heading__badges">
          {badges.map((b, i) => {
            const ent = hass.states[String(b.entity ?? "")];
            return (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Icon icon={(b.icon as string) ?? stateIcon(ent, String(b.entity ?? ""))} size={16} />
                {formatEntityState(ent)}
              </span>
            );
          })}
        </span>
      ) : null}
    </div>
  );
}
