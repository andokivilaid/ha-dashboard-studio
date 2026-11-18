"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A drag handle that resizes the pane next to it.
 *
 * - `vertical` sits on a column edge and changes a width; `horizontal` sits on
 *   a row edge and changes a height.
 * - `invert` flips the drag direction (an editor docked at the bottom grows
 *   when the handle moves *up*).
 * - Keyboard: arrows nudge by 16px (64px with Shift), Home/End jump to the
 *   limits, Enter or a double-click restores the default.
 *
 * Pointer capture keeps the drag alive while the cursor crosses custom-card
 * shadow roots that would otherwise swallow `pointermove`.
 */
export function Splitter({
  orientation,
  value,
  min,
  max,
  defaultValue,
  onChange,
  invert = false,
  label,
  className = "",
  testId,
}: {
  orientation: "vertical" | "horizontal";
  value: number;
  min: number;
  /** A number, or a function evaluated at drag start (for container-relative limits). */
  max: number | (() => number);
  defaultValue: number;
  onChange: (next: number) => void;
  invert?: boolean;
  label: string;
  className?: string;
  testId?: string;
}) {
  const drag = useRef<{ start: number; origin: number; max: number } | null>(null);
  const [active, setActive] = useState(false);
  // A function `max` may read layout (window, refs), so it is only evaluated
  // after mount; the server renders the static fallback.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const resolveMax = useCallback(() => (typeof max === "function" ? max() : max), [max]);
  const clamp = useCallback(
    (v: number, hi = resolveMax()) => Math.round(Math.min(Math.max(v, min), Math.max(min, hi))),
    [min, resolveMax],
  );

  const coord = (e: PointerEvent | React.PointerEvent) =>
    orientation === "vertical" ? e.clientX : e.clientY;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { start: coord(e), origin: value, max: resolveMax() };
    setActive(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const delta = (coord(e) - d.start) * (invert ? -1 : 1);
    onChange(clamp(d.origin + delta, d.max));
  };

  const end = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;
    setActive(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  // While dragging, keep the resize cursor everywhere and stop text selection.
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const prev = { cursor: root.style.cursor, select: root.style.userSelect };
    root.style.cursor = orientation === "vertical" ? "col-resize" : "row-resize";
    root.style.userSelect = "none";
    return () => {
      root.style.cursor = prev.cursor;
      root.style.userSelect = prev.select;
    };
  }, [active, orientation]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 64 : 16;
    const grow = orientation === "vertical" ? "ArrowRight" : invert ? "ArrowUp" : "ArrowDown";
    const shrink = orientation === "vertical" ? "ArrowLeft" : invert ? "ArrowDown" : "ArrowUp";
    let next: number | null = null;
    if (e.key === grow) next = value + step;
    else if (e.key === shrink) next = value - step;
    else if (e.key === "Home") next = min;
    else if (e.key === "End") next = resolveMax();
    else if (e.key === "Enter") next = defaultValue;
    if (next === null) return;
    e.preventDefault();
    onChange(clamp(next));
  };

  const vertical = orientation === "vertical";
  return (
    <div
      role="separator"
      aria-orientation={vertical ? "vertical" : "horizontal"}
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={typeof max === "number" ? max : mounted ? Math.round(resolveMax()) : undefined}
      tabIndex={0}
      title={`${label} — drag to resize, double-click to reset`}
      data-testid={testId}
      data-active={active || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onDoubleClick={() => onChange(clamp(defaultValue))}
      onKeyDown={onKeyDown}
      className={`hs-splitter ${vertical ? "hs-splitter--v" : "hs-splitter--h"} ${className}`}
    />
  );
}

/** A number persisted per browser; falls back silently when storage is unavailable. */
export function usePersistedSize(key: string, fallback: number): [number, (n: number) => void] {
  const [size, setSize] = useState(fallback);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      const n = raw === null ? NaN : Number(raw);
      if (Number.isFinite(n) && n > 0) setSize(n);
    } catch {
      /* storage blocked */
    }
  }, [key]);
  const update = useCallback(
    (n: number) => {
      setSize(n);
      try {
        window.localStorage.setItem(key, String(n));
      } catch {
        /* storage blocked */
      }
    },
    [key],
  );
  return [size, update];
}
