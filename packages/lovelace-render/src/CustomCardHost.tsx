"use client";

import { useEffect, useRef, useState } from "react";
import { bundleForCustomCard, type LovelaceCardConfig } from "@ha-studio/lovelace";
import { useHass, useRenderOptions } from "./context";
import { loadBundle, whenElementDefined } from "./resources";
import { FallbackCard } from "./cards/shell";

/**
 * Mounts a real HACS custom element and feeds it the mock (or live, read-only)
 * `hass` object — the same contract the Home Assistant frontend uses.
 */
export function CustomCardHost({ config }: { config: LovelaceCardConfig }) {
  const hass = useHass();
  const { loadCustomCards } = useRenderOptions();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const elementRef = useRef<(HTMLElement & { hass?: unknown; setConfig?: (c: unknown) => void }) | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string>("");

  const tag = config.type.startsWith("custom:") ? config.type.slice(7) : config.type;
  const bundle = bundleForCustomCard(tag);
  const serialized = JSON.stringify(config);

  useEffect(() => {
    if (!loadCustomCards || !bundle) return;
    let cancelled = false;
    setState("loading");

    (async () => {
      try {
        await loadBundle(bundle);
        await whenElementDefined(tag);
        if (cancelled || !containerRef.current) return;
        const el = document.createElement(tag) as HTMLElement & {
          hass?: unknown;
          setConfig?: (c: unknown) => void;
        };
        el.setConfig?.(JSON.parse(serialized));
        el.hass = hass;
        containerRef.current.replaceChildren(el);
        elementRef.current = el;
        setState("ready");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setState("error");
      }
    })();

    return () => {
      cancelled = true;
      elementRef.current = null;
    };
  }, [bundle, tag, serialized, loadCustomCards, hass]);

  useEffect(() => {
    if (elementRef.current) elementRef.current.hass = hass;
  }, [hass]);

  if (!bundle) {
    return (
      <FallbackCard
        type={config.type}
        entity={config.entity as string | undefined}
        reason="Custom card not in the bundled registry"
        icon="mdi:puzzle-outline"
      />
    );
  }

  if (!loadCustomCards) {
    return (
      <FallbackCard
        type={config.type}
        entity={config.entity as string | undefined}
        reason={`${bundle.name} — custom cards disabled`}
        icon="mdi:puzzle-outline"
      />
    );
  }

  return (
    <div className="hui-custom-host" data-custom-card={tag} data-state={state}>
      {state === "loading" ? <div className="hui-skeleton" style={{ height: 92 }} /> : null}
      {state === "error" ? (
        <FallbackCard type={config.type} reason={error.slice(0, 120)} icon="mdi:puzzle-remove-outline" />
      ) : null}
      <div ref={containerRef} style={{ display: state === "ready" ? "block" : "none" }} />
    </div>
  );
}
