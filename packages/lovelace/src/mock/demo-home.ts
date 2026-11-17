import type {
  AreaRegistryEntry,
  DeviceRegistryEntry,
  EntityRegistryDisplayEntry,
  FloorRegistryEntry,
  HassEntities,
  HassEntity,
} from "../types";

/**
 * A deterministic demo home used for gallery previews and the builder's mock
 * mode. Deterministic matters: Playwright screenshots must be stable, so every
 * value here is fixed or derived from a seeded PRNG rather than `Math.random`.
 */

export const DEMO_NOW = new Date("2026-03-14T18:24:00.000Z");

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ago = (minutes: number) => new Date(DEMO_NOW.getTime() - minutes * 60_000).toISOString();

interface EntitySeed {
  id: string;
  state: string;
  attrs?: Record<string, unknown>;
  area?: string;
  changedMinutesAgo?: number;
  category?: "config" | "diagnostic";
  hidden?: boolean;
}

export const FLOORS: FloorRegistryEntry[] = [
  { floor_id: "ground_floor", name: "Ground floor", level: 0, icon: "mdi:home", aliases: [] },
  { floor_id: "first_floor", name: "First floor", level: 1, icon: "mdi:home-floor-1", aliases: [] },
  { floor_id: "outside", name: "Outside", level: -1, icon: "mdi:tree", aliases: [] },
];

export const AREAS: AreaRegistryEntry[] = [
  { area_id: "living_room", name: "Living room", floor_id: "ground_floor", icon: "mdi:sofa", picture: null, aliases: [], labels: [] },
  { area_id: "kitchen", name: "Kitchen", floor_id: "ground_floor", icon: "mdi:countertop", picture: null, aliases: [], labels: [] },
  { area_id: "hallway", name: "Hallway", floor_id: "ground_floor", icon: "mdi:coat-rack", picture: null, aliases: [], labels: [] },
  { area_id: "office", name: "Office", floor_id: "first_floor", icon: "mdi:desk", picture: null, aliases: [], labels: [] },
  { area_id: "bedroom", name: "Bedroom", floor_id: "first_floor", icon: "mdi:bed", picture: null, aliases: [], labels: [] },
  { area_id: "bathroom", name: "Bathroom", floor_id: "first_floor", icon: "mdi:shower", picture: null, aliases: [], labels: [] },
  { area_id: "kids_room", name: "Kids room", floor_id: "first_floor", icon: "mdi:teddy-bear", picture: null, aliases: [], labels: [] },
  { area_id: "garage", name: "Garage", floor_id: "ground_floor", icon: "mdi:garage", picture: null, aliases: [], labels: [] },
  { area_id: "garden", name: "Garden", floor_id: "outside", icon: "mdi:flower", picture: null, aliases: [], labels: [] },
];

