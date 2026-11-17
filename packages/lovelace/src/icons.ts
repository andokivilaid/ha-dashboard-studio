import type { HassEntity } from "./types";

/**
 * Mirrors `home-assistant/frontend`'s `domain_icon.ts` closely enough that a
 * rendered dashboard shows the same glyphs a real instance would. Names are
 * MDI identifiers (`mdi:lightbulb`); the React layer resolves them to paths.
 */
const DOMAIN_ICONS: Record<string, string> = {
  air_quality: "mdi:air-filter",
  alarm_control_panel: "mdi:shield",
  alert: "mdi:alert",
  automation: "mdi:robot",
  binary_sensor: "mdi:radiobox-blank",
  button: "mdi:gesture-tap-button",
  calendar: "mdi:calendar",
  camera: "mdi:video",
  climate: "mdi:thermostat",
  configurator: "mdi:cog",
  conversation: "mdi:microphone-message",
  counter: "mdi:counter",
  cover: "mdi:window-shutter",
  date: "mdi:calendar",
  datetime: "mdi:calendar-clock",
  device_tracker: "mdi:account",
  event: "mdi:eye-check",
  fan: "mdi:fan",
  google_assistant: "mdi:google-assistant",
  group: "mdi:google-circles-communities",
  humidifier: "mdi:air-humidifier",
  image: "mdi:image",
  image_processing: "mdi:image-filter-frames",
  input_boolean: "mdi:toggle-switch",
  input_button: "mdi:gesture-tap-button",
  input_datetime: "mdi:calendar-clock",
  input_number: "mdi:ray-vertex",
  input_select: "mdi:format-list-bulleted",
  input_text: "mdi:form-textbox",
  lawn_mower: "mdi:robot-mower",
  light: "mdi:lightbulb",
  lock: "mdi:lock",
  mailbox: "mdi:mailbox",
  media_player: "mdi:cast",
  notify: "mdi:comment-alert",
  number: "mdi:ray-vertex",
  persistent_notification: "mdi:bell",
  person: "mdi:account",
  plant: "mdi:flower",
  proximity: "mdi:apple-safari",
  remote: "mdi:remote",
  scene: "mdi:palette",
  script: "mdi:script-text",
  select: "mdi:format-list-bulleted",
  sensor: "mdi:eye",
  siren: "mdi:bullhorn",
  simple_alarm: "mdi:bell",
  stt: "mdi:microphone-message",
  sun: "mdi:white-balance-sunny",
  switch: "mdi:toggle-switch-variant",
  text: "mdi:form-textbox",
  time: "mdi:clock",
  timer: "mdi:timer-outline",
  todo: "mdi:clipboard-list",
  tts: "mdi:speaker-message",
  update: "mdi:package-up",
  vacuum: "mdi:robot-vacuum",
  valve: "mdi:pipe-valve",
  wake_word: "mdi:chat-sleep",
  water_heater: "mdi:water-boiler",
  weather: "mdi:weather-partly-cloudy",
  zone: "mdi:map-marker-radius",
};

const SENSOR_DEVICE_CLASS_ICONS: Record<string, string> = {
  apparent_power: "mdi:flash",
  aqi: "mdi:air-filter",
  atmospheric_pressure: "mdi:thermometer-lines",
  battery: "mdi:battery",
  carbon_dioxide: "mdi:molecule-co2",
  carbon_monoxide: "mdi:molecule-co",
  current: "mdi:current-ac",
  data_rate: "mdi:transmission-tower",
  data_size: "mdi:database",
  date: "mdi:calendar",
  distance: "mdi:arrow-left-right",
  duration: "mdi:progress-clock",
  energy: "mdi:lightning-bolt",
  energy_storage: "mdi:car-battery",
  frequency: "mdi:sine-wave",
  gas: "mdi:meter-gas",
  humidity: "mdi:water-percent",
  illuminance: "mdi:brightness-5",
  irradiance: "mdi:sun-wireless",
  moisture: "mdi:water-percent",
  monetary: "mdi:cash",
  nitrogen_dioxide: "mdi:molecule",
  ozone: "mdi:molecule",
  ph: "mdi:ph",
  pm1: "mdi:molecule",
  pm10: "mdi:molecule",
  pm25: "mdi:molecule",
  power: "mdi:flash",
  power_factor: "mdi:angle-acute",
  precipitation: "mdi:weather-rainy",
  precipitation_intensity: "mdi:weather-pouring",
  pressure: "mdi:gauge",
  reactive_power: "mdi:flash",
  signal_strength: "mdi:wifi",
  sound_pressure: "mdi:ear-hearing",
  speed: "mdi:speedometer",
  sulphur_dioxide: "mdi:molecule",
  temperature: "mdi:thermometer",
  timestamp: "mdi:clock",
  volatile_organic_compounds: "mdi:molecule",
  voltage: "mdi:sine-wave",
  volume: "mdi:car-coolant-level",
  water: "mdi:water",
  weight: "mdi:weight",
  wind_speed: "mdi:weather-windy",
};

