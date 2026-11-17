/**
 * Minimal, faithful subset of the Home Assistant frontend data model.
 *
 * Field names deliberately mirror `home-assistant-js-websocket` and the
 * frontend's `HomeAssistant` interface so that third-party (HACS) custom cards
 * receive an object shaped the way they expect.
 */

export interface HassEntityAttributeBase {
  friendly_name?: string;
  unit_of_measurement?: string;
  icon?: string;
  entity_picture?: string;
  supported_features?: number;
  hidden?: boolean;
  assumed_state?: boolean;
  device_class?: string;
  state_class?: string;
  restored?: boolean;
  editable?: boolean;
  [key: string]: unknown;
}

export interface HassEntity {
  entity_id: string;
  state: string;
  last_changed: string;
  last_updated: string;
  attributes: HassEntityAttributeBase;
  context: { id: string; user_id: string | null; parent_id: string | null };
}

export type HassEntities = Record<string, HassEntity>;

export interface AreaRegistryEntry {
  area_id: string;
  name: string;
  floor_id: string | null;
  icon: string | null;
  picture: string | null;
  aliases: string[];
  labels: string[];
}

export interface FloorRegistryEntry {
  floor_id: string;
  name: string;
  level: number | null;
  icon: string | null;
  aliases: string[];
}

export interface DeviceRegistryEntry {
  id: string;
  name: string | null;
  name_by_user: string | null;
  model: string | null;
  manufacturer: string | null;
  area_id: string | null;
  via_device_id: string | null;
  entry_type: string | null;
  disabled_by: string | null;
  labels: string[];
}

export type EntityCategory = "config" | "diagnostic";

export interface EntityRegistryDisplayEntry {
  entity_id: string;
  name?: string;
  device_id?: string;
  area_id?: string;
  labels: string[];
  hidden?: boolean;
  entity_category?: EntityCategory;
  translation_key?: string;
  platform?: string;
  display_precision?: number;
}

export interface HassConfig {
  latitude: number;
  longitude: number;
  elevation: number;
  unit_system: {
    length: string;
    mass: string;
    volume: string;
    temperature: string;
    pressure: string;
    wind_speed: string;
    accumulated_precipitation: string;
  };
  location_name: string;
  time_zone: string;
  components: string[];
  config_dir: string;
  version: string;
  currency: string;
  country: string | null;
  language: string;
  state: string;
}

export interface FrontendLocaleData {
  language: string;
  number_format: string;
  time_format: string;
  date_format: string;
  first_weekday: string;
  time_zone: string;
}

export interface HassUser {
  id: string;
  name: string;
  is_owner: boolean;
  is_admin: boolean;
}

/** Shape passed to every card as `.hass`. */
export interface HomeAssistant {
  states: HassEntities;
  entities: Record<string, EntityRegistryDisplayEntry>;
  devices: Record<string, DeviceRegistryEntry>;
  areas: Record<string, AreaRegistryEntry>;
  floors: Record<string, FloorRegistryEntry>;
  config: HassConfig;
  themes: { default_theme: string; themes: Record<string, unknown>; darkMode: boolean; theme: string };
  selectedTheme: { theme: string; dark?: boolean } | null;
  panels: Record<string, unknown>;
  services: Record<string, Record<string, unknown>>;
  user: HassUser;
  language: string;
  locale: FrontendLocaleData;
  localize: (key: string, ...args: unknown[]) => string;
  formatEntityState: (entity: HassEntity, state?: string) => string;
  formatEntityAttributeValue: (entity: HassEntity, attribute: string, value?: unknown) => string;
  formatEntityAttributeName: (entity: HassEntity, attribute: string) => string;
  callService: (
    domain: string,
    service: string,
    data?: Record<string, unknown>,
  ) => Promise<unknown>;
  callWS: <T>(msg: Record<string, unknown>) => Promise<T>;
  callApi: <T>(method: string, path: string, params?: unknown) => Promise<T>;
  connected: boolean;
  /**
   * Fields the HACS ecosystem reads through `custom-card-helpers`.
   * `computeRTL()` dereferences `translationMetadata.translations[language]`
   * unconditionally, so omitting these makes every Lit-based custom card throw
   * during its first render and paint an empty shadow root.
   */
  translationMetadata: {
    fragments: string[];
    translations: Record<string, { nativeName: string; isRTL: boolean; hash?: string }>;
  };
  resources: Record<string, Record<string, string>>;
  selectedLanguage: string | null;
  localize_async?: (key: string) => Promise<string>;
  /** Studio-specific: true when the renderer refuses writes. */
  readOnly?: boolean;
  auth?: { data?: { access_token?: string }; expired?: boolean };
  connection?: unknown;
  hassUrl?: (path?: string) => string;
  dockedSidebar?: string;
  moreInfoEntityId?: string | null;
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/* Lovelace configuration                                              */
/* ------------------------------------------------------------------ */

export interface LovelaceCardConfig {
  type: string;
  index?: number;
  view_index?: number;
  view_layout?: unknown;
  layout_options?: { grid_columns?: number | "full"; grid_rows?: number | "auto" };
  grid_options?: { columns?: number | "full"; rows?: number | "auto" };
  visibility?: unknown[];
  [key: string]: unknown;
}

export interface LovelaceBadgeConfig {
  type?: string;
  entity?: string;
  [key: string]: unknown;
}

export interface LovelaceSectionConfig {
  type?: string;
  title?: string;
  cards?: LovelaceCardConfig[];
  column_span?: number;
  visibility?: unknown[];
  [key: string]: unknown;
}

export type LovelaceViewType =
  | "masonry"
  | "sections"
  | "panel"
  | "sidebar"
  | "custom:grid-layout"
  | string;

export interface LovelaceViewConfig {
  index?: number;
  title?: string;
  path?: string;
  icon?: string;
  theme?: string;
  type?: LovelaceViewType;
  background?: string | Record<string, unknown>;
  panel?: boolean;
  visible?: boolean | unknown[];
  subview?: boolean;
  max_columns?: number;
  dense_section_placement?: boolean;
  top_margin?: boolean;
  badges?: Array<LovelaceBadgeConfig | string>;
  cards?: LovelaceCardConfig[];
  sections?: LovelaceSectionConfig[];
  header?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface LovelaceResourceConfig {
  type: "module" | "css" | "js" | "html";
  url: string;
}

export interface LovelaceConfig {
  title?: string;
  views: LovelaceViewConfig[];
  background?: string;
  theme?: string;
  resources?: LovelaceResourceConfig[];
  [key: string]: unknown;
}