const SEEDS: EntitySeed[] = [
  // ---- Lights -----------------------------------------------------------
  { id: "light.living_room_ceiling", state: "on", area: "living_room", changedMinutesAgo: 42,
    attrs: { friendly_name: "Living room ceiling", brightness: 196, color_mode: "color_temp", color_temp_kelvin: 2700, min_color_temp_kelvin: 2000, max_color_temp_kelvin: 6535, supported_color_modes: ["color_temp", "hs"], supported_features: 44, rgb_color: [255, 180, 107] } },
  { id: "light.living_room_lamp", state: "on", area: "living_room", changedMinutesAgo: 18,
    attrs: { friendly_name: "Reading lamp", brightness: 120, color_mode: "hs", hs_color: [28, 68], rgb_color: [255, 165, 82], supported_color_modes: ["hs", "color_temp"], supported_features: 44 } },
  { id: "light.tv_backlight", state: "on", area: "living_room", changedMinutesAgo: 42,
    attrs: { friendly_name: "TV backlight", brightness: 88, color_mode: "hs", hs_color: [265, 80], rgb_color: [160, 51, 255], supported_color_modes: ["hs"], supported_features: 44, effect: "Ambilight", effect_list: ["Ambilight", "Rainbow", "Candle"] } },
  { id: "light.kitchen_spots", state: "on", area: "kitchen", changedMinutesAgo: 6,
    attrs: { friendly_name: "Kitchen spots", brightness: 255, color_mode: "color_temp", color_temp_kelvin: 4000, supported_color_modes: ["color_temp"], supported_features: 40 } },
  { id: "light.kitchen_under_cabinet", state: "off", area: "kitchen", changedMinutesAgo: 320,
    attrs: { friendly_name: "Under cabinet", supported_color_modes: ["brightness"], supported_features: 40 } },
  { id: "light.hallway", state: "off", area: "hallway", changedMinutesAgo: 95, attrs: { friendly_name: "Hallway", supported_color_modes: ["onoff"] } },
  { id: "light.office_desk", state: "on", area: "office", changedMinutesAgo: 210,
    attrs: { friendly_name: "Desk light", brightness: 230, color_mode: "color_temp", color_temp_kelvin: 5000, supported_color_modes: ["color_temp"], supported_features: 40 } },
  { id: "light.bedroom", state: "off", area: "bedroom", changedMinutesAgo: 540, attrs: { friendly_name: "Bedroom", brightness: 0, supported_color_modes: ["color_temp", "hs"], supported_features: 44 } },
  { id: "light.bedside_left", state: "off", area: "bedroom", changedMinutesAgo: 530, attrs: { friendly_name: "Bedside left", supported_color_modes: ["brightness"] } },
  { id: "light.bedside_right", state: "on", area: "bedroom", changedMinutesAgo: 12, attrs: { friendly_name: "Bedside right", brightness: 64, supported_color_modes: ["brightness"], supported_features: 40 } },
  { id: "light.kids_room", state: "on", area: "kids_room", changedMinutesAgo: 35, attrs: { friendly_name: "Kids room", brightness: 140, color_mode: "hs", hs_color: [200, 60], rgb_color: [102, 194, 255], supported_color_modes: ["hs"], supported_features: 44 } },
  { id: "light.bathroom_mirror", state: "off", area: "bathroom", changedMinutesAgo: 70, attrs: { friendly_name: "Mirror light", supported_color_modes: ["brightness"] } },
  { id: "light.garden_path", state: "on", area: "garden", changedMinutesAgo: 60, attrs: { friendly_name: "Garden path", brightness: 180, supported_color_modes: ["brightness"], supported_features: 40 } },
  { id: "light.garage", state: "off", area: "garage", changedMinutesAgo: 420, attrs: { friendly_name: "Garage", supported_color_modes: ["onoff"] } },

  // ---- Switches / plugs --------------------------------------------------
  { id: "switch.coffee_machine", state: "off", area: "kitchen", changedMinutesAgo: 480, attrs: { friendly_name: "Coffee machine", device_class: "outlet" } },
  { id: "switch.dishwasher_plug", state: "on", area: "kitchen", changedMinutesAgo: 55, attrs: { friendly_name: "Dishwasher", device_class: "outlet" } },
  { id: "switch.tv_power", state: "on", area: "living_room", changedMinutesAgo: 42, attrs: { friendly_name: "TV power", device_class: "outlet" } },
  { id: "switch.3d_printer", state: "off", area: "office", changedMinutesAgo: 1500, attrs: { friendly_name: "3D printer", device_class: "outlet" } },
  { id: "switch.irrigation", state: "off", area: "garden", changedMinutesAgo: 700, attrs: { friendly_name: "Irrigation" } },
  { id: "input_boolean.guest_mode", state: "off", changedMinutesAgo: 2200, attrs: { friendly_name: "Guest mode", icon: "mdi:account-group" } },
  { id: "input_boolean.vacation_mode", state: "off", changedMinutesAgo: 10000, attrs: { friendly_name: "Vacation mode", icon: "mdi:bag-suitcase" } },

  // ---- Climate -----------------------------------------------------------
  { id: "climate.living_room", state: "heat", area: "living_room", changedMinutesAgo: 150,
    attrs: { friendly_name: "Living room", current_temperature: 21.4, temperature: 21.5, min_temp: 7, max_temp: 30, target_temp_step: 0.5, hvac_modes: ["off", "heat", "auto"], hvac_action: "heating", preset_mode: "comfort", preset_modes: ["eco", "comfort", "boost"], supported_features: 401 } },
  { id: "climate.bedroom", state: "auto", area: "bedroom", changedMinutesAgo: 400,
    attrs: { friendly_name: "Bedroom", current_temperature: 19.2, temperature: 19.0, min_temp: 7, max_temp: 30, target_temp_step: 0.5, hvac_modes: ["off", "heat", "auto"], hvac_action: "idle", preset_mode: "eco", preset_modes: ["eco", "comfort"], supported_features: 401 } },
  { id: "climate.office", state: "off", area: "office", changedMinutesAgo: 900,
    attrs: { friendly_name: "Office", current_temperature: 20.1, temperature: 18, min_temp: 7, max_temp: 30, hvac_modes: ["off", "heat"], hvac_action: "off", supported_features: 385 } },
  { id: "water_heater.boiler", state: "eco", changedMinutesAgo: 300, attrs: { friendly_name: "Boiler", current_temperature: 52, temperature: 55, min_temp: 35, max_temp: 65, operation_list: ["eco", "performance", "off"], operation_mode: "eco", supported_features: 11 } },
  { id: "humidifier.bedroom", state: "on", area: "bedroom", changedMinutesAgo: 120, attrs: { friendly_name: "Bedroom humidifier", humidity: 45, current_humidity: 41, min_humidity: 30, max_humidity: 70, mode: "auto", available_modes: ["auto", "sleep", "boost"], supported_features: 1, device_class: "humidifier" } },

  // ---- Covers ------------------------------------------------------------
  { id: "cover.living_room_blinds", state: "open", area: "living_room", changedMinutesAgo: 200, attrs: { friendly_name: "Living room blinds", current_position: 100, device_class: "blind", supported_features: 15 } },
  { id: "cover.kitchen_blind", state: "closed", area: "kitchen", changedMinutesAgo: 30, attrs: { friendly_name: "Kitchen blind", current_position: 0, device_class: "blind", supported_features: 15 } },
  { id: "cover.bedroom_curtains", state: "closed", area: "bedroom", changedMinutesAgo: 90, attrs: { friendly_name: "Bedroom curtains", current_position: 0, device_class: "curtain", supported_features: 15 } },
  { id: "cover.garage_door", state: "closed", area: "garage", changedMinutesAgo: 260, attrs: { friendly_name: "Garage door", device_class: "garage", supported_features: 11 } },
  { id: "cover.office_shade", state: "open", area: "office", changedMinutesAgo: 400, attrs: { friendly_name: "Office shade", current_position: 65, device_class: "shade", supported_features: 15 } },

  // ---- Media -------------------------------------------------------------
  { id: "media_player.living_room_tv", state: "playing", area: "living_room", changedMinutesAgo: 40,
    attrs: { friendly_name: "Living room TV", device_class: "tv", volume_level: 0.32, is_volume_muted: false, media_title: "The Blue Planet II", media_series_title: "Episode 3 — Coral Reefs", media_content_type: "tvshow", media_duration: 3180, media_position: 1245, media_position_updated_at: ago(5), app_name: "Netflix", supported_features: 152461, entity_picture: "/demo/media/blue-planet.svg" } },
  { id: "media_player.kitchen_speaker", state: "playing", area: "kitchen", changedMinutesAgo: 12,
    attrs: { friendly_name: "Kitchen speaker", device_class: "speaker", volume_level: 0.18, media_title: "Weightless", media_artist: "Marconi Union", media_content_type: "music", media_duration: 488, media_position: 132, media_position_updated_at: ago(2), app_name: "Spotify", supported_features: 84047 } },
  { id: "media_player.office_speaker", state: "idle", area: "office", changedMinutesAgo: 300, attrs: { friendly_name: "Office speaker", device_class: "speaker", volume_level: 0.4, supported_features: 84047 } },

  // ---- Sensors -----------------------------------------------------------
  { id: "sensor.living_room_temperature", state: "21.4", area: "living_room", attrs: { friendly_name: "Living room temperature", unit_of_measurement: "°C", device_class: "temperature", state_class: "measurement" } },
  { id: "sensor.living_room_humidity", state: "44", area: "living_room", attrs: { friendly_name: "Living room humidity", unit_of_measurement: "%", device_class: "humidity", state_class: "measurement" } },
  { id: "sensor.kitchen_temperature", state: "22.8", area: "kitchen", attrs: { friendly_name: "Kitchen temperature", unit_of_measurement: "°C", device_class: "temperature", state_class: "measurement" } },
  { id: "sensor.bedroom_temperature", state: "19.2", area: "bedroom", attrs: { friendly_name: "Bedroom temperature", unit_of_measurement: "°C", device_class: "temperature", state_class: "measurement" } },
  { id: "sensor.bedroom_humidity", state: "41", area: "bedroom", attrs: { friendly_name: "Bedroom humidity", unit_of_measurement: "%", device_class: "humidity", state_class: "measurement" } },
  { id: "sensor.office_temperature", state: "20.1", area: "office", attrs: { friendly_name: "Office temperature", unit_of_measurement: "°C", device_class: "temperature", state_class: "measurement" } },
  { id: "sensor.bathroom_humidity", state: "63", area: "bathroom", attrs: { friendly_name: "Bathroom humidity", unit_of_measurement: "%", device_class: "humidity", state_class: "measurement" } },
  { id: "sensor.outdoor_temperature", state: "8.6", area: "garden", attrs: { friendly_name: "Outdoor temperature", unit_of_measurement: "°C", device_class: "temperature", state_class: "measurement" } },
  { id: "sensor.co2_living_room", state: "742", area: "living_room", attrs: { friendly_name: "CO₂", unit_of_measurement: "ppm", device_class: "carbon_dioxide", state_class: "measurement" } },
  { id: "sensor.power_consumption", state: "612", attrs: { friendly_name: "House power", unit_of_measurement: "W", device_class: "power", state_class: "measurement" } },
  { id: "sensor.solar_power", state: "0", attrs: { friendly_name: "Solar power", unit_of_measurement: "W", device_class: "power", state_class: "measurement" } },
  { id: "sensor.energy_today", state: "11.42", attrs: { friendly_name: "Energy today", unit_of_measurement: "kWh", device_class: "energy", state_class: "total_increasing" } },
  { id: "sensor.solar_energy_today", state: "6.18", attrs: { friendly_name: "Solar today", unit_of_measurement: "kWh", device_class: "energy", state_class: "total_increasing" } },
  { id: "sensor.grid_return_today", state: "2.07", attrs: { friendly_name: "Returned to grid", unit_of_measurement: "kWh", device_class: "energy", state_class: "total_increasing" } },
  { id: "sensor.energy_cost_today", state: "2.94", attrs: { friendly_name: "Energy cost today", unit_of_measurement: "€", device_class: "monetary", state_class: "total" } },
  { id: "sensor.water_today", state: "128", attrs: { friendly_name: "Water today", unit_of_measurement: "L", device_class: "water", state_class: "total_increasing" } },
  { id: "sensor.internet_download", state: "248.4", attrs: { friendly_name: "Download", unit_of_measurement: "Mbit/s", device_class: "data_rate", state_class: "measurement" } },
  { id: "sensor.washing_machine_status", state: "Drying", attrs: { friendly_name: "Washing machine", icon: "mdi:washing-machine" } },
  { id: "sensor.next_bin_collection", state: "Paper — tomorrow", attrs: { friendly_name: "Bin collection", icon: "mdi:trash-can" } },
  { id: "sensor.phone_battery", state: "68", attrs: { friendly_name: "Phone battery", unit_of_measurement: "%", device_class: "battery", state_class: "measurement" } },
  { id: "sensor.car_battery", state: "74", area: "garage", attrs: { friendly_name: "Car battery", unit_of_measurement: "%", device_class: "battery", state_class: "measurement" } },
  { id: "sensor.car_range", state: "312", area: "garage", attrs: { friendly_name: "Car range", unit_of_measurement: "km", device_class: "distance", state_class: "measurement" } },
  { id: "sensor.uptime", state: "2026-03-01T09:12:00+00:00", category: "diagnostic", attrs: { friendly_name: "Uptime", device_class: "timestamp" } },
  { id: "sensor.cpu_temperature", state: "48.2", category: "diagnostic", attrs: { friendly_name: "CPU temperature", unit_of_measurement: "°C", device_class: "temperature", state_class: "measurement" } },
  { id: "sensor.memory_use_percent", state: "37.5", category: "diagnostic", attrs: { friendly_name: "Memory use", unit_of_measurement: "%", state_class: "measurement" } },
  { id: "sensor.disk_free", state: "182", category: "diagnostic", attrs: { friendly_name: "Disk free", unit_of_measurement: "GB", device_class: "data_size", state_class: "measurement" } },

  // ---- Binary sensors ----------------------------------------------------
  { id: "binary_sensor.front_door", state: "off", area: "hallway", changedMinutesAgo: 95, attrs: { friendly_name: "Front door", device_class: "door" } },
  { id: "binary_sensor.back_door", state: "off", area: "kitchen", changedMinutesAgo: 240, attrs: { friendly_name: "Back door", device_class: "door" } },
  { id: "binary_sensor.living_room_window", state: "off", area: "living_room", changedMinutesAgo: 600, attrs: { friendly_name: "Living room window", device_class: "window" } },
  { id: "binary_sensor.bedroom_window", state: "on", area: "bedroom", changedMinutesAgo: 25, attrs: { friendly_name: "Bedroom window", device_class: "window" } },
  { id: "binary_sensor.hallway_motion", state: "off", area: "hallway", changedMinutesAgo: 8, attrs: { friendly_name: "Hallway motion", device_class: "motion" } },
  { id: "binary_sensor.living_room_motion", state: "on", area: "living_room", changedMinutesAgo: 1, attrs: { friendly_name: "Living room motion", device_class: "motion" } },
  { id: "binary_sensor.garage_motion", state: "off", area: "garage", changedMinutesAgo: 180, attrs: { friendly_name: "Garage motion", device_class: "motion" } },
  { id: "binary_sensor.smoke_kitchen", state: "off", area: "kitchen", changedMinutesAgo: 4000, attrs: { friendly_name: "Kitchen smoke", device_class: "smoke" } },
  { id: "binary_sensor.water_leak_bathroom", state: "off", area: "bathroom", changedMinutesAgo: 5000, attrs: { friendly_name: "Bathroom leak", device_class: "moisture" } },
  { id: "binary_sensor.washing_machine_running", state: "on", changedMinutesAgo: 55, attrs: { friendly_name: "Washing machine running", device_class: "running" } },

  // ---- People, presence, security ---------------------------------------
  { id: "person.ando", state: "home", changedMinutesAgo: 130, attrs: { friendly_name: "Ando", entity_picture: "/demo/people/a.svg", source: "device_tracker.ando_phone", id: "ando" } },
  { id: "person.mari", state: "not_home", changedMinutesAgo: 75, attrs: { friendly_name: "Mari", entity_picture: "/demo/people/m.svg", source: "device_tracker.mari_phone", id: "mari" } },
  { id: "person.kids", state: "home", changedMinutesAgo: 190, attrs: { friendly_name: "Laura", entity_picture: "/demo/people/l.svg", id: "laura" } },
  { id: "device_tracker.ando_phone", state: "home", attrs: { friendly_name: "Ando's phone", source_type: "gps", latitude: 59.437, longitude: 24.7536, gps_accuracy: 12, battery_level: 68 } },
  { id: "device_tracker.mari_phone", state: "not_home", attrs: { friendly_name: "Mari's phone", source_type: "gps", latitude: 59.4267, longitude: 24.7789, gps_accuracy: 25, battery_level: 52 } },
  { id: "lock.front_door", state: "locked", area: "hallway", changedMinutesAgo: 95, attrs: { friendly_name: "Front door lock", supported_features: 1 } },
  { id: "lock.back_door", state: "locked", area: "kitchen", changedMinutesAgo: 600, attrs: { friendly_name: "Back door lock" } },
  { id: "alarm_control_panel.home", state: "disarmed", changedMinutesAgo: 130, attrs: { friendly_name: "Alarm", code_format: "number", changed_by: "Ando", code_arm_required: false, supported_features: 31 } },
  { id: "camera.front_door", state: "idle", area: "hallway", attrs: { friendly_name: "Front door camera", entity_picture: "/demo/cameras/front-door.svg", access_token: "demo", supported_features: 0 } },
  { id: "camera.garden", state: "idle", area: "garden", attrs: { friendly_name: "Garden camera", entity_picture: "/demo/cameras/garden.svg", access_token: "demo", supported_features: 0 } },

  // ---- Fans, vacuum, misc ------------------------------------------------
  { id: "fan.bedroom", state: "off", area: "bedroom", changedMinutesAgo: 700, attrs: { friendly_name: "Bedroom fan", percentage: 0, percentage_step: 25, preset_modes: ["auto", "sleep"], supported_features: 57 } },
  { id: "fan.living_room_air_purifier", state: "on", area: "living_room", changedMinutesAgo: 150, attrs: { friendly_name: "Air purifier", percentage: 50, percentage_step: 25, preset_mode: "auto", preset_modes: ["auto", "sleep", "turbo"], supported_features: 57 } },
  { id: "vacuum.robot", state: "docked", area: "hallway", changedMinutesAgo: 320, attrs: { friendly_name: "Robot vacuum", battery_level: 100, fan_speed: "balanced", fan_speed_list: ["quiet", "balanced", "turbo"], supported_features: 12327 } },
  { id: "weather.home", state: "partlycloudy", attrs: { friendly_name: "Home", temperature: 8.6, temperature_unit: "°C", humidity: 72, pressure: 1014, pressure_unit: "hPa", wind_speed: 14.4, wind_speed_unit: "km/h", wind_bearing: 220, visibility: 24, visibility_unit: "km", supported_features: 3,
    forecast: [
      { datetime: "2026-03-15T00:00:00+00:00", condition: "rainy", temperature: 9, templow: 4, precipitation: 3.2, precipitation_probability: 80 },
      { datetime: "2026-03-16T00:00:00+00:00", condition: "cloudy", temperature: 11, templow: 5, precipitation: 0.4, precipitation_probability: 30 },
      { datetime: "2026-03-17T00:00:00+00:00", condition: "sunny", temperature: 13, templow: 3, precipitation: 0, precipitation_probability: 5 },
      { datetime: "2026-03-18T00:00:00+00:00", condition: "partlycloudy", temperature: 12, templow: 6, precipitation: 0.1, precipitation_probability: 15 },
      { datetime: "2026-03-19T00:00:00+00:00", condition: "windy", temperature: 10, templow: 5, precipitation: 0, precipitation_probability: 10 },
    ] } },
  { id: "sun.sun", state: "below_horizon", category: "diagnostic", attrs: { friendly_name: "Sun", next_dawn: "2026-03-15T04:42:00+00:00", next_dusk: "2026-03-15T17:12:00+00:00", next_rising: "2026-03-15T05:21:00+00:00", next_setting: "2026-03-15T16:33:00+00:00", elevation: -6.2, azimuth: 283.1 } },
  { id: "zone.home", state: "2", attrs: { friendly_name: "Home", latitude: 59.437, longitude: 24.7536, radius: 100, icon: "mdi:home", passive: false } },

  // ---- Scenes, scripts, automations --------------------------------------
  { id: "scene.movie_night", state: "2026-03-13T20:10:00+00:00", attrs: { friendly_name: "Movie night", icon: "mdi:movie-open", entity_id: ["light.living_room_ceiling", "light.tv_backlight"] } },
  { id: "scene.good_morning", state: "2026-03-14T06:30:00+00:00", attrs: { friendly_name: "Good morning", icon: "mdi:weather-sunset-up" } },
  { id: "scene.dinner", state: "2026-03-12T18:00:00+00:00", attrs: { friendly_name: "Dinner", icon: "mdi:silverware-fork-knife" } },
  { id: "scene.all_off", state: "2026-03-13T23:45:00+00:00", attrs: { friendly_name: "All off", icon: "mdi:power" } },
  { id: "script.bedtime", state: "off", attrs: { friendly_name: "Bedtime routine", icon: "mdi:sleep", last_triggered: "2026-03-13T22:40:00+00:00" } },
  { id: "script.leaving_home", state: "off", attrs: { friendly_name: "Leaving home", icon: "mdi:door-open", last_triggered: "2026-03-14T08:05:00+00:00" } },
  { id: "automation.motion_hallway_light", state: "on", attrs: { friendly_name: "Hallway motion light", last_triggered: "2026-03-14T18:16:00+00:00", id: "1" } },
  { id: "automation.sunset_lights", state: "on", attrs: { friendly_name: "Sunset lights", last_triggered: "2026-03-14T16:33:00+00:00", id: "2" } },
  { id: "automation.away_mode", state: "off", attrs: { friendly_name: "Away mode", last_triggered: "2026-03-10T09:00:00+00:00", id: "3" } },

  // ---- Helpers and inputs ------------------------------------------------
  { id: "input_number.target_temperature", state: "21.5", attrs: { friendly_name: "Comfort temperature", min: 15, max: 25, step: 0.5, mode: "slider", unit_of_measurement: "°C" } },
  { id: "input_select.house_mode", state: "Home", attrs: { friendly_name: "House mode", options: ["Home", "Away", "Night", "Guest"], icon: "mdi:home-heart" } },
  { id: "input_text.door_note", state: "Parcel behind the pot", attrs: { friendly_name: "Door note", max: 100, mode: "text" } },
  { id: "input_datetime.alarm", state: "2026-03-15 06:45:00", attrs: { friendly_name: "Wake-up", has_date: true, has_time: true, timestamp: 1773550000 } },
  { id: "counter.coffees", state: "3", attrs: { friendly_name: "Coffees today", icon: "mdi:coffee", initial: 0, step: 1 } },
  { id: "timer.laundry", state: "active", attrs: { friendly_name: "Laundry timer", duration: "01:30:00", remaining: "00:22:14", finishes_at: "2026-03-14T18:46:14+00:00" } },
  { id: "todo.shopping_list", state: "4", attrs: { friendly_name: "Shopping list", supported_features: 15 } },
  { id: "calendar.family", state: "on", attrs: { friendly_name: "Family calendar", message: "Dentist — Laura", start_time: "2026-03-15 09:30:00", end_time: "2026-03-15 10:15:00", all_day: false, description: "" } },
  { id: "update.home_assistant_core", state: "on", category: "config", attrs: { friendly_name: "Home Assistant Core update", installed_version: "2026.2.4", latest_version: "2026.3.1", title: "Home Assistant Core", skipped_version: null, release_summary: "Sections view polish and a faster websocket layer.", supported_features: 23, device_class: "firmware" } },
  { id: "button.restart", state: "unknown", category: "config", attrs: { friendly_name: "Restart", device_class: "restart" } },
  { id: "select.vacuum_room", state: "Living room", attrs: { friendly_name: "Vacuum room", options: ["Living room", "Kitchen", "Hallway", "Office"] } },
  { id: "number.tv_backlight_speed", state: "40", category: "config", attrs: { friendly_name: "Backlight speed", min: 0, max: 100, step: 5, mode: "slider" } },
  { id: "valve.garden_tap", state: "closed", area: "garden", attrs: { friendly_name: "Garden tap", device_class: "water", supported_features: 11, current_position: 0 } },
  { id: "siren.alarm_siren", state: "off", attrs: { friendly_name: "Siren", supported_features: 7 } },
  { id: "sensor.unavailable_demo", state: "unavailable", category: "diagnostic", attrs: { friendly_name: "Flaky zigbee sensor" } },
];

