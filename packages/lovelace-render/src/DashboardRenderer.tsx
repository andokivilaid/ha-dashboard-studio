"use client";

import { useEffect, useMemo, useState } from "react";
import {
  analyzeDashboard,
  synthesizeMissingEntities,
  synthesizeRegistryEntries,
  type HomeAssistant,
  type LovelaceConfig,
} from "@ha-studio/lovelace";
import { Icon } from "./Icon";
import { LovelaceProvider, type CardPath, type RenderOptions } from "./context";
import { ViewRenderer } from "./ViewRenderer";
import { loadBundlesForCards } from "./resources";

export interface DashboardRendererProps {
  config: LovelaceConfig;
  hass: HomeAssistant;
  theme?: "light" | "dark";
  /** Index of the view to show; omit to render the tab bar and manage it internally. */
  viewIndex?: number;
  onViewChange?: (index: number) => void;
  showTabs?: boolean;
  options?: Partial<RenderOptions>;
  onCardSelect?: (path: CardPath) => void;
  selectedPath?: CardPath | null;
  className?: string;
  /** Fixed viewport width in px — used by the device-frame preview. */
  width?: number;
  /**
   * Invent plausible state for entities the config names but `hass` lacks.
   * On by default for the mock home, because a dashboard harvested from
   * someone else's instance references entity ids that exist nowhere here and
   * would otherwise render as a wall of "Unavailable". Never applied to a real
   * connection.
   */
  synthesizeEntities?: boolean;
  onSynthesized?: (ids: string[]) => void;
}

export function DashboardRenderer({
  config,
  hass,
  theme = "light",
  viewIndex,
  onViewChange,
  showTabs = true,
  options,
  onCardSelect,
  selectedPath,
  className,
  width,
  synthesizeEntities,
  onSynthesized,
}: DashboardRendererProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const activeIndex = viewIndex ?? internalIndex;
  const views = Array.isArray(config?.views) ? config.views : [];
  const view = views[Math.min(activeIndex, Math.max(views.length - 1, 0))];

  const analysis = useMemo(() => (config ? analyzeDashboard(config) : null), [config]);

  const allowSynthesis = synthesizeEntities ?? Boolean(hass.isMock);
  const { hass: effectiveHass, synthesized } = useMemo(() => {
    if (!allowSynthesis || !config) return { hass, synthesized: [] as string[] };
    const result = synthesizeMissingEntities(hass, config);
    if (!result.synthesized.length) return { hass, synthesized: [] as string[] };
    return {
      hass: {
        ...hass,
        states: { ...hass.states, ...result.states },
        entities: {
          ...hass.entities,
          ...(synthesizeRegistryEntries(result.synthesized) as typeof hass.entities),
        },
      },
      synthesized: result.synthesized,
    };
  }, [hass, config, allowSynthesis]);

  useEffect(() => {
    if (synthesized.length) onSynthesized?.(synthesized);
  }, [synthesized, onSynthesized]);

  useEffect(() => {
    if (!analysis?.customCards.length) return;
    if (options?.loadCustomCards === false) return;
    void loadBundlesForCards(analysis.customCards);
  }, [analysis, options?.loadCustomCards]);

  const renderOptions = useMemo<Partial<RenderOptions>>(
    () => ({ ...options, onCardSelect, selectedPath }),
    [options, onCardSelect, selectedPath],
  );

  const select = (i: number) => {
    if (onViewChange) onViewChange(i);
    else setInternalIndex(i);
  };

  if (!views.length) {
    return (
      <div className="ha-render-root" data-theme={theme} style={{ padding: 32, textAlign: "center" }}>
        <p style={{ color: "var(--secondary-text-color)" }}>This dashboard has no views.</p>
      </div>
    );
  }

  return (
    <div
      className={`ha-render-root${className ? ` ${className}` : ""}`}
      data-theme={theme}
      data-testid="dashboard-render-root"
      style={width ? { width, maxWidth: "100%" } : undefined}
    >
      {showTabs && views.length > 1 ? (
        <div className="hui-tabs" role="tablist">
          {views.map((v, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              className="hui-tab"
              data-active={i === activeIndex}
              onClick={() => select(i)}
              title={v.title ?? `View ${i + 1}`}
            >
              {v.icon ? <Icon icon={v.icon} size={22} /> : <span>{v.title ?? `View ${i + 1}`}</span>}
            </button>
          ))}
        </div>
      ) : null}
      <LovelaceProvider hass={effectiveHass} options={renderOptions}>
        {view ? <ViewRenderer view={view} viewIndex={activeIndex} /> : null}
      </LovelaceProvider>
    </div>
  );
}
