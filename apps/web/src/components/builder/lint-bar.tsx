"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Info, XCircle } from "lucide-react";
import type { LintIssue } from "@ha-studio/lovelace";

const ICONS = {
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

const COLOURS = {
  error: "var(--danger)",
  warning: "var(--accent)",
  info: "var(--ink-3)",
} as const;

/**
 * Configuration problems a screenshot cannot show: a Bubble Card pop-up that
 * will never open, a card the instance has not installed, an entity id that
 * does not exist.
 */
export function LintBar({ issues }: { issues: LintIssue[] }) {
  const [open, setOpen] = useState(false);
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const shown = open ? issues : [...errors, ...warnings];

  if (!issues.length) {
    return (
      <div className="flex items-center gap-2 border-t px-3 py-1.5 text-[12px] text-muted" data-testid="lint-bar">
        <CheckCircle2 size={13} aria-hidden style={{ color: "var(--ok)" }} />
        No configuration problems
      </div>
    );
  }

  return (
    <div className="border-t" data-testid="lint-bar">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px]"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {errors.length ? (
          <XCircle size={13} aria-hidden style={{ color: "var(--danger)" }} />
        ) : (
          <AlertTriangle size={13} aria-hidden style={{ color: "var(--accent)" }} />
        )}
        <span style={{ color: errors.length ? "var(--danger)" : "var(--accent)" }}>
          {errors.length ? `${errors.length} error${errors.length > 1 ? "s" : ""}` : ""}
          {errors.length && warnings.length ? ", " : ""}
          {warnings.length ? `${warnings.length} warning${warnings.length > 1 ? "s" : ""}` : ""}
          {!errors.length && !warnings.length ? `${issues.length} suggestion(s)` : ""}
        </span>
        <ChevronDown
          size={13}
          aria-hidden
          className="ml-auto"
          style={{ transform: open ? "rotate(180deg)" : undefined }}
        />
      </button>
      {shown.length ? (
        <ul className="max-h-36 overflow-y-auto px-3 pb-2 text-[12px] leading-relaxed">
          {shown.map((issue, i) => {
            const Icon = ICONS[issue.severity];
            return (
              <li key={`${issue.rule}-${i}`} className="flex gap-2 py-0.5">
                <Icon size={12} aria-hidden style={{ color: COLOURS[issue.severity], marginTop: 3, flexShrink: 0 }} />
                <span className="text-muted">
                  {issue.where ? <span className="text-faint">{issue.where} — </span> : null}
                  {issue.message}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
