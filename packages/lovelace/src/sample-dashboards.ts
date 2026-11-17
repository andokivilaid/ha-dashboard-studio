import type { LovelaceConfig } from "./types";

export interface StarterTemplate {
  id: string;
  name: string;
  description: string;
  config: LovelaceConfig;
}

/** Starting points offered in the builder's "new dashboard" menu. */
export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: "blank",
    name: "Blank",
    description: "One empty sections view — start from nothing.",
    config: {
      views: [{ title: "Home", type: "sections", max_columns: 3, sections: [{ type: "grid", cards: [] }] }],
    },
  },
  {
    id: "sections-home",
    name: "Sections home",
    description: "Modern sections view with headings, tile cards and badges.",
    config: {
      views: [
        {
          title: "Home",
          path: "home",
          icon: "mdi:home",
          type: "sections",
          max_columns: 3,
          badges: [
            { type: "entity", entity: "person.ando" },
            { type: "entity", entity: "person.mari" },
            { type: "entity", entity: "sensor.outdoor_temperature" },
            { type: "entity", entity: "alarm_control_panel.home" },
          ],
          sections: [
            {
              type: "grid",
              cards: [
                { type: "heading", heading: "Living room", icon: "mdi:sofa" },
                { type: "tile", entity: "light.living_room_ceiling", features: [{ type: "light-brightness" }] },
                { type: "tile", entity: "light.living_room_lamp" },
                { type: "tile", entity: "cover.living_room_blinds", features: [{ type: "cover-open-close" }] },
                { type: "tile", entity: "media_player.living_room_tv" },
              ],
            },
            {
              type: "grid",
              cards: [
                { type: "heading", heading: "Climate", icon: "mdi:thermostat" },
                { type: "tile", entity: "climate.living_room", features: [{ type: "target-temperature" }] },
                { type: "tile", entity: "sensor.living_room_temperature" },
                { type: "tile", entity: "sensor.living_room_humidity" },
                { type: "tile", entity: "sensor.co2_living_room" },
              ],
            },
            {
              type: "grid",
              cards: [
                { type: "heading", heading: "House", icon: "mdi:home-outline" },
                { type: "tile", entity: "lock.front_door" },
                { type: "tile", entity: "binary_sensor.front_door" },
                { type: "tile", entity: "cover.garage_door", features: [{ type: "cover-open-close" }] },
                { type: "tile", entity: "vacuum.robot" },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "classic-masonry",
    name: "Classic masonry",
    description: "The pre-2024 look: entities, weather, thermostat and a graph.",
    config: {
      views: [
        {
          title: "Overview",
          path: "overview",
          icon: "mdi:view-dashboard",
          cards: [
            { type: "weather-forecast", entity: "weather.home", forecast_type: "daily", show_forecast: true },
            {
              type: "entities",
              title: "Lights",
              show_header_toggle: true,
              entities: [
                "light.living_room_ceiling",
                "light.kitchen_spots",
                "light.office_desk",
                "light.bedroom",
              ],
            },
            { type: "thermostat", entity: "climate.living_room" },
            {
              type: "glance",
              title: "Doors & windows",
              entities: [
                "binary_sensor.front_door",
                "binary_sensor.back_door",
                "binary_sensor.living_room_window",
                "binary_sensor.bedroom_window",
              ],
            },
            {
              type: "history-graph",
              title: "Temperatures",
              hours_to_show: 24,
              entities: ["sensor.living_room_temperature", "sensor.bedroom_temperature", "sensor.outdoor_temperature"],
            },
            { type: "media-control", entity: "media_player.living_room_tv" },
          ],
        },
      ],
    },
  },
  {
    id: "mushroom-mobile",
    name: "Mushroom mobile",
    description: "Phone-first layout built on Mushroom cards and chips.",
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
                  chips: [
                    { type: "weather", entity: "weather.home", show_conditions: true, show_temperature: true },
                    { type: "entity", entity: "person.ando" },
                    { type: "entity", entity: "sensor.power_consumption" },
                  ],
                },
                { type: "custom:mushroom-title-card", title: "Good evening", subtitle: "Everything is calm" },
                { type: "custom:mushroom-light-card", entity: "light.living_room_ceiling", show_brightness_control: true, use_light_color: true },
                { type: "custom:mushroom-climate-card", entity: "climate.living_room", show_temperature_control: true },
                { type: "custom:mushroom-cover-card", entity: "cover.living_room_blinds", show_position_control: true },
                { type: "custom:mushroom-media-player-card", entity: "media_player.kitchen_speaker", volume_controls: ["volume_set"] },
              ],
            },
          ],
        },
      ],
    },
  },
];

export function starterById(id: string): StarterTemplate | undefined {
  return STARTER_TEMPLATES.find((t) => t.id === id);
}
