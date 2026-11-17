"use client";

import { bundleForCustomCard, type CustomCardBundle } from "@ha-studio/lovelace";
import { installHaElementShims } from "./ha-shims";

export type ResourceStatus = "idle" | "loading" | "ready" | "error";

const loaded = new Map<string, Promise<void>>();
const status = new Map<string, ResourceStatus>();

/** Where the app serves proxied HACS bundles from. Overridable for tests. */
export let RESOURCE_BASE = "/api/hacs";
export function setResourceBase(base: string): void {
  RESOURCE_BASE = base;
}

export function bundleStatus(slug: string): ResourceStatus {
  return status.get(slug) ?? "idle";
}

/**
 * HACS bundles assume they run inside the Home Assistant frontend. Two globals
 * are enough for the common cases: `customCards` (the registry each bundle
 * pushes into) and `loadCardHelpers` (used to build nested cards and rows).
 */
function installFrontendShims(): void {
  try {
    installHaElementShims();
  } catch {
    /* a page may already carry the real frontend elements */
  }
  const w = window as unknown as Record<string, unknown>;
  if (!w.customCards) w.customCards = [];
  if (!w.loadCardHelpers) {
    w.loadCardHelpers = async () => ({
      createCardElement: (config: { type?: string }) => createStub("card", config),
      createRowElement: (config: { type?: string }) => createStub("row", config),
      createBadgeElement: (config: { type?: string }) => createStub("badge", config),
      createHeaderFooterElement: (config: { type?: string }) => createStub("header", config),
      importMoreInfoControl: () => Promise.resolve(),
    });
  }
  if (!customElements.get("ha-studio-stub")) {
    class HaStudioStub extends HTMLElement {
      private _config: Record<string, unknown> = {};
      setConfig(config: Record<string, unknown>) {
        this._config = config;
        this.render();
      }
      set hass(_value: unknown) {
        /* read-only preview */
      }
      getCardSize() {
        return 2;
      }
      private render() {
        this.innerHTML = "";
        const box = document.createElement("div");
        box.className = "hui-fallback-card";
        box.style.cssText =
          "padding:12px 14px;font-size:12px;color:var(--secondary-text-color);border:1px dashed var(--divider-color);border-radius:10px;";
        box.textContent = `${String(this._config.type ?? "element")} (nested preview)`;
        this.appendChild(box);
      }
    }
    customElements.define("ha-studio-stub", HaStudioStub);
  }
}

function createStub(kind: string, config: { type?: string }): HTMLElement {
  installFrontendShims();
  const el = document.createElement("ha-studio-stub") as HTMLElement & {
    setConfig?: (c: unknown) => void;
  };
  el.setConfig?.({ ...config, _kind: kind });
  return el;
}

export function loadBundle(bundle: CustomCardBundle): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const existing = loaded.get(bundle.slug);
  if (existing) return existing;

  installFrontendShims();
  status.set(bundle.slug, "loading");

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = `${RESOURCE_BASE}/${bundle.slug}.js`;
    script.async = true;
    script.dataset.haStudioBundle = bundle.slug;
    script.onload = () => {
      status.set(bundle.slug, "ready");
      resolve();
    };
    script.onerror = () => {
      status.set(bundle.slug, "error");
      reject(new Error(`Failed to load ${bundle.name} from ${script.src}`));
    };
    document.head.appendChild(script);
  });

  loaded.set(bundle.slug, promise);
  return promise;
}

export async function loadBundlesForCards(types: string[]): Promise<void> {
  const bundles = new Map<string, CustomCardBundle>();
  for (const type of types) {
    const bundle = bundleForCustomCard(type);
    if (bundle) bundles.set(bundle.slug, bundle);
  }
  await Promise.allSettled([...bundles.values()].map(loadBundle));
}

/** Resolves once the custom element exists, or rejects after `timeoutMs`. */
export function whenElementDefined(tag: string, timeoutMs = 8000): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (customElements.get(tag)) return Promise.resolve();
  return Promise.race([
    customElements.whenDefined(tag).then(() => undefined),
    new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error(`<${tag}> was not defined within ${timeoutMs} ms`)), timeoutMs),
    ),
  ]);
}
