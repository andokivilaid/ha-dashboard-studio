import { entityIdToName } from "./format";
import type { HassEntities, HassEntity, HomeAssistant } from "./types";

/**
 * Invents plausible state for entities a dashboard references but the demo
 * home does not have.
 *
 * Without this the gallery is close to useless: a harvested dashboard names
 * the author's own `light.tv_lysa` and `sensor.varmepump_effekt`, none of
 * which exist here, so every card would read "Unavailable". Synthesising a
 * sensible value from the entity id instead lets a stranger's dashboard render
 * the way its author sees it.
 *
 * Values are derived from a hash of the entity id, so a given dashboard looks
 * the same on every render — which is also what makes visual snapshots viable.
 */

const KNOWN_DOMAINS = new Set([
  "air_quality", "alarm_control_panel", "alert", "automation", "binary_sensor", "button",
  "calendar", "camera", "climate", "counter", "cover", "date", "datetime", "device_tracker",
  "event", "fan", "group", "humidifier", "image", "image_processing", "input_boolean",
  "input_button", "input_datetime", "input_number", "input_select", "input_text", "lawn_mower",
  "light", "lock", "media_player", "number", "person", "plant", "remote", "scene", "schedule",
  "script", "select", "sensor", "siren", "sun", "switch", "text", "time", "timer", "todo",
  "update", "vacuum", "valve", "water_heater", "weather", "zone",
]);

const ENTITY_RE = /^[a-z_]+\.[a-z0-9_]+$/;

export function isEntityId(value: unknown): value is string {
  if (typeof value !== "string" || !ENTITY_RE.test(value)) return false;
  return KNOWN_DOMAINS.has(value.slice(0, value.indexOf(".")));
}

/** Every entity id reachable anywhere in a config, however it is nested. */
export function collectEntityIds(value: unknown, found = new Set<string>()): Set<string> {
  if (typeof value === "string") {
    if (isEntityId(value)) found.add(value);
    return found;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectEntityIds(item, found);
    return found;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) collectEntityIds(item, found);
  }
  return found;
}

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

const pick = <T>(id: string, salt: string, options: T[]): T =>
  options[Math.floor(hash(id + salt) * options.length) % options.length];

const between = (id: string, salt: string, min: number, max: number, decimals = 1): number => {
  const raw = min + hash(id + salt) * (max - min);
  return Number(raw.toFixed(decimals));
};

interface SensorKind {
  match: RegExp;
  device_class: string;
  unit: string;
  range: [number, number];
  decimals?: number;
}

/** Guesses what a sensor measures from its name, in several languages. */
const SENSOR_KINDS: SensorKind[] = [
  { match: /temp|temperatur|varme|kylma|lampot/, device_class: "temperature", unit: "°C", range: [16, 24] },
  { match: /humid|fukt|luftfukt|niiskus/, device_class: "humidity", unit: "%", range: [35, 65], decimals: 0 },
  { match: /battery|batteri|akku/, device_class: "battery", unit: "%", range: [20, 100], decimals: 0 },
  { match: /power|effekt|watt|voimo/, device_class: "power", unit: "W", range: [5, 2400], decimals: 0 },
  { match: /energy|energi|kwh|consumption|forbruk/, device_class: "energy", unit: "kWh", range: [0.4, 28], decimals: 2 },
  { match: /voltage|spenning|volt/, device_class: "voltage", unit: "V", range: [220, 240], decimals: 1 },
  { match: /current|strom|ampere/, device_class: "current", unit: "A", range: [0.1, 12], decimals: 2 },
  { match: /co2|carbon_dioxide/, device_class: "carbon_dioxide", unit: "ppm", range: [420, 1200], decimals: 0 },
  { match: /pm25|pm2_5|pm10|particul/, device_class: "pm25", unit: "µg/m³", range: [2, 40], decimals: 0 },
  { match: /pressure|trykk|rohk/, device_class: "pressure", unit: "hPa", range: [985, 1030], decimals: 0 },
  { match: /illuminance|lux|lys|valgus/, device_class: "illuminance", unit: "lx", range: [0, 900], decimals: 0 },
  { match: /wind/, device_class: "wind_speed", unit: "km/h", range: [0, 38], decimals: 1 },
  { match: /rain|precip|nedbor|sade/, device_class: "precipitation", unit: "mm", range: [0, 9], decimals: 1 },
  { match: /water|vann|vesi/, device_class: "water", unit: "L", range: [10, 340], decimals: 0 },
  { match: /gas|gass/, device_class: "gas", unit: "m³", range: [1, 60], decimals: 2 },
  { match: /speed|hastighet|mbit|download|upload/, device_class: "data_rate", unit: "Mbit/s", range: [8, 940], decimals: 1 },
  { match: /disk|memory|cpu|ram|minne/, device_class: "", unit: "%", range: [8, 88], decimals: 1 },
  { match: /price|pris|cost|kostnad|eur|nok|sek/, device_class: "monetary", unit: "€", range: [0.04, 4.2], decimals: 2 },
  { match: /signal|rssi|wifi/, device_class: "signal_strength", unit: "dBm", range: [-85, -35], decimals: 0 },
  { match: /distance|range|avstand|km/, device_class: "distance", unit: "km", range: [1, 420], decimals: 0 },
];