const BINARY_SENSOR_ICONS: Record<string, [on: string, off: string]> = {
  battery: ["mdi:battery-outline", "mdi:battery"],
  battery_charging: ["mdi:battery-charging", "mdi:battery"],
  carbon_monoxide: ["mdi:smoke-detector-alert", "mdi:smoke-detector"],
  cold: ["mdi:snowflake", "mdi:thermometer"],
  connectivity: ["mdi:check-network-outline", "mdi:close-network-outline"],
  door: ["mdi:door-open", "mdi:door-closed"],
  garage_door: ["mdi:garage-open", "mdi:garage"],
  gas: ["mdi:alert-circle", "mdi:check-circle"],
  heat: ["mdi:fire", "mdi:thermometer"],
  light: ["mdi:brightness-7", "mdi:brightness-5"],
  lock: ["mdi:lock-open", "mdi:lock"],
  moisture: ["mdi:water", "mdi:water-off"],
  motion: ["mdi:motion-sensor", "mdi:motion-sensor-off"],
  occupancy: ["mdi:home", "mdi:home-outline"],
  opening: ["mdi:square-outline", "mdi:square"],
  plug: ["mdi:power-plug", "mdi:power-plug-off"],
  power: ["mdi:power-plug", "mdi:power-plug-off"],
  presence: ["mdi:home", "mdi:home-outline"],
  problem: ["mdi:alert-circle", "mdi:check-circle"],
  running: ["mdi:play", "mdi:stop"],
  safety: ["mdi:alert-circle", "mdi:check-circle"],
  smoke: ["mdi:smoke-detector-variant-alert", "mdi:smoke-detector-variant"],
  sound: ["mdi:music-note", "mdi:music-note-off"],
  tamper: ["mdi:alert-circle", "mdi:check-circle"],
  update: ["mdi:package-up", "mdi:package"],
  vibration: ["mdi:vibrate", "mdi:crop-portrait"],
  window: ["mdi:window-open", "mdi:window-closed"],
};

const COVER_ICONS: Record<string, [open: string, closed: string]> = {
  awning: ["mdi:awning-outline", "mdi:awning-outline"],
  blind: ["mdi:blinds-open", "mdi:blinds"],
  curtain: ["mdi:curtains", "mdi:curtains-closed"],
  damper: ["mdi:circle", "mdi:circle-slice-8"],
  door: ["mdi:door-open", "mdi:door-closed"],
  garage: ["mdi:garage-open", "mdi:garage"],
  gate: ["mdi:gate-open", "mdi:gate"],
  shade: ["mdi:roller-shade", "mdi:roller-shade-closed"],
  shutter: ["mdi:window-shutter-open", "mdi:window-shutter"],
  window: ["mdi:window-open", "mdi:window-closed"],
};

const WEATHER_ICONS: Record<string, string> = {
  "clear-night": "mdi:weather-night",
  cloudy: "mdi:weather-cloudy",
  exceptional: "mdi:alert-circle-outline",
  fog: "mdi:weather-fog",
  hail: "mdi:weather-hail",
  lightning: "mdi:weather-lightning",
  "lightning-rainy": "mdi:weather-lightning-rainy",
  partlycloudy: "mdi:weather-partly-cloudy",
  pouring: "mdi:weather-pouring",
  rainy: "mdi:weather-rainy",
  snowy: "mdi:weather-snowy",
  "snowy-rainy": "mdi:weather-snowy-rainy",
  sunny: "mdi:weather-sunny",
  windy: "mdi:weather-windy",
  "windy-variant": "mdi:weather-windy-variant",
};

