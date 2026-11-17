"use client";

import type { ProviderId } from "./ai/types";

export interface BuilderSettings {
  provider: ProviderId;
  anthropicKey: string;
  geminiKey: string;
  model: string;
  /** Render, screenshot and have a vision model review before presenting. */
  visualSelfCheck: boolean;
  /** Load real HACS bundles in the preview. */
  loadCustomCards: boolean;
}

const KEY = "ha-studio.builder-settings.v1";

export const DEFAULT_SETTINGS: BuilderSettings = {
  provider: "anthropic",
  anthropicKey: "",
  geminiKey: "",
  model: "",
  visualSelfCheck: true,
  loadCustomCards: true,
};

/**
 * Settings, including the provider API keys, live only in this browser's
 * localStorage. They are sent to the studio's own API route per request so it
 * can call the provider, and are never persisted server-side.
 */
export function loadSettings(): BuilderSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<BuilderSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: BuilderSettings): void {
  window.localStorage.setItem(KEY, JSON.stringify(settings));
}

export function activeKey(settings: BuilderSettings): string {
  return settings.provider === "anthropic" ? settings.anthropicKey : settings.geminiKey;
}
