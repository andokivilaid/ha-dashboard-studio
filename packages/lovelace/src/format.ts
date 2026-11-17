import type { HassEntity, HomeAssistant } from "./types";

export const UNAVAILABLE_STATES = ["unavailable", "unknown"];

export function isUnavailable(state: string | undefined): boolean {
  return state === undefined || UNAVAILABLE_STATES.includes(state);
}

/** `light.kitchen_ceiling` -> `Kitchen Ceiling` */
export function entityIdToName(entityId: string): string {
  const object = entityId.includes(".") ? entityId.split(".")[1] : entityId;
  return object
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function computeEntityName(entity: HassEntity | undefined, entityId?: string): string {
  if (entity?.attributes.friendly_name) return String(entity.attributes.friendly_name);
  return entityIdToName(entity?.entity_id ?? entityId ?? "unknown.unknown");
}

/** Humanised state label, mirroring HA's `state` translations for common domains. */
const STATE_LABELS: Record<string, Record<string, string>> = {
  _: {
    unavailable: "Unavailable",
    unknown: "Unknown",
    on: "On",
    off: "Off",
    home: "Home",
    not_home: "Away",
    open: "Open",
    closed: "Closed",
    opening: "Opening",
    closing: "Closing",
    locked: "Locked",
    unlocked: "Unlocked",
    jammed: "Jammed",
    idle: "Idle",
    playing: "Playing",
    paused: "Paused",
    standby: "Standby",
    cleaning: "Cleaning",
    docked: "Docked",
    returning: "Returning",
    heat: "Heat",
    cool: "Cool",
    heat_cool: "Heat/Cool",
    auto: "Auto",
    dry: "Dry",
    fan_only: "Fan only",
    above_horizon: "Above horizon",
    below_horizon: "Below horizon",
    disarmed: "Disarmed",
    armed_home: "Armed home",
    armed_away: "Armed away",
    armed_night: "Armed night",
    armed_vacation: "Armed vacation",
    arming: "Arming",
    pending: "Pending",
    triggered: "Triggered",
  },
  binary_sensor: {},
  weather: {
    "clear-night": "Clear, night",
    cloudy: "Cloudy",
    exceptional: "Exceptional",
    fog: "Fog",
    hail: "Hail",
    lightning: "Lightning",
    "lightning-rainy": "Lightning, rainy",
    partlycloudy: "Partly cloudy",
    pouring: "Pouring",
    rainy: "Rainy",
    snowy: "Snowy",
    "snowy-rainy": "Snowy, rainy",
    sunny: "Sunny",
    windy: "Windy",
    "windy-variant": "Windy",
  },
};

const BINARY_SENSOR_LABELS: Record<string, [on: string, off: string]> = {
  battery: ["Low", "Normal"],
  battery_charging: ["Charging", "Not charging"],
  carbon_monoxide: ["Detected", "Clear"],
  cold: ["Cold", "Normal"],
  connectivity: ["Connected", "Disconnected"],
  door: ["Open", "Closed"],
  garage_door: ["Open", "Closed"],
  gas: ["Detected", "Clear"],
  heat: ["Hot", "Normal"],
  light: ["Detected", "No light"],
  lock: ["Unlocked", "Locked"],
  moisture: ["Wet", "Dry"],
  motion: ["Detected", "Clear"],
  occupancy: ["Detected", "Clear"],
  opening: ["Open", "Closed"],
  plug: ["Plugged in", "Unplugged"],
  power: ["Detected", "No power"],
  presence: ["Home", "Away"],
  problem: ["Problem", "OK"],
  running: ["Running", "Not running"],
  safety: ["Unsafe", "Safe"],
  smoke: ["Detected", "Clear"],
  sound: ["Detected", "Clear"],
  tamper: ["Detected", "Clear"],
  update: ["Update available", "Up-to-date"],
  vibration: ["Detected", "Clear"],
  window: ["Open", "Closed"],
};

export function formatNumber(value: number, precision?: number): string {
  if (!Number.isFinite(value)) return String(value);
  // An explicit `display_precision` is honoured exactly, as Home Assistant
  // does. Otherwise decimals are a ceiling, not a target: 8.6 is "8.6", never
  // "8.60".
  if (precision !== undefined) {
    return new Intl.NumberFormat("en-GB", {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(value);
  }
  const abs = Math.abs(value);
  const maxDigits = Number.isInteger(value) ? 0 : abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDigits,
  }).format(value);
}

export function formatEntityState(entity: HassEntity | undefined, hass?: HomeAssistant): string {
  if (!entity) return "Unavailable";
  const { state, attributes } = entity;
  const domain = entity.entity_id.split(".")[0];
  if (isUnavailable(state)) return state === "unavailable" ? "Unavailable" : "Unknown";

  if (domain === "binary_sensor") {
    const dc = attributes.device_class as string | undefined;
    const pair = dc ? BINARY_SENSOR_LABELS[dc] : undefined;
    if (pair) return state === "on" ? pair[0] : pair[1];
    return state === "on" ? "On" : "Off";
  }

  const numeric = Number(state);
  if (state !== "" && Number.isFinite(numeric)) {
    const precision = (attributes.display_precision as number | undefined) ?? undefined;
    const formatted = formatNumber(numeric, precision);
    const unit = attributes.unit_of_measurement;
    if (!unit) return formatted;
    const spaced = unit === "%" || unit === "°" ? "" : " ";
    return `${formatted}${spaced}${unit}`;
  }

  const domainLabels = STATE_LABELS[domain];
  if (domainLabels && domainLabels[state]) return domainLabels[state];
  if (STATE_LABELS._[state]) return STATE_LABELS._[state];
  void hass;
  return state
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

/** Secondary line used by the tile card. */
export function relativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const seconds = Math.round((now - then) / 1000);
  const abs = Math.abs(seconds);
  const fmt = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60) return fmt.format(-Math.round(seconds), "second");
  if (abs < 3600) return fmt.format(-Math.round(seconds / 60), "minute");
  if (abs < 86400) return fmt.format(-Math.round(seconds / 3600), "hour");
  return fmt.format(-Math.round(seconds / 86400), "day");
}