function batteryIcon(level: number, charging: boolean): string {
  const rounded = Math.round(level / 10) * 10;
  if (charging && level >= 100) return "mdi:battery-charging";
  if (charging) return `mdi:battery-charging-${rounded === 0 ? 10 : rounded}`;
  if (level <= 5) return "mdi:battery-alert-variant-outline";
  if (rounded >= 100) return "mdi:battery";
  return `mdi:battery-${rounded}`;
}

export function stateIcon(entity: HassEntity | undefined, entityId?: string): string {
  const id = entity?.entity_id ?? entityId ?? "sensor.unknown";
  const domain = id.split(".")[0];
  if (entity?.attributes.icon) return entity.attributes.icon;
  const state = entity?.state ?? "unknown";
  const dc = entity?.attributes.device_class as string | undefined;

  switch (domain) {
    case "light":
      return state === "on" ? "mdi:lightbulb" : "mdi:lightbulb-outline";
    case "switch":
      if (dc === "outlet") return state === "on" ? "mdi:power-plug" : "mdi:power-plug-off";
      return state === "on" ? "mdi:toggle-switch-variant" : "mdi:toggle-switch-variant-off";
    case "input_boolean":
      return state === "on" ? "mdi:check-circle-outline" : "mdi:close-circle-outline";
    case "lock":
      return state === "unlocked" ? "mdi:lock-open" : state === "jammed" ? "mdi:lock-alert" : "mdi:lock";
    case "binary_sensor": {
      const pair = dc ? BINARY_SENSOR_ICONS[dc] : undefined;
      if (pair) return state === "on" ? pair[0] : pair[1];
      return state === "on" ? "mdi:checkbox-marked-circle" : "mdi:radiobox-blank";
    }
    case "cover": {
      const pair = dc ? COVER_ICONS[dc] : COVER_ICONS.shutter;
      if (pair) return state === "closed" ? pair[1] : pair[0];
      return "mdi:window-shutter";
    }
    case "sensor": {
      if (dc === "battery") {
        const level = Number(state);
        if (Number.isFinite(level)) return batteryIcon(level, false);
        return "mdi:battery-unknown";
      }
      if (dc && SENSOR_DEVICE_CLASS_ICONS[dc]) return SENSOR_DEVICE_CLASS_ICONS[dc];
      if (entity?.attributes.unit_of_measurement === "°C" || entity?.attributes.unit_of_measurement === "°F")
        return "mdi:thermometer";
      return "mdi:eye";
    }
    case "weather":
      return WEATHER_ICONS[state] ?? "mdi:weather-partly-cloudy";
    case "person":
      return state === "not_home" ? "mdi:account-arrow-right" : "mdi:account";
    case "device_tracker":
      return state === "not_home" ? "mdi:account-arrow-right" : "mdi:account";
    case "media_player":
      if (state === "playing") return "mdi:play-circle";
      if (state === "paused") return "mdi:pause-circle";
      if (dc === "tv") return "mdi:television";
      if (dc === "speaker") return "mdi:speaker";
      return "mdi:cast";
    case "climate": {
      if (state === "cool") return "mdi:snowflake";
      if (state === "heat") return "mdi:fire";
      if (state === "dry") return "mdi:water-percent";
      if (state === "fan_only") return "mdi:fan";
      if (state === "off") return "mdi:thermostat";
      return "mdi:thermostat-auto";
    }
    case "alarm_control_panel":
      if (state === "disarmed") return "mdi:shield-off";
      if (state === "triggered") return "mdi:bell-ring";
      if (state === "arming" || state === "pending") return "mdi:shield-sync";
      return "mdi:shield-lock";
    case "vacuum":
      return state === "cleaning" ? "mdi:robot-vacuum" : "mdi:robot-vacuum-variant";
    case "fan":
      return state === "on" ? "mdi:fan" : "mdi:fan-off";
    case "update":
      return state === "on" ? "mdi:package-up" : "mdi:package";
    case "sun":
      return state === "above_horizon" ? "mdi:white-balance-sunny" : "mdi:weather-night";
    default:
      return DOMAIN_ICONS[domain] ?? "mdi:bookmark";
  }
}

export function domainIcon(domain: string): string {
  return DOMAIN_ICONS[domain] ?? "mdi:bookmark";
}

export function weatherIcon(condition: string): string {
  return WEATHER_ICONS[condition] ?? "mdi:weather-partly-cloudy";
}