const BINARY_KINDS: Array<{ match: RegExp; device_class: string }> = [
  { match: /motion|bevegelse|liikkeen|liikumine|pir/, device_class: "motion" },
  { match: /door|dor|ovi|uks|port/, device_class: "door" },
  { match: /window|vindu|ikkuna|aken/, device_class: "window" },
  { match: /garage/, device_class: "garage_door" },
  { match: /smoke|royk|savu|suits/, device_class: "smoke" },
  { match: /leak|moisture|water|lekkasje|vuoto/, device_class: "moisture" },
  { match: /occupan|presence|tilstede|home/, device_class: "occupancy" },
  { match: /problem|error|fault|feil/, device_class: "problem" },
  { match: /charg|lading/, device_class: "battery_charging" },
  { match: /connect|online|tilkoblet/, device_class: "connectivity" },
  { match: /lock|las/, device_class: "lock" },
  { match: /running|kjorer|active/, device_class: "running" },
];

const AREA_HINTS: Array<[RegExp, string]> = [
  [/living|stue|stua|olohuone|elutuba|lounge|salon/, "living_room"],
  [/kitchen|kjokken|keittio|koogi/, "kitchen"],
  [/bed(room)?|sove|makuu|magamis/, "bedroom"],
  [/bath|bad|kylpy|vannituba|shower|dusj/, "bathroom"],
  [/office|kontor|tyohuone|kabinet|study/, "office"],
  [/hall|entre|eteinen|esik|corridor|gang/, "hallway"],
  [/garage|garasje|autotalli/, "garage"],
  [/garden|hage|outside|ute|puutarha|aed|yard/, "garden"],
  [/kid|barn|lapsi|laste|nursery/, "kids_room"],
];

function guessArea(objectId: string): string | undefined {
  for (const [re, area] of AREA_HINTS) if (re.test(objectId)) return area;
  return undefined;
}

function entity(
  entityId: string,
  state: string,
  attributes: Record<string, unknown> = {},
): HassEntity {
  const changed = new Date(1773500000000 - Math.floor(hash(entityId) * 86_400_000)).toISOString();
  return {
    entity_id: entityId,
    state,
    last_changed: changed,
    last_updated: changed,
    attributes: { friendly_name: entityIdToName(entityId), ...attributes },
    context: { id: `syn_${entityId}`, user_id: null, parent_id: null },
  };
}

