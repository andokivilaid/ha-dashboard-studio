"use client";

import type { CSSProperties, ReactNode } from "react";
import { Icon } from "../Icon";

export function HaCard({
  header,
  children,
  className,
  style,
  onClick,
}: {
  header?: ReactNode;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div
      className={`ha-card${onClick ? " ha-card--clickable" : ""}${className ? ` ${className}` : ""}`}
      style={style}
      onClick={onClick}
    >
      {header ? <div className="ha-card__header">{header}</div> : null}
      {children}
    </div>
  );
}

/**
 * Shown for a card type this renderer does not implement, or a `custom:` card
 * whose HACS bundle is not in the registry. It still communicates what the
 * original dashboard intended rather than collapsing to an error.
 */
export function FallbackCard({
  type,
  reason,
  entity,
  icon = "mdi:card-outline",
}: {
  type: string;
  reason?: string;
  entity?: string;
  icon?: string;
}) {
  return (
    <HaCard className="hui-fallback" >
      <div className="hui-fallback-card">
        <Icon icon={icon} size={24} className="hui-fallback-card__icon" />
        <div>
          <div className="hui-fallback-card__title">{type}</div>
          {entity ? <div className="hui-fallback-card__sub">{entity}</div> : null}
          <div className="hui-fallback-card__pill">{reason ?? "Preview not available"}</div>
        </div>
      </div>
    </HaCard>
  );
}

export function ErrorCard({ message, config }: { message: string; config?: unknown }) {
  return (
    <div className="hui-error-card">
      <strong>{message}</strong>
      {config ? (
        <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap", fontSize: 11 }}>
          {JSON.stringify(config, null, 2).slice(0, 400)}
        </pre>
      ) : null}
    </div>
  );
}
