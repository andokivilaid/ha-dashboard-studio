import { computeEntityName, formatEntityState } from "../format";
import type { HassEntity, HomeAssistant } from "../types";
import {
  buildDemoAreas,
  buildDemoDevices,
  buildDemoEntityRegistry,
  buildDemoFloors,
  buildDemoStates,
} from "./demo-home";

export class ReadOnlyError extends Error {
  constructor(public readonly detail: string) {
    super(detail);
    this.name = "ReadOnlyError";
  }
}

export interface MockHassOptions {
  darkMode?: boolean;
  /** Extra or overriding states merged on top of the demo home. */
  states?: Record<string, HassEntity>;
  locationName?: string;
  /** Called instead of throwing when a card attempts a service call. */
  onServiceCall?: (domain: string, service: string, data?: Record<string, unknown>) => void;
}

/**
 * Builds an object shaped like the frontend's `hass`. Every mutating entry
 * point refuses: HA Dashboard Studio never writes to a Home Assistant
 * instance, mock or real.
 */
export function createMockHass(options: MockHassOptions = {}): HomeAssistant {
  const states = { ...buildDemoStates(), ...(options.states ?? {}) };
  const darkMode = options.darkMode ?? false;

  const refuse = (what: string) => {
    const err = new ReadOnlyError(`HA Dashboard Studio is read-only: refused ${what}.`);
    return Promise.reject(err);
  };

  const hass: HomeAssistant = {
    states,
    entities: buildDemoEntityRegistry(),
    devices: buildDemoDevices(),
    areas: buildDemoAreas(),
    floors: buildDemoFloors(),
    config: {
      latitude: 59.437,
      longitude: 24.7536,
      elevation: 9,
      unit_system: {
        length: "km",
        mass: "g",
        volume: "L",
        temperature: "°C",
        pressure: "Pa",
        wind_speed: "km/h",
        accumulated_precipitation: "mm",
      },
      location_name: options.locationName ?? "Demo Home",
      time_zone: "Europe/Tallinn",
      components: [
        "light", "switch", "sensor", "binary_sensor", "climate", "cover", "media_player",
        "person", "lock", "alarm_control_panel", "camera", "weather", "sun", "scene",
        "script", "automation", "energy", "history", "logbook", "frontend", "lovelace",
      ],
      config_dir: "/config",
      version: "2026.3.1",
      currency: "EUR",
      country: "EE",
      language: "en",
      state: "RUNNING",
    },
    themes: { default_theme: "default", themes: {}, darkMode, theme: "default" },
    selectedTheme: { theme: "default", dark: darkMode },
    panels: {},
    services: {},
    user: { id: "demo-user", name: "Demo", is_owner: true, is_admin: true },
    language: "en",
    locale: {
      language: "en",
      number_format: "language",
      time_format: "24",
      date_format: "DMY",
      first_weekday: "monday",
      time_zone: "local",
    },
    localize: (key: string) => {
      const tail = key.split(".").pop() ?? key;
      return tail.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
    },
    formatEntityState: (entity: HassEntity, state?: string) =>
      formatEntityState(state === undefined ? entity : { ...entity, state }),
    formatEntityAttributeValue: (entity: HassEntity, attribute: string, value?: unknown) => {
      const v = value ?? entity.attributes[attribute];
      return v === undefined || v === null ? "" : String(v);
    },
    formatEntityAttributeName: (_entity: HassEntity, attribute: string) =>
      attribute.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
    callService: (domain, service, data) => {
      options.onServiceCall?.(domain, service, data);
      return refuse(`${domain}.${service}`);
    },
    callWS: () => refuse("a websocket command"),
    callApi: () => refuse("a REST call"),
    connected: true,
    isMock: true,
    translationMetadata: {
      fragments: [],
      translations: { en: { nativeName: "English", isRTL: false } },
    },
    resources: { en: {} },
    selectedLanguage: "en",
    readOnly: true,
    auth: { data: { access_token: "demo" }, expired: false },
    hassUrl: (path = "") => path,
    dockedSidebar: "auto",
    moreInfoEntityId: null,
  };

  return hass;
}

/** Entity ids a builder prompt should normally ignore. */
export function isNoisyEntity(hass: HomeAssistant, entityId: string): boolean {
  const reg = hass.entities[entityId];
  if (reg?.hidden) return true;
  if (reg?.entity_category === "diagnostic" || reg?.entity_category === "config") return true;
  const state = hass.states[entityId];
  if (!state) return true;
  if (state.state === "unavailable" || state.state === "unknown") return true;
  return false;
}

export interface EntityInventoryItem {
  entity_id: string;
  name: string;
  domain: string;
  state: string;
  device_class?: string;
  unit?: string;
  area?: string;
  floor?: string;
}

/** Compact inventory handed to the LLM so it picks real entities. */
export function buildEntityInventory(
  hass: HomeAssistant,
  opts: { includeNoisy?: boolean } = {},
): EntityInventoryItem[] {
  const out: EntityInventoryItem[] = [];
  for (const entityId of Object.keys(hass.states)) {
    if (!opts.includeNoisy && isNoisyEntity(hass, entityId)) continue;
    const state = hass.states[entityId];
    const reg = hass.entities[entityId];
    const area = reg?.area_id ? hass.areas[reg.area_id] : undefined;
    const floor = area?.floor_id ? hass.floors[area.floor_id] : undefined;
    out.push({
      entity_id: entityId,
      name: computeEntityName(state),
      domain: entityId.split(".")[0],
      state: state.state.length > 32 ? `${state.state.slice(0, 32)}…` : state.state,
      device_class: state.attributes.device_class as string | undefined,
      unit: state.attributes.unit_of_measurement as string | undefined,
      area: area?.name,
      floor: floor?.name,
    });
  }
  return out.sort((a, b) => a.entity_id.localeCompare(b.entity_id));
}
