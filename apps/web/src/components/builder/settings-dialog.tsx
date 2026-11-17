"use client";

import { useState } from "react";
import { ExternalLink, KeyRound, X } from "lucide-react";
import {
  DEFAULT_MODELS,
  PROVIDER_KEY_HELP,
  PROVIDER_LABELS,
  type ProviderId,
} from "@/lib/ai/types";
import type { BuilderSettings } from "@/lib/builder-settings";

export function SettingsDialog({
  open,
  onClose,
  settings,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  settings: BuilderSettings;
  onChange: (next: BuilderSettings) => void;
}) {
  const [local, setLocal] = useState(settings);
  if (!open) return null;

  const help = PROVIDER_KEY_HELP[local.provider];
  const set = <K extends keyof BuilderSettings>(key: K, value: BuilderSettings[K]) =>
    setLocal((s) => ({ ...s, [key]: value }));

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Builder settings"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="hs-card w-full max-w-lg" style={{ boxShadow: "var(--shadow-lg)" }}>
        <header className="flex items-center gap-2 border-b px-5 py-3.5">
          <KeyRound size={16} aria-hidden style={{ color: "var(--brand)" }} />
          <h2 className="text-[15px] font-semibold">AI settings</h2>
          <button type="button" className="hs-btn hs-btn--ghost hs-btn--sm ml-auto" onClick={onClose} aria-label="Close">
            <X size={15} aria-hidden />
          </button>
        </header>

        <div className="space-y-4 p-5">
          <p className="text-[13px] leading-relaxed text-muted">
            Bring your own key. It is stored in this browser and forwarded to the provider through
            this app&apos;s API route for one request at a time — never logged, never stored on the
            server.
          </p>

          <div>
            <span className="mb-1.5 block text-[12.5px] font-medium">Provider</span>
            <div className="flex gap-2">
              {(Object.keys(PROVIDER_LABELS) as ProviderId[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  className="hs-btn flex-1"
                  style={
                    local.provider === p
                      ? { background: "var(--brand-soft)", borderColor: "var(--brand)", color: "var(--brand)" }
                      : undefined
                  }
                  onClick={() => set("provider", p)}
                >
                  {PROVIDER_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-medium">
              {PROVIDER_LABELS[local.provider]} API key
            </span>
            <input
              className="hs-input font-mono text-[12.5px]"
              type="password"
              autoComplete="off"
              placeholder={`${help.prefix}…`}
              value={local.provider === "anthropic" ? local.anthropicKey : local.geminiKey}
              onChange={(e) =>
                local.provider === "anthropic"
                  ? set("anthropicKey", e.target.value)
                  : set("geminiKey", e.target.value)
              }
            />
            <a
              className="mt-1 inline-flex items-center gap-1 text-[11.5px] underline"
              href={help.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              Get a key <ExternalLink size={10} aria-hidden />
            </a>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-medium">Model (optional)</span>
            <input
              className="hs-input font-mono text-[12.5px]"
              placeholder={DEFAULT_MODELS[local.provider].generate}
              value={local.model}
              onChange={(e) => set("model", e.target.value)}
            />
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 text-[13px]">
            <input
              type="checkbox"
              className="mt-0.5 accent-[var(--brand)]"
              checked={local.visualSelfCheck}
              onChange={(e) => set("visualSelfCheck", e.target.checked)}
            />
            <span>
              <strong className="font-medium">Visual self-check</strong>
              <span className="block text-[12px] text-muted">
                After generating, screenshot the render and send it back to a vision model to
                critique and fix layout before presenting. Costs one extra request.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 text-[13px]">
            <input
              type="checkbox"
              className="mt-0.5 accent-[var(--brand)]"
              checked={local.loadCustomCards}
              onChange={(e) => set("loadCustomCards", e.target.checked)}
            />
            <span>
              <strong className="font-medium">Load HACS bundles</strong>
              <span className="block text-[12px] text-muted">
                Execute real Mushroom / Bubble Card / button-card bundles in the preview.
              </span>
            </span>
          </label>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              className="hs-btn hs-btn--primary"
              onClick={() => {
                onChange(local);
                onClose();
              }}
            >
              Save
            </button>
            <button type="button" className="hs-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
