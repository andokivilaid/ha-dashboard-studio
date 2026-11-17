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

/** Shared SVG arc used by the light and thermostat dials. */
function Dial({
  size,
  percent,
  color,
  track = "var(--slider-track-color)",
  thickness = 14,
  gapDegrees = 60,
}: {
  size: number;
  percent: number;
  color: string;
  track?: string;
  thickness?: number;
  gapDegrees?: number;
}) {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const sweep = 360 - gapDegrees;
  const toXY = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  const start = 90 + gapDegrees / 2;
  const arc = (frac: number) => {
    const end = start + sweep * Math.max(0, Math.min(1, frac));
    const [x1, y1] = toXY(start);
    const [x2, y2] = toXY(end);
    const large = sweep * frac > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <path d={arc(1)} fill="none" stroke={track} strokeWidth={thickness} strokeLinecap="round" />
      {percent > 0 ? (
        <path d={arc(percent / 100)} fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="round" />
      ) : null}
    </svg>
  );
}

export function LightCard({ config }: { config: LovelaceCardConfig }) {
  const entityId = config.entity as string | undefined;
  const entity = useEntity(entityId);
  if (!entityId) return <FallbackCard type="light" reason="No entity configured" />;
  const on = entity?.state === "on";
  const brightness = Number(entity?.attributes.brightness ?? 0);
  const pct = on ? Math.round((brightness / 255) * 100) || 100 : 0;
  const rgb = entity?.attributes.rgb_color as [number, number, number] | undefined;
  const color = on ? (rgb ? `rgb(${rgb.join(",")})` : "var(--state-light-active-color)") : "var(--state-icon-color)";

  return (
    <HaCard className="hui-light-card">
      <div className="hui-light">
        <div className="hui-light__dial">
          <Dial size={180} percent={pct} color={color} />
          <div className="hui-light__value">
            {on ? (
              <>
                {pct}
                <small>%</small>
              </>
            ) : (
              <Icon icon="mdi:lightbulb-outline" size={40} style={{ color: "var(--state-icon-color)" }} />
            )}
          </div>
        </div>
        <div className="hui-light__name">{(config.name as string) ?? computeEntityName(entity, entityId)}</div>
      </div>
    </HaCard>
  );
}

const HVAC_ICONS: Record<string, string> = {
  off: "mdi:power",
  heat: "mdi:fire",
  cool: "mdi:snowflake",
  auto: "mdi:autorenew",
  dry: "mdi:water-percent",
  fan_only: "mdi:fan",
  heat_cool: "mdi:sun-snowflake-variant",
};