/** Builds one synthetic entity from its id alone. */
export function synthesizeEntity(entityId: string): HassEntity {
  const [domain, objectId = ""] = entityId.split(".");
  const on = hash(entityId) > 0.42;

  switch (domain) {
    case "light":
      return entity(entityId, on ? "on" : "off", {
        brightness: on ? Math.round(between(entityId, "b", 60, 255, 0)) : undefined,
        color_mode: "color_temp",
        color_temp_kelvin: Math.round(between(entityId, "k", 2200, 5500, 0)),
        min_color_temp_kelvin: 2000,
        max_color_temp_kelvin: 6500,
        supported_color_modes: ["color_temp", "hs"],
        supported_features: 44,
      });
    case "switch":
    case "input_boolean":
    case "siren":
    case "automation":
    case "group":
    case "remote":
      return entity(entityId, on ? "on" : "off");
    case "script":
      return entity(entityId, "off", { last_triggered: "2026-03-13T19:11:00+00:00" });
    case "scene":
      return entity(entityId, "2026-03-13T19:11:00+00:00");
    case "binary_sensor": {
      const kind = BINARY_KINDS.find((k) => k.match.test(objectId));
      return entity(entityId, on ? "on" : "off", kind ? { device_class: kind.device_class } : {});
    }
    case "sensor": {
      const kind = SENSOR_KINDS.find((k) => k.match.test(objectId));
      if (kind) {
        const value = between(entityId, "v", kind.range[0], kind.range[1], kind.decimals ?? 1);
        return entity(entityId, String(value), {
          unit_of_measurement: kind.unit,
          device_class: kind.device_class || undefined,
          state_class: "measurement",
        });
      }
      if (/status|state|mode|tilstand/.test(objectId)) {
        return entity(entityId, pick(entityId, "s", ["Idle", "Active", "Standby", "Ready"]));
      }
      return entity(entityId, String(between(entityId, "n", 1, 100, 0)));
    }
    case "climate":
      return entity(entityId, pick(entityId, "c", ["heat", "auto", "off", "cool"]), {
        current_temperature: between(entityId, "ct", 17, 24),
        temperature: between(entityId, "tt", 18, 23, 1),
        min_temp: 7,
        max_temp: 30,
        target_temp_step: 0.5,
        hvac_modes: ["off", "heat", "cool", "auto"],
        hvac_action: pick(entityId, "ha", ["heating", "idle", "cooling"]),
        supported_features: 401,
      });
    case "water_heater":
      return entity(entityId, "eco", {
        current_temperature: between(entityId, "wt", 40, 60, 0),
        temperature: 55,
        operation_list: ["eco", "performance", "off"],
        supported_features: 11,
      });
    case "humidifier":
      return entity(entityId, on ? "on" : "off", {
        humidity: between(entityId, "h", 35, 60, 0),
        current_humidity: between(entityId, "ch", 30, 58, 0),
        min_humidity: 20,
        max_humidity: 80,
        supported_features: 1,
      });
    case "cover": {
      const open = hash(entityId + "o") > 0.4;
      const dc = /garage/.test(objectId)
        ? "garage"
        : /curtain|gardin/.test(objectId)
          ? "curtain"
          : /blind|persienn/.test(objectId)
            ? "blind"
            : /door|port/.test(objectId)
              ? "door"
              : "shutter";
      return entity(entityId, open ? "open" : "closed", {
        current_position: open ? Math.round(between(entityId, "p", 30, 100, 0)) : 0,
        device_class: dc,
        supported_features: 15,
      });
    }
    case "valve":
      return entity(entityId, on ? "open" : "closed", { supported_features: 11, current_position: on ? 100 : 0 });
    case "fan":
      return entity(entityId, on ? "on" : "off", {
        percentage: on ? Math.round(between(entityId, "f", 25, 100, 0)) : 0,
        percentage_step: 25,
        supported_features: 57,
      });
    case "lock":
      return entity(entityId, on ? "locked" : "unlocked", { supported_features: 1 });
    case "media_player": {
      const playing = hash(entityId + "m") > 0.45;
      return entity(entityId, playing ? "playing" : "idle", {
        device_class: /tv|telly/.test(objectId) ? "tv" : "speaker",
        volume_level: between(entityId, "vol", 0.1, 0.6, 2),
        media_title: playing ? pick(entityId, "mt", ["Weightless", "Blue Monday", "Nightcall", "Teardrop"]) : undefined,
        media_artist: playing ? pick(entityId, "ma", ["Marconi Union", "New Order", "Kavinsky", "Massive Attack"]) : undefined,
        media_duration: playing ? 254 : undefined,
        media_position: playing ? 97 : undefined,
        media_position_updated_at: "2026-03-14T18:22:00+00:00",
        supported_features: 84047,
      });
    }
    case "vacuum":
      return entity(entityId, pick(entityId, "vc", ["docked", "cleaning", "returning", "idle"]), {
        battery_level: Math.round(between(entityId, "vb", 40, 100, 0)),
        fan_speed: "balanced",
        fan_speed_list: ["quiet", "balanced", "turbo"],
        supported_features: 12327,
      });
    case "lawn_mower":
      return entity(entityId, pick(entityId, "lm", ["docked", "mowing", "paused"]));
    case "person":
    case "device_tracker":
      return entity(entityId, hash(entityId + "p") > 0.4 ? "home" : "not_home", {
        source_type: "gps",
        latitude: 59.437,
        longitude: 24.7536,
      });
    case "alarm_control_panel":
      return entity(entityId, pick(entityId, "a", ["disarmed", "armed_home", "armed_away"]), {
        code_format: "number",
        code_arm_required: false,
        supported_features: 31,
      });
    case "camera":
      return entity(entityId, "idle", {
        entity_picture: "/demo/cameras/generic.svg",
        access_token: "demo",
        supported_features: 0,
      });
    case "weather":
      return entity(entityId, pick(entityId, "w", ["partlycloudy", "cloudy", "rainy", "sunny"]), {
        temperature: between(entityId, "wt", -4, 24),
        temperature_unit: "°C",
        humidity: Math.round(between(entityId, "wh", 45, 90, 0)),
        pressure: Math.round(between(entityId, "wp", 990, 1025, 0)),
        pressure_unit: "hPa",
        wind_speed: between(entityId, "ws", 1, 30),
        wind_speed_unit: "km/h",
        supported_features: 3,
        forecast: [0, 1, 2, 3, 4].map((d) => ({
          datetime: `2026-03-${15 + d}T00:00:00+00:00`,
          condition: pick(entityId, `fc${d}`, ["sunny", "cloudy", "rainy", "partlycloudy", "snowy"]),
          temperature: between(entityId, `ft${d}`, 2, 18, 0),
          templow: between(entityId, `fl${d}`, -5, 8, 0),
          precipitation: between(entityId, `fp${d}`, 0, 6, 1),
        })),
      });
    case "sun":
      return entity(entityId, "below_horizon", { elevation: -6.2, azimuth: 283.1 });
    case "input_number":
    case "number":
      return entity(entityId, String(between(entityId, "in", 1, 30, 1)), {
        min: 0,
        max: 100,
        step: 1,
        mode: "slider",
      });
    case "input_select":
    case "select":
      return entity(entityId, "Auto", { options: ["Auto", "Manual", "Off", "Boost"] });
    case "input_text":
    case "text":
      return entity(entityId, "—", { max: 100, mode: "text" });
    case "input_datetime":
    case "datetime":
      return entity(entityId, "2026-03-15 07:00:00", { has_date: true, has_time: true });
    case "date":
      return entity(entityId, "2026-03-15");
    case "time":
      return entity(entityId, "07:00:00");
    case "counter":
      return entity(entityId, String(Math.round(between(entityId, "cnt", 0, 12, 0))), { step: 1 });
    case "timer":
      return entity(entityId, on ? "active" : "idle", {
        duration: "01:00:00",
        remaining: "00:18:42",
      });
    case "todo":
      return entity(entityId, String(Math.round(between(entityId, "td", 0, 9, 0))), {
        supported_features: 15,
      });
    case "calendar":
      return entity(entityId, on ? "on" : "off", {
        message: "Dentist",
        start_time: "2026-03-15 09:30:00",
        end_time: "2026-03-15 10:15:00",
      });
    case "update":
      return entity(entityId, on ? "on" : "off", {
        installed_version: "2026.2.4",
        latest_version: "2026.3.1",
        supported_features: 23,
      });
    case "zone":
      return entity(entityId, "1", { latitude: 59.437, longitude: 24.7536, radius: 100 });
    case "button":
    case "input_button":
      return entity(entityId, "2026-03-14T08:00:00+00:00");
    case "plant":
      return entity(entityId, "ok", { moisture: 38, temperature: 21 });
    default:
      return entity(entityId, on ? "on" : "off");
  }
}

export interface SynthesisResult {
  states: HassEntities;
  /** Ids that were invented, for the UI to disclose. */
  synthesized: string[];
}

/** Adds a synthetic state for every entity the config names but `hass` lacks. */
export function synthesizeMissingEntities(
  hass: Pick<HomeAssistant, "states">,
  config: unknown,
): SynthesisResult {
  const referenced = collectEntityIds(config);
  const states: HassEntities = {};
  const synthesized: string[] = [];
  for (const id of referenced) {
    if (hass.states[id]) continue;
    states[id] = synthesizeEntity(id);
    synthesized.push(id);
  }
  return { states, synthesized: synthesized.sort() };
}

/** Registry entries for synthetic entities, so area cards keep working. */
export function synthesizeRegistryEntries(
  ids: string[],
): Record<string, { entity_id: string; area_id?: string; labels: string[]; platform: string }> {
  const out: Record<string, { entity_id: string; area_id?: string; labels: string[]; platform: string }> = {};
  for (const id of ids) {
    out[id] = {
      entity_id: id,
      area_id: guessArea(id.slice(id.indexOf(".") + 1)),
      labels: [],
      platform: "synthetic",
    };
  }
  return out;
}
