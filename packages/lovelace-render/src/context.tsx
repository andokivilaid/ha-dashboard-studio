"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { HomeAssistant } from "@ha-studio/lovelace";

export interface RenderOptions {
  /** Interactivity is off in gallery previews and screenshots. */
  interactive: boolean;
  /** Load HACS bundles for `custom:` cards. */
  loadCustomCards: boolean;
  /** Called when a card is clicked in the builder, for select-to-edit. */
  onCardSelect?: (path: CardPath) => void;
  selectedPath?: CardPath | null;
  /** Renders a thin outline around every card. */
  showCardOutlines?: boolean;
}

export interface CardPath {
  view: number;
  section?: number;
  card: number;
}

export function cardPathKey(path: CardPath | null | undefined): string {
  if (!path) return "";
  return `${path.view}:${path.section ?? "-"}:${path.card}`;
}

interface RenderContextValue {
  hass: HomeAssistant;
  options: RenderOptions;
}

const RenderContext = createContext<RenderContextValue | null>(null);

export function LovelaceProvider({
  hass,
  options,
  children,
}: {
  hass: HomeAssistant;
  options?: Partial<RenderOptions>;
  children: ReactNode;
}) {
  const value = useMemo<RenderContextValue>(
    () => ({
      hass,
      options: {
        interactive: false,
        loadCustomCards: true,
        ...options,
      },
    }),
    [hass, options],
  );
  return <RenderContext.Provider value={value}>{children}</RenderContext.Provider>;
}

export function useHass(): HomeAssistant {
  const ctx = useContext(RenderContext);
  if (!ctx) throw new Error("useHass must be used inside <LovelaceProvider>");
  return ctx.hass;
}

export function useRenderOptions(): RenderOptions {
  const ctx = useContext(RenderContext);
  if (!ctx) throw new Error("useRenderOptions must be used inside <LovelaceProvider>");
  return ctx.options;
}

export function useEntity(entityId: string | undefined) {
  const hass = useHass();
  return entityId ? hass.states[entityId] : undefined;
}