export function ThermostatCard({ config }: { config: LovelaceCardConfig }) {
  const entityId = config.entity as string | undefined;
  const entity = useEntity(entityId);
  if (!entityId || !entity) return <FallbackCard type="thermostat" entity={entityId} reason="Entity not found" />;

  const a = entity.attributes;
  const min = Number(a.min_temp ?? 7);
  const max = Number(a.max_temp ?? 35);
  const target = Number(a.temperature ?? a.target_temp_high ?? min);
  const current = Number(a.current_temperature ?? NaN);
  const pct = max > min ? ((target - min) / (max - min)) * 100 : 0;
  const action = (a.hvac_action as string | undefined) ?? entity.state;
  const color = stateColorVar(entity) ?? "var(--state-icon-color)";
  const modes = (a.hvac_modes as string[] | undefined) ?? [];

  return (
    <HaCard header={config.name as string | undefined} className="hui-thermostat-card">
      <div className="hui-thermostat">
        <div className="hui-thermostat__dial">
          <Dial size={210} percent={pct} color={color} thickness={16} />
          <div className="hui-thermostat__readout">
            <div className="hui-thermostat__target">{Number.isFinite(target) ? target.toFixed(1) : "—"}</div>
            {Number.isFinite(current) ? (
              <div className="hui-thermostat__current">Currently {current.toFixed(1)} °</div>
            ) : null}
            <div className="hui-thermostat__action" style={{ ["--thermo-color" as string]: color } as never}>
              {String(action).replace(/_/g, " ")}
            </div>
          </div>
        </div>
        {modes.length ? (
          <div className="hui-mode-row">
            {modes.map((mode) => (
              <span
                key={mode}
                className="hui-mode-chip"
                data-active={entity.state === mode}
                style={{ ["--chip-active" as string]: color } as never}
              >
                <Icon icon={HVAC_ICONS[mode] ?? "mdi:thermostat"} size={20} title={mode} />
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </HaCard>
  );
}

export function HumidifierCard({ config }: { config: LovelaceCardConfig }) {
  const entityId = config.entity as string | undefined;
  const entity = useEntity(entityId);
  if (!entity) return <FallbackCard type="humidifier" entity={entityId} reason="Entity not found" />;
  const target = Number(entity.attributes.humidity ?? 50);
  const current = Number(entity.attributes.current_humidity ?? NaN);
  const color = entity.state === "on" ? "var(--state-humidifier-active-color)" : "var(--state-icon-color)";
  return (
    <HaCard className="hui-humidifier-card">
      <div className="hui-thermostat">
        <div className="hui-thermostat__dial">
          <Dial size={210} percent={target} color={color} thickness={16} />
          <div className="hui-thermostat__readout">
            <div className="hui-thermostat__target">{target}%</div>
            {Number.isFinite(current) ? (
              <div className="hui-thermostat__current">Currently {current}%</div>
            ) : null}
            <div className="hui-thermostat__action">{entity.state}</div>
          </div>
        </div>
      </div>
    </HaCard>
  );
}

export function ButtonCard({ config }: { config: LovelaceCardConfig }) {
  const entityId = config.entity as string | undefined;
  const entity = useEntity(entityId);
  const showState = config.show_state === true;
  const showName = config.show_name !== false;
  const showIcon = config.show_icon !== false;
  const active = isActive(entity);
  const color = config.icon_height
    ? "var(--state-icon-color)"
    : active
      ? (stateColorVar(entity) ?? "var(--state-active-color)")
      : "var(--state-icon-color)";
  const name = (config.name as string) ?? (entityId ? computeEntityName(entity, entityId) : "Button");
  const icon = (config.icon as string) ?? (entityId ? stateIcon(entity, entityId) : "mdi:gesture-tap-button");

  return (
    <HaCard className="hui-button-card">
      <div className="hui-button">
        {showIcon ? (
          <Icon icon={icon} size={40} className="hui-button__icon" style={{ color }} />
        ) : null}
        {showName ? <div className="hui-button__name">{name}</div> : null}
        {showState ? <div className="hui-button__state">{formatEntityState(entity)}</div> : null}
      </div>
    </HaCard>
  );
}

export function EntityCard({ config }: { config: LovelaceCardConfig }) {
  const entityId = config.entity as string | undefined;
  const entity = useEntity(entityId);
  const color = isActive(entity) ? (stateColorVar(entity) ?? "var(--state-active-color)") : "var(--state-icon-color)";
  return (
    <HaCard className="hui-entity-card">
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--secondary-text-color)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {(config.name as string) ?? computeEntityName(entity, entityId)}
          </span>
          <Icon icon={(config.icon as string) ?? stateIcon(entity, entityId)} size={22} style={{ color }} />
        </div>
        <div style={{ fontSize: 28, fontWeight: 400, fontVariantNumeric: "tabular-nums" }}>
          {formatEntityState(entity)}
        </div>
      </div>
    </HaCard>
  );
}

export function AlarmPanelCard({ config }: { config: LovelaceCardConfig }) {
  const entityId = config.entity as string | undefined;
  const entity = useEntity(entityId);
  const colorMap: Record<string, string> = {
    disarmed: "var(--state-icon-color)",
    triggered: "var(--red-color)",
    arming: "var(--orange-color)",
    pending: "var(--orange-color)",
  };
  const color = entity ? (colorMap[entity.state] ?? "var(--red-color)") : "var(--state-icon-color)";
  const states = (config.states as string[] | undefined) ?? ["arm_home", "arm_away"];
  return (
    <HaCard header={(config.name as string) ?? computeEntityName(entity, entityId)} className="hui-alarm-card">
      <div className="hui-alarm">
        <div className="hui-alarm__state" style={{ ["--alarm-color" as string]: color } as never}>
          <Icon icon={stateIcon(entity, entityId)} size={26} />
          {formatEntityState(entity)}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {states.map((s) => (
            <span key={s} className="hui-mode-chip" style={{ width: "auto", padding: "0 14px", borderRadius: 18 }}>
              {s.replace(/_/g, " ")}
            </span>
          ))}
        </div>
        <div className="hui-alarm__grid">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((k, i) => (
            <div key={i} className="hui-alarm__key">
              {k}
            </div>
          ))}
        </div>
      </div>
    </HaCard>
  );
}

export function AreaCard({ config }: { config: LovelaceCardConfig }) {
  const hass = useHass();
  const areaId = config.area as string | undefined;
  const area = areaId ? hass.areas[areaId] : undefined;
  if (!area) return <FallbackCard type="area" entity={areaId} reason="Area not found" icon="mdi:texture-box" />;

  const entityIds = Object.values(hass.entities)
    .filter((e) => e.area_id === area.area_id)
    .map((e) => e.entity_id);
  const sensors = entityIds
    .filter((id) => id.startsWith("sensor."))
    .filter((id) => {
      const dc = hass.states[id]?.attributes.device_class;
      return dc === "temperature" || dc === "humidity";
    })
    .slice(0, 3);
  const controls = entityIds
    .filter((id) => /^(light|switch|fan|cover|climate|media_player|lock)\./.test(id))
    .slice(0, 6);

  return (
    <HaCard className="hui-area-card">
      <div className="hui-area">
        <div>
          <div className="hui-area__name">{area.name}</div>
          <div className="hui-area__sensors">
            {sensors.length
              ? sensors.map((id) => formatEntityState(hass.states[id])).join(" · ")
              : `${entityIds.length} entities`}
          </div>
        </div>
        <div className="hui-area__controls">
          {controls.map((id) => (
            <span key={id} className="hui-area__chip" data-active={isActive(hass.states[id])}>
              <Icon icon={stateIcon(hass.states[id], id)} size={20} />
            </span>
          ))}
        </div>
      </div>
    </HaCard>
  );
}
