"use client";

import {
  Auth,
  createConnection,
  subscribeEntities,
  type Connection,
  type HassEntities,
} from "home-assistant-js-websocket";
import {
  formatEntityState,
  type AreaRegistryEntry,
  type DeviceRegistryEntry,
  type EntityRegistryDisplayEntry,
  type FloorRegistryEntry,
  type HassEntity,
  type HomeAssistant,
  type LovelaceConfig,
} from "@ha-studio/lovelace";

export interface HaCredentials {
  url: string;
  token: string;
}

const STORAGE_KEY = "ha-studio.connection.v1";

/**
 * The long-lived token never leaves the browser: it is kept in localStorage
 * and used only for a direct websocket connection from the client to the
 * user's own instance. No studio server ever sees it.
 */
export function loadCredentials(): HaCredentials | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HaCredentials;
    if (!parsed.url || !parsed.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCredentials(creds: HaCredentials): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
}

export function clearCredentials(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

export class ReadOnlyViolation extends Error {
  constructor(what: string) {
    super(`Blocked a write to Home Assistant: ${what}. HA Dashboard Studio is read-only.`);
    this.name = "ReadOnlyViolation";
  }
}

/** Websocket commands the studio is permitted to send. */
const ALLOWED_COMMANDS = new Set([
  "get_states",
  "get_config",
  "get_services",
  "get_panels",
  "auth/current_user",
  "config/entity_registry/list",
  "config/entity_registry/list_for_display",
  "config/device_registry/list",
  "config/area_registry/list",
  "config/floor_registry/list",
  "config/label_registry/list",
  "lovelace/config",
  "lovelace/dashboards/list",
  "lovelace/resources",
  "frontend/get_themes",
  "subscribe_entities",
  "subscribe_events",
  "ping",
]);

export interface HaDashboardSummary {
  id: string | null;
  title: string;
  url_path: string | null;
  mode: string;
}

export interface LiveHaSession {
  connection: Connection;
  hass: HomeAssistant;
  dashboards: HaDashboardSummary[];
  close: () => void;
}

export interface WsMessage extends Record<string, unknown> {
  type: string;
}

/** Sends a websocket command only if it is on the read-only allow-list. */
export async function guardedSend<T>(connection: Connection, message: WsMessage): Promise<T> {
  if (!ALLOWED_COMMANDS.has(message.type)) throw new ReadOnlyViolation(message.type);
  return connection.sendMessagePromise<T>(message);
}

export function isAllowedCommand(type: string): boolean {
  return ALLOWED_COMMANDS.has(type);
}

export interface ConnectOptions {
  onStates?: (states: HassEntities) => void;
  darkMode?: boolean;
}

export async function connectToHomeAssistant(
  creds: HaCredentials,
  options: ConnectOptions = {},
): Promise<LiveHaSession> {
  const hassUrl = creds.url.replace(/\/+$/, "");
  const auth = new Auth({
    hassUrl,
    access_token: creds.token,
    // A long-lived token does not expire on its own and cannot be refreshed.
    expires_in: 60 * 60 * 24 * 365,
    expires: Date.now() + 60 * 60 * 24 * 365 * 1000,
    refresh_token: "",
    clientId: null,
  });

  const connection = await createConnection({ auth });

  const [states, config, user, entityList, deviceList, areaList, floorList, themes] =
    await Promise.all([
      guardedSend<HassEntities>(connection, { type: "get_states" }).catch(() => ({}) as HassEntities),
      guardedSend<Record<string, unknown>>(connection, { type: "get_config" }),
      guardedSend<Record<string, unknown>>(connection, { type: "auth/current_user" }).catch(() => ({})),
      guardedSend<EntityRegistryDisplayEntry[]>(connection, {
        type: "config/entity_registry/list",
      }).catch(() => []),
      guardedSend<DeviceRegistryEntry[]>(connection, { type: "config/device_registry/list" }).catch(
        () => [],
      ),
      guardedSend<AreaRegistryEntry[]>(connection, { type: "config/area_registry/list" }).catch(
        () => [],
      ),
      guardedSend<FloorRegistryEntry[]>(connection, { type: "config/floor_registry/list" }).catch(
        () => [],
      ),
      guardedSend<Record<string, unknown>>(connection, { type: "frontend/get_themes" }).catch(
        () => ({}),
      ),
    ]);

  const dashboards = await guardedSend<HaDashboardSummary[]>(connection, {
    type: "lovelace/dashboards/list",
  }).catch(() => [] as HaDashboardSummary[]);

  const refuse = (what: string) => Promise.reject(new ReadOnlyViolation(what));

  const hass: HomeAssistant = {
    states: states as unknown as Record<string, HassEntity>,
    entities: Object.fromEntries(
      (entityList ?? []).map((e) => [e.entity_id, { ...e, labels: e.labels ?? [] }]),
    ),
    devices: Object.fromEntries((deviceList ?? []).map((d) => [d.id, d])),
    areas: Object.fromEntries((areaList ?? []).map((a) => [a.area_id, a])),
    floors: Object.fromEntries((floorList ?? []).map((f) => [f.floor_id, f])),
    config: config as unknown as HomeAssistant["config"],
    themes: {
      default_theme: String((themes as Record<string, unknown>).default_theme ?? "default"),
      themes: ((themes as Record<string, unknown>).themes ?? {}) as Record<string, unknown>,
      darkMode: options.darkMode ?? false,
      theme: "default",
    },
    selectedTheme: { theme: "default", dark: options.darkMode ?? false },
    panels: {},
    services: {},
    user: {
      id: String((user as Record<string, unknown>).id ?? "unknown"),
      name: String((user as Record<string, unknown>).name ?? "User"),
      is_owner: Boolean((user as Record<string, unknown>).is_owner),
      is_admin: Boolean((user as Record<string, unknown>).is_admin),
    },
    language: "en",
    locale: {
      language: "en",
      number_format: "language",
      time_format: "24",
      date_format: "DMY",
      first_weekday: "monday",
      time_zone: "local",
    },
    localize: (key: string) => (key.split(".").pop() ?? key).replace(/_/g, " "),
    formatEntityState: (entity, state) =>
      formatEntityState(state === undefined ? entity : { ...entity, state }),
    formatEntityAttributeValue: (entity, attribute, value) =>
      String(value ?? entity.attributes[attribute] ?? ""),
    formatEntityAttributeName: (_entity, attribute) => attribute.replace(/_/g, " "),
    callService: (domain, service) => refuse(`${domain}.${service}`),
    callWS: (msg) => guardedSend(connection, msg as WsMessage),
    callApi: () => refuse("REST call"),
    connected: true,
    translationMetadata: {
      fragments: [],
      translations: { en: { nativeName: "English", isRTL: false } },
    },
    resources: { en: {} },
    selectedLanguage: "en",
    readOnly: true,
    hassUrl: (path = "") => `${hassUrl}${path}`,
    auth: { data: { access_token: creds.token }, expired: false },
    connection,
  };

  let unsubscribe: (() => void) | undefined;
  if (options.onStates) {
    unsubscribe = subscribeEntities(connection, (next) => {
      hass.states = next as unknown as Record<string, HassEntity>;
      options.onStates?.(next);
    });
  }

  return {
    connection,
    hass,
    dashboards: dashboards ?? [],
    close: () => {
      unsubscribe?.();
      connection.close();
    },
  };
}

/** Fetches one of the user's existing Lovelace dashboards, read-only. */
export async function fetchLovelaceConfig(
  connection: Connection,
  urlPath: string | null,
): Promise<LovelaceConfig> {
  return guardedSend<LovelaceConfig>(connection, {
    type: "lovelace/config",
    url_path: urlPath,
  });
}

export async function fetchLovelaceResources(
  connection: Connection,
): Promise<Array<{ url: string; type: string }>> {
  return guardedSend<Array<{ url: string; type: string }>>(connection, {
    type: "lovelace/resources",
  }).catch(() => []);
}
