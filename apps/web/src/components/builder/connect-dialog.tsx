"use client";

import { useState } from "react";
import { Loader2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { clearCredentials, loadCredentials, saveCredentials, type HaCredentials } from "@/lib/ha-connection";

export function ConnectDialog({
  open,
  onClose,
  onConnect,
  connected,
  onDisconnect,
}: {
  open: boolean;
  onClose: () => void;
  onConnect: (creds: HaCredentials) => Promise<void>;
  connected: boolean;
  onDisconnect: () => void;
}) {
  const existing = typeof window !== "undefined" ? loadCredentials() : null;
  const [url, setUrl] = useState(existing?.url ?? "http://homeassistant.local:8123");
  const [token, setToken] = useState(existing?.token ?? "");
  const [remember, setRemember] = useState(Boolean(existing));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const creds = { url: url.trim().replace(/\/+$/, ""), token: token.trim() };
      await onConnect(creds);
      if (remember) saveCredentials(creds);
      else clearCredentials();
      toast.success("Connected — read-only");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Connect to Home Assistant"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="hs-card w-full max-w-lg" style={{ boxShadow: "var(--shadow-lg)" }}>
        <header className="flex items-center gap-2 border-b px-5 py-3.5">
          <ShieldCheck size={17} aria-hidden style={{ color: "var(--ok)" }} />
          <h2 className="text-[15px] font-semibold">Connect to Home Assistant</h2>
          <button type="button" className="hs-btn hs-btn--ghost hs-btn--sm ml-auto" onClick={onClose} aria-label="Close">
            <X size={15} aria-hidden />
          </button>
        </header>

        <form onSubmit={submit} className="space-y-4 p-5">
          <p className="text-[13px] leading-relaxed text-muted">
            The studio connects straight from <strong>your browser</strong> to your instance over
            the websocket API and only ever reads. It requests states, the entity/device/area/floor
            registries and your Lovelace configs. It never calls a service and never saves. The
            token is stored in this browser only.
          </p>

          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-medium">Instance URL</span>
            <input
              className="hs-input font-mono text-[13px]"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://ha.example.com"
              required
              autoComplete="off"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-medium">Long-lived access token</span>
            <textarea
              className="hs-input font-mono text-[12px]"
              rows={3}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="eyJhbGciOi…"
              required
            />
            <span className="mt-1 block text-[11.5px] text-faint">
              Profile → Security → Long-lived access tokens → Create token
            </span>
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="accent-[var(--brand)]"
            />
            Remember in this browser
          </label>

          {error ? (
            <div
              className="rounded-[10px] border p-3 text-[12.5px]"
              style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
            >
              <strong>Could not connect.</strong> {error}
              <p className="mt-1.5 text-muted">
                A browser connection usually fails because of CORS. Add this origin to{" "}
                <code>cors_allowed_origins</code> in your <code>configuration.yaml</code> — see{" "}
                <a className="underline" href="/docs/connect" target="_blank" rel="noreferrer">
                  the setup guide
                </a>
                .
              </p>
            </div>
          ) : null}

          <div className="flex gap-2">
            <button type="submit" className="hs-btn hs-btn--primary" disabled={busy}>
              {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
              {busy ? "Connecting…" : "Connect read-only"}
            </button>
            {connected ? (
              <button
                type="button"
                className="hs-btn"
                onClick={() => {
                  onDisconnect();
                  clearCredentials();
                  onClose();
                }}
              >
                Disconnect
              </button>
            ) : null}
            <a className="hs-btn hs-btn--ghost ml-auto" href="/docs/connect" target="_blank" rel="noreferrer">
              Setup guide
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