function toEntity(seed: EntitySeed): HassEntity {
  const changed = ago(seed.changedMinutesAgo ?? 150);
  return {
    entity_id: seed.id,
    state: seed.state,
    last_changed: changed,
    last_updated: changed,
    attributes: { friendly_name: undefined, ...seed.attrs } as HassEntity["attributes"],
    context: { id: `ctx_${seed.id}`, user_id: null, parent_id: null },
  };
}

export function buildDemoStates(): HassEntities {
  const states: HassEntities = {};
  for (const seed of SEEDS) states[seed.id] = toEntity(seed);
  return states;
}

export function buildDemoEntityRegistry(): Record<string, EntityRegistryDisplayEntry> {
  const reg: Record<string, EntityRegistryDisplayEntry> = {};
  for (const seed of SEEDS) {
    reg[seed.id] = {
      entity_id: seed.id,
      area_id: seed.area,
      device_id: `dev_${seed.id.replace(/\./g, "_")}`,
      labels: [],
      hidden: seed.hidden,
      entity_category: seed.category,
      platform: "demo",
    };
  }
  return reg;
}

export function buildDemoDevices(): Record<string, DeviceRegistryEntry> {
  const devices: Record<string, DeviceRegistryEntry> = {};
  for (const seed of SEEDS) {
    const id = `dev_${seed.id.replace(/\./g, "_")}`;
    devices[id] = {
      id,
      name: (seed.attrs?.friendly_name as string) ?? seed.id,
      name_by_user: null,
      model: "Demo device",
      manufacturer: "HA Dashboard Studio",
      area_id: seed.area ?? null,
      via_device_id: null,
      entry_type: null,
      disabled_by: null,
      labels: [],
    };
  }
  return devices;
}

