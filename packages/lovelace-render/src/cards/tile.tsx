"use client";

import {
  computeEntityName,
  formatEntityState,
  relativeTime,
  stateColorVar,
  stateIcon,
  type LovelaceCardConfig,
} from "@ha-studio/lovelace";
import { Icon } from "../Icon";
import { useEntity } from "../context";
import { TileFeature, type FeatureConfig } from "../features/index";
import { FallbackCard, HaCard } from "./shell";

export function TileCard({ config }: { config: LovelaceCardConfig }) {
  const entityId = config.entity as string | undefined;
  const entity = useEntity(entityId);
  if (!entityId) return <FallbackCard type="tile" reason="No entity configured" />;

  const name = (config.name as string) ?? computeEntityName(entity, entityId);
  const icon = (config.icon as string) ?? stateIcon(entity, entityId);
  const color = config.color
    ? `var(--${config.color}-color, var(--state-active-color))`
    : (stateColorVar(entity) ?? "var(--state-icon-color)");
  const vertical = Boolean(config.vertical);
  const hideState = config.hide_state === true;
  const features = (config.features as FeatureConfig[] | undefined) ?? [];
  const picture = entity?.attributes.entity_picture as string | undefined;
  const showPicture = config.show_entity_picture === true && picture;

  let secondary: string | undefined;
  if (!hideState) secondary = formatEntityState(entity);
  const info = config.state_content as string | string[] | undefined;
  if (info) {
    const parts = (Array.isArray(info) ? info : [info]).map((key) => {
      if (key === "state") return formatEntityState(entity);
      if (key === "last_changed" || key === "last-changed")
        return entity ? relativeTime(entity.last_changed) : "";
      const v = entity?.attributes[key];
      return v === undefined ? "" : String(v);
    });
    secondary = parts.filter(Boolean).join(" ⸱ ");
  }

  return (
    <HaCard className="hui-tile-card">
      <div className={`hui-tile${vertical ? " hui-tile--vertical" : ""}`}>
        <div className="hui-tile__row">
          {showPicture ? (
            <img className="hui-tile__img" src={picture} alt="" />
          ) : (
            <div className="hui-tile__icon" style={{ ["--tile-color" as string]: color } as never}>
              <Icon icon={icon} size={22} />
            </div>
          )}
          <div className="hui-tile__text">
            <span className="hui-tile__name">{name}</span>
            {secondary ? <span className="hui-tile__state">{secondary}</span> : null}
          </div>
        </div>
        {features.length ? (
          <div className="hui-tile__features">
            {features.map((feature, i) => (
              <TileFeature key={`${feature.type}-${i}`} feature={feature} entity={entity} />
            ))}
          </div>
        ) : null}
      </div>
    </HaCard>
  );
}
