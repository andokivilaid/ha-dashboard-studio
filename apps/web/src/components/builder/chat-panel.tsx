"use client";

import { useEffect, useRef } from "react";
import { ArrowUp, Camera, Eye, Loader2, Settings2, Sparkles, Undo2 } from "lucide-react";

export type ChatRole = "user" | "assistant" | "critic" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** Screenshot the critic looked at. */
  image?: string;
  /** YAML this message produced, for one-click revert. */
  yamlSnapshot?: string;
  pending?: boolean;
  error?: boolean;
}

const SUGGESTIONS = [
  "Build a phone-first home view with the lights, climate and front door",
  "Add an energy view with a power gauge and a 24-hour graph",
  "Reorganise this by room, one section per area",
  "Make it Mushroom-based and more compact",
];

export function ChatPanel({
  messages,
  input,
  onInput,
  onSubmit,
  onRevert,
  onOpenSettings,
  busy,
  phase,
  hasKey,
  providerLabel,
}: {
  messages: ChatMessage[];
  input: string;
  onInput: (v: string) => void;
  onSubmit: (text: string) => void;
  onRevert: (yaml: string) => void;
  onOpenSettings: () => void;
  busy: boolean;
  phase: string | null;
  hasKey: boolean;
  providerLabel: string;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, phase]);

  const send = () => {
    const text = input.trim();
    if (!text || busy) return;
    onSubmit(text);
  };

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="chat-panel">
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2.5">
        <Sparkles size={15} aria-hidden style={{ color: "var(--brand)" }} />
        <span className="text-[13px] font-semibold">AI builder</span>
        <span className="hs-tag ml-1">{providerLabel}</span>
        <button
          type="button"
          className="hs-btn hs-btn--ghost hs-btn--sm ml-auto"
          onClick={onOpenSettings}
          aria-label="AI settings"
        >
          <Settings2 size={15} aria-hidden />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <div className="space-y-3 pt-2">
            <p className="text-[13px] leading-relaxed text-muted">
              Describe the dashboard you want. The model sees your entity inventory (diagnostics,
              config entities and unavailable entities are filtered out), writes the YAML, and —
              when the visual self-check is on — looks at a screenshot of its own render before
              answering.
            </p>
            <div className="space-y-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="hs-card hs-card--hover w-full p-2.5 text-left text-[12.5px] leading-snug"
                  onClick={() => onSubmit(s)}
                  disabled={busy}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m) => (
          <Message key={m.id} message={m} onRevert={onRevert} />
        ))}

        {phase ? (
          <div className="flex items-center gap-2 px-1 text-[12.5px] text-muted" aria-live="polite">
            <Loader2 size={14} className="animate-spin" aria-hidden />
            {phase}
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="shrink-0 border-t p-3">
        {!hasKey ? (
          <button
            type="button"
            className="hs-btn w-full"
            onClick={onOpenSettings}
            style={{ borderColor: "var(--brand)", color: "var(--brand)" }}
          >
            Add an API key to start
          </button>
        ) : (
          <div className="relative">
            <textarea
              className="hs-input pr-11 text-[13px]"
              rows={3}
              placeholder="Describe a dashboard, or ask for a change…"
              value={input}
              onChange={(e) => onInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
                  e.preventDefault();
                  send();
                }
              }}
              disabled={busy}
              data-testid="chat-input"
            />
            <button
              type="button"
              className="hs-btn hs-btn--primary absolute bottom-2 right-2 h-8 w-8 p-0"
              onClick={send}
              disabled={busy || !input.trim()}
              aria-label="Send"
              data-testid="chat-send"
            >
              {busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <ArrowUp size={15} aria-hidden />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Message({ message, onRevert }: { message: ChatMessage; onRevert: (yaml: string) => void }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[88%] rounded-[12px] px-3 py-2 text-[13px] leading-relaxed"
          style={{ background: "var(--brand-soft)", color: "var(--ink)" }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  if (message.role === "system") {
    return (
      <p
        className="px-1 text-[12px]"
        style={{ color: message.error ? "var(--danger)" : "var(--ink-3)" }}
        role={message.error ? "alert" : undefined}
      >
        {message.content}
      </p>
    );
  }

  const isCritic = message.role === "critic";
  return (
    <div className="hs-card p-3" data-testid={isCritic ? "critic-message" : "assistant-message"}>
      <div className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-faint">
        {isCritic ? <Eye size={12} aria-hidden /> : <Sparkles size={12} aria-hidden />}
        {isCritic ? "Visual review" : "Assistant"}
      </div>
      {message.image ? (
        <figure className="mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={message.image}
            alt="Screenshot the reviewer looked at"
            className="w-full rounded-[8px] border"
          />
          <figcaption className="mt-1 flex items-center gap-1 text-[11px] text-faint">
            <Camera size={10} aria-hidden /> what the model saw
          </figcaption>
        </figure>
      ) : null}
      <div className="hs-prose text-[13px] leading-relaxed whitespace-pre-wrap">{message.content}</div>
      {message.yamlSnapshot ? (
        <button
          type="button"
          className="hs-btn hs-btn--sm mt-2"
          onClick={() => onRevert(message.yamlSnapshot!)}
        >
          <Undo2 size={12} aria-hidden /> Revert to this version
        </button>
      ) : null}
    </div>
  );
}