export function buildDemoAreas(): Record<string, AreaRegistryEntry> {
  return Object.fromEntries(AREAS.map((a) => [a.area_id, a]));
}

export function buildDemoFloors(): Record<string, FloorRegistryEntry> {
  return Object.fromEntries(FLOORS.map((f) => [f.floor_id, f]));
}

export interface HistoryPoint {
  t: number;
  v: number;
}

/**
 * Deterministic synthetic history so graph cards (history-graph,
 * mini-graph-card, apexcharts-card) have something plausible to draw.
 */
export function demoHistory(entityId: string, hours = 24, points = 96): HistoryPoint[] {
  const entity = buildDemoStates()[entityId];
  const base = Number(entity?.state);
  const seedNum = [...entityId].reduce((acc, ch) => acc + ch.charCodeAt(0), 7);
  const rand = mulberry32(seedNum);
  const centre = Number.isFinite(base) ? base : 20;
  const amplitude = Math.max(Math.abs(centre) * 0.12, 0.8);
  const out: HistoryPoint[] = [];
  const span = hours * 3600_000;
  for (let i = 0; i < points; i += 1) {
    const progress = i / (points - 1);
    const t = DEMO_NOW.getTime() - span + progress * span;
    const wave = Math.sin(progress * Math.PI * 2 - 0.6) * amplitude;
    const noise = (rand() - 0.5) * amplitude * 0.5;
    out.push({ t, v: Math.round((centre + wave + noise) * 100) / 100 });
  }
  if (out.length) out[out.length - 1].v = Number.isFinite(base) ? base : out[out.length - 1].v;
  return out;
}

export const DEMO_ENTITY_IDS = SEEDS.map((s) => s.id);
