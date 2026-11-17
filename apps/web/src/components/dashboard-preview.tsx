"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAppTheme } from "@/lib/use-app-theme";
import { createMockHass, parseLovelaceYaml, type LovelaceConfig } from "@ha-studio/lovelace";
import { DashboardRenderer } from "@ha-studio/lovelace-render";

export interface DashboardPreviewProps {
  /** Either a parsed config or raw YAML. */
  config?: LovelaceConfig | null;
  yaml?: string | null;
  /** Logical width the dashboard is laid out at before scaling down. */
  renderWidth?: number;
  /** Height of the visible frame. */
  height?: number;
  viewIndex?: number;
  loadCustomCards?: boolean;
  showTabs?: boolean;
  className?: string;
  /** Fades the bottom edge so clipped content does not look broken. */
  fade?: boolean;
  theme?: "light" | "dark";
}

/**
 * Renders a dashboard at a fixed logical width and scales it to fit the
 * available space — the same trick the Home Assistant frontend's own gallery
 * uses for card thumbnails, and far more informative than a screenshot.
 */
export function DashboardPreview({
  config,
  yaml,
  renderWidth = 1280,
  height = 260,
  viewIndex = 0,
  loadCustomCards = true,
  showTabs = false,
  className,
  fade = true,
  theme,
}: DashboardPreviewProps) {
  const appTheme = useAppTheme();
  const activeTheme = theme ?? appTheme;
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.4);

  const resolved = useMemo<LovelaceConfig | null>(() => {
    if (config) return config;
    if (!yaml) return null;
    return parseLovelaceYaml(yaml).config;
  }, [config, yaml]);

  const hass = useMemo(() => createMockHass({ darkMode: activeTheme === "dark" }), [activeTheme]);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / renderWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [renderWidth]);

  if (!resolved) {
    return (
      <div
        className={`hs-preview-frame hs-grid-bg grid place-items-center text-[13px] text-faint ${className ?? ""}`}
        style={{ height }}
      >
        Preview unavailable
      </div>
    );
  }

  return (
    <div
      ref={frameRef}
      className={`hs-preview-frame ${className ?? ""}`}
      style={{ height }}
      data-testid="dashboard-preview"
      aria-hidden
    >
      <div
        className="hs-preview-frame__inner"
        style={{ transform: `scale(${scale})`, width: renderWidth, height: height / scale }}
      >
        <DashboardRenderer
          config={resolved}
          hass={hass}
          theme={activeTheme}
          viewIndex={viewIndex}
          showTabs={showTabs}
          options={{ interactive: false, loadCustomCards }}
        />
      </div>
      {fade ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
          style={{
            background: `linear-gradient(to top, ${activeTheme === "dark" ? "#111111" : "#fafafa"}, transparent)`,
          }}
        />
      ) : null}
    </div>
  );
}
