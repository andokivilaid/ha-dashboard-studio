"use client";

import {
  computeEntityName,
  formatEntityState,
  isActive,
  stateColorVar,
  stateIcon,
  type LovelaceBadgeConfig,
} from "@ha-studio/lovelace";
import { Icon } from "./Icon";
import { useHass } from "./context";

export function BadgeRenderer({ config }: { config: LovelaceBadgeConfig | string }) {
  const hass = useHass();
  const cfg: LovelaceBadgeConfig = typeof config === "string" ? { entity: config } : config;
  const entityId = cfg.entity as string | undefined;
  const entity = entityId ? hass.states[entityId] : undefined;
  const type = cfg.type ?? "entity";

  if (type !== "entity" && type !== "state-label" && !entityId) {
    return (
      <span className="hui-badge">
        <span className="hui-badge__icon">
          <Icon icon="mdi:shape-outline" size={20} />
        </span>
        <span className="hui-badge__text">
          <span className="hui-badge__state">{String(type)}</span>
        </span>
      </span>
    );
  }

  const color = cfg.color
    ? `var(--${String(cfg.color)}-color, var(--state-active-color))`
    : isActive(entity)
      ? (stateColorVar(entity) ?? "var(--state-active-color)")
      : "var(--state-icon-color)";
  const showName = cfg.show_name === true || cfg.display_type === "complete";
  const name = (cfg.name as string) ?? computeEntityName(entity, entityId);

  return (
    <span className="hui-badge" data-entity={entityId} style={{ ["--badge-color" as string]: color } as never}>
      <span className="hui-badge__icon">
        <Icon icon={(cfg.icon as string) ?? stateIcon(entity, entityId)} size={20} />
      </span>
      <span className="hui-badge__text">
        {showName ? <span className="hui-badge__name">{name}</span> : null}
        <span className="hui-badge__state">{formatEntityState(entity)}</span>
      </span>
    </span>
  );
}