/** HA's "active" notion: drives the amber icon colour on tile/badge cards. */
export function isActive(entity: HassEntity | undefined): boolean {
  if (!entity) return false;
  const { state } = entity;
  if (isUnavailable(state)) return false;
  const domain = entity.entity_id.split(".")[0];
  if (["light", "switch", "fan", "binary_sensor", "input_boolean", "siren", "automation", "script", "group", "remote", "humidifier", "valve"].includes(domain))
    return state === "on";
  if (domain === "cover") return state === "open" || state === "opening";
  if (domain === "lock") return state === "unlocked" || state === "jammed";
  if (domain === "climate" || domain === "water_heater") return state !== "off";
  if (domain === "media_player") return state !== "off" && state !== "idle" && state !== "standby";
  if (domain === "vacuum") return state === "cleaning" || state === "returning";
  if (domain === "alarm_control_panel") return state !== "disarmed";
  if (domain === "person" || domain === "device_tracker") return state === "home";
  if (domain === "sun") return state === "above_horizon";
  if (domain === "update") return state === "on";
  if (domain === "timer") return state === "active";
  return state !== "off" && state !== "closed" && state !== "unavailable";
}

/** Per-domain accent colour, matching HA's `--state-<domain>-active-color`. */
export function stateColorVar(entity: HassEntity | undefined): string | undefined {
  if (!entity || !isActive(entity)) return undefined;
  const domain = entity.entity_id.split(".")[0];
  const dc = entity.attributes.device_class as string | undefined;
  if (domain === "binary_sensor" && dc) {
    if (["motion", "occupancy", "presence", "moving", "vibration", "sound"].includes(dc))
      return "var(--state-binary_sensor-active-color)";
    if (["gas", "smoke", "safety", "problem", "tamper", "carbon_monoxide"].includes(dc))
      return "var(--state-binary_sensor-alerting-color)";
  }
  if (domain === "climate") {
    const state = entity.state;
    if (state === "cool") return "var(--state-climate-cool-color)";
    if (state === "heat") return "var(--state-climate-heat-color)";
    if (state === "dry") return "var(--state-climate-dry-color)";
    if (state === "fan_only") return "var(--state-climate-fan_only-color)";
    return "var(--state-climate-auto-color)";
  }
  return `var(--state-${domain}-active-color, var(--state-active-color))`;
}
