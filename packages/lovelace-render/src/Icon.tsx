"use client";

import type { CSSProperties } from "react";

/**
 * Material Design Icons are rendered with the self-hosted MDI webfont rather
 * than inlined SVG paths. `@mdi/js` would add ~2 MB of path strings to the
 * client bundle, and a dashboard from the gallery can reference any of the
 * 7 000+ glyphs — the font covers all of them for ~130 KB (woff2).
 */
export function Icon({
  icon,
  size = 24,
  className,
  style,
  title,
}: {
  icon: string | undefined;
  size?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  const name = normalizeIconName(icon);
  return (
    <span
      className={`mdi mdi-${name}${className ? ` ${className}` : ""}`}
      style={{ fontSize: size, lineHeight: 1, width: size, height: size, display: "inline-block", ...style }}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      data-icon={icon}
    />
  );
}

export function normalizeIconName(icon: string | undefined): string {
  if (!icon) return "bookmark";
  const trimmed = icon.trim();
  const colon = trimmed.indexOf(":");
  const name = colon === -1 ? trimmed : trimmed.slice(colon + 1);
  return name.replace(/[^a-z0-9-]/gi, "") || "bookmark";
}
