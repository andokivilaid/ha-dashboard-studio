import {
  analyzeDashboard,
  deriveTags,
  toLovelaceYaml,
  type LovelaceConfig,
} from "@ha-studio/lovelace";
import type { DashboardEntry } from "./schema";

/**
 * Reference dashboards written for this project (MIT, same as the repo).
 * They exist so the gallery always has fully renderable, style-diverse
 * examples even before the GitHub ingester has run, and so the builder has
 * trustworthy "open as template" starting points.
 */
interface CuratedSeed {
  id: string;
  slug: string;
  title: string;
  description: string;
  tags: string[];
  config: LovelaceConfig;
}

const SEEDS: CuratedSeed[] = [
  {
    id: "studio-sections-home",
    slug: "studio-sections-home",
    title: "Studio — Sections home",
    description:
      "The current Home Assistant default style: a sections view with heading cards, tile features and entity badges. A good baseline for a 2026 dashboard.",
    tags: ["sections-view", "modern", "tablet", "room-based"],
    config: {
      title: "Home",
      views: [
        {
          title: "Home",
          path: "home",
          icon: "mdi:home",
          type: "sections",
          max_columns: 3,
          badges: [
            { type: "entity", entity: "person.ando", show_name: true },
            { type: "entity", entity: "person.mari", show_name: true },
            { type: "entity", entity: "sensor.outdoor_temperature", show_name: true },
            { type: "entity", entity: "alarm_control_panel.home" },
            { type: "entity", entity: "sensor.power_consumption" },
          ],
          sections: [
            {
              type: "grid",
              cards: [
                { type: "heading", heading: "Living room", icon: "mdi:sofa", heading_style: "title" },
                { type: "tile", entity: "light.living_room_ceiling", features: [{ type: "light-brightness" }] },
                { type: "tile", entity: "light.living_room_lamp", features: [{ type: "light-brightness" }] },
                { type: "tile", entity: "cover.living_room_blinds", features: [{ type: "cover-position" }] },
                { type: "tile", entity: "media_player.living_room_tv", features: [{ type: "media-player-volume-slider" }] },
                { type: "tile", entity: "climate.living_room", features: [{ type: "target-temperature" }] },
                { type: "tile", entity: "fan.living_room_air_purifier", features: [{ type: "fan-speed" }] },
              ],
            },
            {
              type: "grid",
              cards: [
                { type: "heading", heading: "Kitchen", icon: "mdi:countertop" },
                { type: "tile", entity: "light.kitchen_spots", features: [{ type: "light-brightness" }] },
                { type: "tile", entity: "light.kitchen_under_cabinet" },
                { type: "tile", entity: "switch.coffee_machine", features: [{ type: "toggle" }] },
                { type: "tile", entity: "media_player.kitchen_speaker" },
                { type: "heading", heading: "Climate", icon: "mdi:thermometer", heading_style: "subtitle" },
                { type: "tile", entity: "sensor.kitchen_temperature" },
                { type: "tile", entity: "sensor.living_room_humidity" },
                { type: "tile", entity: "sensor.co2_living_room" },
              ],
            },
            {
              type: "grid",
              cards: [
                { type: "heading", heading: "Security", icon: "mdi:shield-home" },
                { type: "tile", entity: "lock.front_door", features: [{ type: "lock-commands" }] },
                { type: "tile", entity: "binary_sensor.front_door" },
                { type: "tile", entity: "cover.garage_door", features: [{ type: "cover-open-close" }] },
                { type: "tile", entity: "binary_sensor.living_room_motion" },
                {
                  type: "alarm-panel",
                  entity: "alarm_control_panel.home",
                  states: ["arm_home", "arm_away"],
                },
              ],
            },
          ],
        },
        {
          title: "Energy",
          path: "energy",
          icon: "mdi:lightning-bolt",
          type: "sections",
          max_columns: 2,
          sections: [
            {
              type: "grid",
              cards: [
                { type: "heading", heading: "Today", icon: "mdi:calendar-today" },
                { type: "gauge", entity: "sensor.power_consumption", min: 0, max: 4000, name: "House power", unit: "W", severity: { green: 0, yellow: 1500, red: 3000 } },
                { type: "tile", entity: "sensor.energy_today" },
                { type: "tile", entity: "sensor.solar_energy_today" },
                { type: "tile", entity: "sensor.energy_cost_today" },
              ],
            },
            {
              type: "grid",
              cards: [
                { type: "heading", heading: "Trend", icon: "mdi:chart-line" },
                { type: "history-graph", hours_to_show: 24, entities: ["sensor.power_consumption", "sensor.solar_power"], grid_options: { columns: "full" } },
                { type: "energy-usage-graph", title: "Usage", grid_options: { columns: "full" } },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "studio-mushroom-mobile",
    slug: "studio-mushroom-mobile",
    title: "Studio — Mushroom mobile",
    description:
      "Phone-first dashboard built from Mushroom cards and chips: large touch targets, inline brightness sliders, minimal chrome.",
    tags: ["mushroom", "mobile", "minimal"],
    config: {
      views: [
        {
          title: "Home",
          path: "home",
          icon: "mdi:cellphone",
          type: "sections",
          max_columns: 2,
          sections: [
            {
              type: "grid",
              cards: [
                {
                  type: "custom:mushroom-chips-card",
                  alignment: "center",
                  chips: [
                    { type: "weather", entity: "weather.home", show_conditions: true, show_temperature: true },
                    { type: "entity", entity: "person.ando", icon_color: "green" },
                    { type: "entity", entity: "sensor.power_consumption", icon_color: "orange" },
                    { type: "entity", entity: "alarm_control_panel.home", icon_color: "red" },
                  ],
                  grid_options: { columns: "full" },
                },
                { type: "custom:mushroom-title-card", title: "Good evening", subtitle: "Everything is calm", grid_options: { columns: "full" } },
                { type: "custom:mushroom-light-card", entity: "light.living_room_ceiling", show_brightness_control: true, show_color_temp_control: true, use_light_color: true, collapsible_controls: false },
                { type: "custom:mushroom-light-card", entity: "light.kitchen_spots", show_brightness_control: true, use_light_color: true },
                { type: "custom:mushroom-climate-card", entity: "climate.living_room", show_temperature_control: true, hvac_modes: ["off", "heat", "auto"] },
                { type: "custom:mushroom-cover-card", entity: "cover.living_room_blinds", show_position_control: true, show_buttons_control: true },
                { type: "custom:mushroom-media-player-card", entity: "media_player.kitchen_speaker", volume_controls: ["volume_set", "volume_mute"], media_controls: ["play_pause_stop", "previous", "next"] },
                { type: "custom:mushroom-person-card", entity: "person.mari", layout: "vertical" },
                { type: "custom:mushroom-entity-card", entity: "sensor.living_room_temperature", icon_color: "blue" },
                { type: "custom:mushroom-entity-card", entity: "sensor.bedroom_humidity", icon_color: "cyan" },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "studio-bubble-pop",
    slug: "studio-bubble-pop",
    title: "Studio — Bubble pop-ups",
    description:
      "Bubble Card layout: a horizontal button row backed by pop-ups, separators and sliders. iOS-flavoured and very compact.",
    tags: ["bubble-card", "mobile", "minimal"],
    config: {
      views: [
        {
          title: "Bubble",
          path: "bubble",
          icon: "mdi:chart-bubble",
          type: "sections",
          max_columns: 2,
          sections: [
            {
              type: "grid",
              cards: [
                { type: "custom:bubble-card", card_type: "separator", name: "Living room", icon: "mdi:sofa", grid_options: { columns: "full" } },
                { type: "custom:bubble-card", card_type: "button", button_type: "slider", entity: "light.living_room_ceiling", name: "Ceiling", icon: "mdi:ceiling-light" },
                { type: "custom:bubble-card", card_type: "button", button_type: "switch", entity: "switch.tv_power", name: "TV" },
                { type: "custom:bubble-card", card_type: "button", button_type: "state", entity: "sensor.living_room_temperature", name: "Temperature" },
                { type: "custom:bubble-card", card_type: "separator", name: "Climate", icon: "mdi:thermostat", grid_options: { columns: "full" } },
                { type: "custom:bubble-card", card_type: "climate", entity: "climate.living_room" },
                { type: "custom:bubble-card", card_type: "cover", entity: "cover.living_room_blinds", name: "Blinds" },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "studio-wall-tablet",
    slug: "studio-wall-tablet",
    title: "Studio — Wall tablet",
    description:
      "Landscape panel for a wall-mounted tablet: a fixed three-column grid, large glanceable type, no scrolling.",
    tags: ["wall-tablet", "kiosk", "landscape", "room-based"],
    config: {
      views: [
        {
          title: "Wall",
          path: "wall",
          icon: "mdi:tablet-dashboard",
          type: "sections",
          max_columns: 3,
          sections: [
            {
              type: "grid",
              cards: [
                { type: "heading", heading: "Now", icon: "mdi:clock-outline" },
                { type: "weather-forecast", entity: "weather.home", show_forecast: true, forecast_type: "daily", grid_options: { columns: "full" } },
                { type: "markdown", content: "## Welcome home\nNext: **Dentist — Laura**, Sunday 09:30.", grid_options: { columns: "full" } },
              ],
            },
            {
              type: "grid",
              cards: [
                { type: "heading", heading: "Lights", icon: "mdi:lightbulb-group" },
                { type: "tile", entity: "light.living_room_ceiling", features: [{ type: "light-brightness" }] },
                { type: "tile", entity: "light.kitchen_spots", features: [{ type: "light-brightness" }] },
                { type: "tile", entity: "light.office_desk", features: [{ type: "light-brightness" }] },
                { type: "tile", entity: "light.garden_path" },
                { type: "heading", heading: "Scenes", icon: "mdi:palette", heading_style: "subtitle" },
                {
                  type: "grid",
                  columns: 2,
                  square: false,
                  grid_options: { columns: "full" },
                  cards: [
                    { type: "button", entity: "scene.movie_night", name: "Movie", icon: "mdi:movie-open" },
                    { type: "button", entity: "scene.good_morning", name: "Morning", icon: "mdi:weather-sunset-up" },
                    { type: "button", entity: "scene.dinner", name: "Dinner", icon: "mdi:silverware-fork-knife" },
                    { type: "button", entity: "scene.all_off", name: "All off", icon: "mdi:power" },
                  ],
                },
              ],
            },
            {
              type: "grid",
              cards: [
                { type: "heading", heading: "Household", icon: "mdi:home-heart" },
                { type: "tile", entity: "vacuum.robot", features: [{ type: "vacuum-commands" }] },
                { type: "tile", entity: "sensor.washing_machine_status" },
                { type: "tile", entity: "timer.laundry" },
                { type: "tile", entity: "sensor.next_bin_collection" },
                { type: "todo-list", entity: "todo.shopping_list", grid_options: { columns: "full" } },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "studio-classic-masonry",
    slug: "studio-classic-masonry",
    title: "Studio — Classic masonry",
    description:
      "The pre-sections look that most older community configs use: masonry columns with entities, thermostat, glance and history-graph cards.",
    tags: ["masonry", "classic", "dense"],
    config: {
      views: [
        {
          title: "Overview",
          path: "overview",
          icon: "mdi:view-dashboard",
          badges: ["person.ando", "person.mari", "sensor.outdoor_temperature"],
          cards: [
            { type: "weather-forecast", entity: "weather.home", show_forecast: true },
            {
              type: "entities",
              title: "Lights",
              show_header_toggle: true,
              entities: [
                "light.living_room_ceiling",
                "light.living_room_lamp",
                "light.kitchen_spots",
                "light.office_desk",
                "light.bedroom",
                { type: "divider" },
                "switch.coffee_machine",
                "switch.dishwasher_plug",
              ],
            },
            { type: "thermostat", entity: "climate.living_room" },
            {
              type: "glance",
              title: "Doors & windows",
              columns: 4,
              entities: [
                "binary_sensor.front_door",
                "binary_sensor.back_door",
                "binary_sensor.living_room_window",
                "binary_sensor.bedroom_window",
              ],
            },
            {
              type: "history-graph",
              title: "Temperature",
              hours_to_show: 24,
              entities: [
                "sensor.living_room_temperature",
                "sensor.bedroom_temperature",
                "sensor.outdoor_temperature",
              ],
            },
            { type: "media-control", entity: "media_player.living_room_tv" },
            {
              type: "entities",
              title: "Automations",
              entities: ["automation.motion_hallway_light", "automation.sunset_lights", "automation.away_mode"],
            },
            { type: "gauge", entity: "sensor.phone_battery", name: "Phone", min: 0, max: 100, unit: "%" },
            { type: "picture-glance", title: "Front door", camera_image: "camera.front_door", entities: ["binary_sensor.front_door", "lock.front_door", "light.hallway"] },
            { type: "map", entities: ["person.ando", "person.mari"] },
          ],
        },
        {
          title: "Rooms",
          path: "rooms",
          icon: "mdi:floor-plan",
          cards: [
            { type: "area", area: "living_room" },
            { type: "area", area: "kitchen" },
            { type: "area", area: "bedroom" },
            { type: "area", area: "office" },
            { type: "area", area: "bathroom" },
            { type: "area", area: "garage" },
          ],
        },
      ],
    },
  },
  {
    id: "studio-dark-minimal",
    slug: "studio-dark-minimal",
    title: "Studio — Dark minimal",
    description:
      "A restrained dark dashboard: vertical stacks, a single accent colour, mini-graph-card sparklines and button-card tiles.",
    tags: ["minimal", "dark", "charts", "button-card"],
    config: {
      views: [
        {
          title: "Minimal",
          path: "minimal",
          icon: "mdi:circle-outline",
          type: "sections",
          max_columns: 2,
          sections: [
            {
              type: "grid",
              cards: [
                { type: "heading", heading: "Climate", icon: "mdi:thermometer" },
                { type: "custom:mini-graph-card", entities: ["sensor.living_room_temperature"], name: "Living room", line_color: "#03a9f4", hours_to_show: 24, points_per_hour: 2, grid_options: { columns: "full" } },
                { type: "custom:mini-graph-card", entities: ["sensor.outdoor_temperature"], name: "Outdoor", line_color: "#ff9800", hours_to_show: 24, points_per_hour: 2, grid_options: { columns: "full" } },
              ],
            },
            {
              type: "grid",
              cards: [
                { type: "heading", heading: "Quick actions", icon: "mdi:gesture-tap-button" },
                { type: "custom:button-card", entity: "light.living_room_ceiling", name: "Ceiling", show_state: true },
                { type: "custom:button-card", entity: "switch.coffee_machine", name: "Coffee", show_state: true },
                { type: "custom:button-card", entity: "scene.movie_night", name: "Movie" },
                { type: "custom:button-card", entity: "vacuum.robot", name: "Vacuum", show_state: true },
              ],
            },
          ],
        },
      ],
    },
  },
];

function buildEntry(seed: CuratedSeed): DashboardEntry {
  const analysis = analyzeDashboard(seed.config);
  const yaml = toLovelaceYaml(seed.config);
  return {
    id: seed.id,
    slug: seed.slug,
    title: seed.title,
    description: seed.description,
    source: {
      kind: "curated",
      url: "https://github.com/andokivilaid/ha-dashboard-studio",
      repo: "andokivilaid/ha-dashboard-studio",
      path: "packages/catalog/src/curated.ts",
      author: "HA Dashboard Studio",
      authorUrl: "https://github.com/andokivilaid/ha-dashboard-studio",
      via: "Written for this project",
    },
    license: {
      spdx: "mit",
      name: "MIT License",
      url: "https://github.com/andokivilaid/ha-dashboard-studio/blob/main/LICENSE",
      permissive: true,
    },
    stars: null,
    forks: null,
    lastCommit: null,
    topics: ["reference"],
    yamlFile: null,
    inlineYaml: yaml,
    yamlOmittedReason: null,
    yamlBytes: Buffer.byteLength(yaml),
    analysis,
    tags: [...new Set([...seed.tags, ...deriveTags(analysis)])],
    renderable: true,
    screenshot: null,
    collectedAt: "2026-03-14T00:00:00.000Z",
  };
}

export const CURATED_ENTRIES: DashboardEntry[] = SEEDS.map(buildEntry);
