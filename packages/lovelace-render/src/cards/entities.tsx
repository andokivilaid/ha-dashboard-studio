"use client";

import {
  computeEntityName,
  formatEntityState,
  isActive,
  relativeTime,
  stateColorVar,
  stateIcon,
  type HassEntity,
  type LovelaceCardConfig,
} from "@ha-studio/lovelace";
import { Icon } from "../Icon";
import { useHass } from "../context";
import { HaCard } from "./shell";

type RowConfig = string | (Record<string, unknown> & { entity?: string; type?: string });

function normalizeRow(row: RowConfig): Record<string, unknown> {
  return typeof row === "string" ? { entity: row } : row;
}

function RowControl({ entity }: { entity: HassEntity | undefined }) {
  if (!entity) return <span className="hui-entities-row__state">Unavailable</span>;
  const domain = entity.entity_id.split(".")[0];
  const toggleable = ["light", "switch", "fan", "input_boolean", "automation", "siren", "humidifier"];
  if (toggleable.includes(domain)) {
    return <span className="hui-toggle" data-on={isActive(entity)} />;
  }
  if (domain === "scene" || domain === "script") {
    return <span className="hui-entities-row__state" style={{ color: "var(--primary-color)" }}>
      {domain === "scene" ? "Activate" : "Run"}
    </span>;
  }
  return <span className="hui-entities-row__state">{formatEntityState(entity)}</span>;
}

export function EntitiesRow({ row }: { row: RowConfig }) {
  const cfg = normalizeRow(row);
  const hass = useHass();
  const type = cfg.type as string | undefined;

  if (type === "divider") return <div className="hui-section-divider" />;
  if (type === "section")
    return (
      <div className="hui-entities-row" style={{ paddingTop: 12 }}>
        <span style={{ fontWeight: 500, color: "var(--secondary-text-color)", fontSize: 13 }}>
          {String(cfg.label ?? "")}
        </span>
      </div>
    );
  if (type === "weblink" || type === "button" || type === "call-service" || type === "cast")
    return (
      <div className="hui-entities-row">
        <span className="hui-entities-row__icon">
          <Icon icon={(cfg.icon as string) ?? "mdi:link"} size={22} />
        </span>
        <span className="hui-entities-row__name">{String(cfg.name ?? cfg.url ?? type)}</span>
        <span className="hui-entities-row__state" style={{ color: "var(--primary-color)" }}>
          {String(cfg.action_name ?? "Open")}
        </span>
      </div>
    );

  const entityId = cfg.entity as string | undefined;
  const entity = entityId ? hass.states[entityId] : undefined;
  const name = (cfg.name as string) ?? computeEntityName(entity, entityId);
  const icon = (cfg.icon as string) ?? stateIcon(entity, entityId);
  const color = isActive(entity) ? (stateColorVar(entity) ?? "var(--state-active-color)") : "var(--state-icon-color)";
  const secondary = cfg.secondary_info as string | undefined;

  return (
    <div className="hui-entities-row" data-entity={entityId}>
      <span className="hui-entities-row__icon" style={{ ["--row-color" as string]: color } as never}>
        <Icon icon={icon} size={22} />
      </span>
      <span className="hui-entities-row__name">
        {name}
        {secondary && entity ? (
          <span className="hui-entities-row__secondary" style={{ display: "block" }}>
            {secondary === "last-changed" ? relativeTime(entity.last_changed) : String(entity.attributes[secondary] ?? "")}
          </span>
        ) : null}
      </span>
      <RowControl entity={entity} />
    </div>
  );
}

export function EntitiesCard({ config }: { config: LovelaceCardConfig }) {
  const hass = useHass();
  const rows = (config.entities as RowConfig[] | undefined) ?? [];
  const title = config.title as string | undefined;
  const showToggle = config.show_header_toggle;

  const anyOn = rows.some((r) => {
    const id = normalizeRow(r).entity as string | undefined;
    return id ? isActive(hass.states[id]) : false;
  });

  return (
    <HaCard className="hui-entities-card">
      {title || showToggle ? (
        <div className="hui-entities__header">
          <span style={{ fontSize: 20, fontWeight: 400 }}>{title ?? ""}</span>
          {showToggle ? <span className="hui-toggle" data-on={anyOn} /> : null}
        </div>
      ) : null}
      <div className="hui-entities__rows">
        {rows.map((row, i) => (
          <EntitiesRow key={i} row={row} />
        ))}
      </div>
      {config.footer ? (
        <div className="hui-entities__rows" style={{ borderTop: "1px solid var(--divider-color)" }}>
          <div className="hui-entities-row">
            <span className="hui-entities-row__name" style={{ color: "var(--secondary-text-color)", fontSize: 12 }}>
              Footer: {String((config.footer as Record<string, unknown>).type ?? "")}
            </span>
          </div>
        </div>
      ) : null}
    </HaCard>
  );
}

export function GlanceCard({ config }: { config: LovelaceCardConfig }) {
  const hass = useHass();
  const rows = ((config.entities as RowConfig[] | undefined) ?? []).map(normalizeRow);
  const columns = (config.columns as number | undefined) ?? Math.min(rows.length || 1, 4);
  const showName = config.show_name !== false;
  const showState = config.show_state !== false;
  const showIcon = config.show_icon !== false;

  return (
    <HaCard header={config.title as string | undefined} className="hui-glance-card">
      <div className="hui-glance" style={{ ["--glance-columns" as string]: columns } as never}>
        {rows.map((cfg, i) => {
          const entityId = cfg.entity as string | undefined;
          const entity = entityId ? hass.states[entityId] : undefined;
          const color = isActive(entity) ? (stateColorVar(entity) ?? "var(--state-active-color)") : "var(--state-icon-color)";
          return (
            <div className="hui-glance__item" key={i}>
              {showName ? (
                <span className="hui-glance__name">{(cfg.name as string) ?? computeEntityName(entity, entityId)}</span>
              ) : null}
              {showIcon ? <Icon icon={(cfg.icon as string) ?? stateIcon(entity, entityId)} size={26} style={{ color }} /> : null}
              {showState ? <span className="hui-glance__state">{formatEntityState(entity)}</span> : null}
            </div>
          );
        })}
      </div>
    </HaCard>
  );
}
