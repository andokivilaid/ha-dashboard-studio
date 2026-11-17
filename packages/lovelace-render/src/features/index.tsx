"use client";

import {
  computeEntityName,
  formatEntityState,
  isActive,
  stateColorVar,
  type HassEntity,
} from "@ha-studio/lovelace";
import { Icon } from "../Icon";

export interface FeatureConfig {
  type: string;
  [key: string]: unknown;
}

function Bar({
  percent,
  label,
  color,
}: {
  percent: number;
  label: string;
  color?: string;
}) {
  return (
    <div className="hui-feature-bar" style={color ? ({ ["--feature-fill" as string]: color } as never) : undefined}>
      <div className="hui-feature-bar__fill" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
      <span className="hui-feature-bar__label">{label}</span>
    </div>
  );
}

function Buttons({
  items,
}: {
  items: Array<{ icon: string; active?: boolean; key: string; label?: string }>;
}) {
  return (
    <div className="hui-feature-buttons">
      {items.map((item) => (
        <button key={item.key} type="button" className="hui-feature-button" data-active={item.active ?? false} tabIndex={-1}>
          <Icon icon={item.icon} size={20} title={item.label} />
        </button>
      ))}
    </div>
  );
}

export function TileFeature({
  feature,
  entity,
}: {
  feature: FeatureConfig;
  entity: HassEntity | undefined;
}) {
  if (!entity) return null;
  const attrs = entity.attributes;
  const domain = entity.entity_id.split(".")[0];
  const accent = stateColorVar(entity) ?? "var(--state-active-color)";

  switch (feature.type) {
    case "light-brightness": {
      const brightness = Number(attrs.brightness ?? 0);
      const pct = entity.state === "on" ? Math.round((brightness / 255) * 100) : 0;
      return <Bar percent={pct} label={`${pct}%`} color="var(--state-light-active-color)" />;
    }
    case "light-color-temp": {
      const k = Number(attrs.color_temp_kelvin ?? 0);
      const min = Number(attrs.min_color_temp_kelvin ?? 2000);
      const max = Number(attrs.max_color_temp_kelvin ?? 6500);
      const pct = max > min ? ((k - min) / (max - min)) * 100 : 50;
      return <Bar percent={pct} label={`${k || "—"} K`} color="linear-gradient(90deg,#ffb46b,#ffffff,#bcd9ff)" />;
    }
    case "cover-position":
    case "cover-tilt-position": {
      const pos = Number(attrs.current_position ?? (entity.state === "open" ? 100 : 0));
      return <Bar percent={pos} label={`${pos}%`} color="var(--state-cover-active-color)" />;
    }
    case "cover-open-close":
      return (
        <Buttons
          items={[
            { key: "open", icon: "mdi:arrow-up", active: entity.state === "open", label: "Open" },
            { key: "stop", icon: "mdi:stop", label: "Stop" },
            { key: "close", icon: "mdi:arrow-down", active: entity.state === "closed", label: "Close" },
          ]}
        />
      );
    case "target-temperature": {
      const target = Number(attrs.temperature ?? attrs.target_temp_high ?? 20);
      return (
        <div className="hui-feature-buttons">
          <button type="button" className="hui-feature-button" tabIndex={-1}>
            <Icon icon="mdi:minus" size={20} />
          </button>
          <div className="hui-feature-bar" style={{ flex: 2, justifyContent: "center" }}>
            <span className="hui-feature-bar__label">
              {Number.isFinite(target) ? target.toFixed(1) : "—"} °
            </span>
          </div>
          <button type="button" className="hui-feature-button" tabIndex={-1}>
            <Icon icon="mdi:plus" size={20} />
          </button>
        </div>
      );
    }
    case "fan-speed": {
      const pct = Number(attrs.percentage ?? 0);
      return <Bar percent={pct} label={`${Math.round(pct)}%`} color="var(--state-fan-active-color)" />;
    }
    case "humidifier-target-humidity": {
      const target = Number(attrs.humidity ?? 50);
      return <Bar percent={target} label={`${target}%`} color="var(--state-humidifier-active-color)" />;
    }
    case "toggle":
      return (
        <Buttons
          items={[
            { key: "off", icon: "mdi:flash-off", active: !isActive(entity), label: "Off" },
            { key: "on", icon: "mdi:flash", active: isActive(entity), label: "On" },
          ]}
        />
      );
    case "lock-commands":
      return (
        <Buttons
          items={[
            { key: "lock", icon: "mdi:lock", active: entity.state === "locked", label: "Lock" },
            { key: "unlock", icon: "mdi:lock-open", active: entity.state === "unlocked", label: "Unlock" },
          ]}
        />
      );
    case "lock-open-door":
      return <Buttons items={[{ key: "open", icon: "mdi:door-open", label: "Open door" }]} />;
    case "vacuum-commands":
      return (
        <Buttons
          items={[
            { key: "start", icon: "mdi:play", active: entity.state === "cleaning", label: "Start" },
            { key: "pause", icon: "mdi:pause", label: "Pause" },
            { key: "stop", icon: "mdi:stop", label: "Stop" },
            { key: "home", icon: "mdi:home-map-marker", active: entity.state === "docked", label: "Return" },
          ]}
        />
      );
    case "media-player-volume-slider": {
      const vol = Number(attrs.volume_level ?? 0) * 100;
      return <Bar percent={vol} label={`${Math.round(vol)}%`} color="var(--state-media_player-active-color)" />;
    }
    case "media-player-playback":
      return (
        <Buttons
          items={[
            { key: "prev", icon: "mdi:skip-previous", label: "Previous" },
            { key: "play", icon: entity.state === "playing" ? "mdi:pause" : "mdi:play", active: entity.state === "playing", label: "Play" },
            { key: "next", icon: "mdi:skip-next", label: "Next" },
          ]}
        />
      );
    case "climate-hvac-modes": {
      const modes = ((feature.hvac_modes as string[]) ?? (attrs.hvac_modes as string[]) ?? []).slice(0, 5);
      const iconFor: Record<string, string> = {
        off: "mdi:power", heat: "mdi:fire", cool: "mdi:snowflake", auto: "mdi:autorenew",
        dry: "mdi:water-percent", fan_only: "mdi:fan", heat_cool: "mdi:sun-snowflake-variant",
      };
      return (
        <Buttons
          items={modes.map((m) => ({ key: m, icon: iconFor[m] ?? "mdi:thermostat", active: entity.state === m, label: m }))}
        />
      );
    }
    case "climate-preset-modes":
    case "fan-preset-modes":
    case "humidifier-modes":
    case "water-heater-operation-modes":
    case "select-options": {
      const list =
        (attrs.preset_modes as string[]) ??
        (attrs.available_modes as string[]) ??
        (attrs.operation_list as string[]) ??
        (attrs.options as string[]) ??
        [];
      const current = (attrs.preset_mode ?? attrs.mode ?? attrs.operation_mode ?? entity.state) as string;
      return (
        <div className="hui-feature-bar" style={{ justifyContent: "space-between" }}>
          <span className="hui-feature-bar__label">{String(current ?? "—")}</span>
          <Icon icon="mdi:chevron-down" size={18} />
          <span style={{ display: "none" }}>{list.join(",")}</span>
        </div>
      );
    }
    case "alarm-modes": {
      const modes = (feature.modes as string[]) ?? ["armed_home", "armed_away", "disarmed"];
      const iconFor: Record<string, string> = {
        disarmed: "mdi:shield-off", armed_home: "mdi:shield-home", armed_away: "mdi:shield-lock",
        armed_night: "mdi:shield-moon", armed_vacation: "mdi:shield-airplane",
      };
      return (
        <Buttons
          items={modes.map((m) => ({ key: m, icon: iconFor[m] ?? "mdi:shield", active: entity.state === m, label: m }))}
        />
      );
    }
    case "numeric-input": {
      const value = Number(entity.state);
      return (
        <div className="hui-feature-bar" style={{ justifyContent: "space-between" }}>
          <Icon icon="mdi:minus" size={18} />
          <span className="hui-feature-bar__label">{formatEntityState(entity)}</span>
          <Icon icon="mdi:plus" size={18} />
          <span style={{ display: "none" }}>{value}</span>
        </div>
      );
    }
    case "update-actions":
      return (
        <Buttons
          items={[
            { key: "install", icon: "mdi:download", active: entity.state === "on", label: "Install" },
            { key: "skip", icon: "mdi:cancel", label: "Skip" },
          ]}
        />
      );
    case "counter-actions":
      return (
        <Buttons
          items={[
            { key: "minus", icon: "mdi:minus", label: "Decrement" },
            { key: "plus", icon: "mdi:plus", label: "Increment" },
            { key: "reset", icon: "mdi:restore", label: "Reset" },
          ]}
        />
      );
    default:
      return (
        <div className="hui-feature-bar" style={{ justifyContent: "space-between", opacity: 0.75 }}>
          <span className="hui-feature-bar__label">{feature.type}</span>
          <Icon icon="mdi:help-circle-outline" size={16} />
          <span style={{ display: "none" }}>
            {domain} {computeEntityName(entity)} {accent}
          </span>
        </div>
      );
  }
}
