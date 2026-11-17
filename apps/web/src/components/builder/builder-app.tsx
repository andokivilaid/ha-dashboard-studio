"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppTheme } from "@/lib/use-app-theme";
import {
  Check,
  Code2,
  Copy,
  Download,
  Database,
  Loader2,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  Smartphone,
  Tablet,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import {
  availableCustomCards,
  buildEntityInventory,
  createMockHass,
  formatLintForModel,
  lintDashboard,
  parseLovelaceYaml,
  starterById,
  STARTER_TEMPLATES,
  toLovelaceYaml,
  type HomeAssistant,
  type LintIssue,
  type LovelaceConfig,
} from "@ha-studio/lovelace";
import { DashboardRenderer, type CardPath } from "@ha-studio/lovelace-render";
import { YamlEditor } from "./yaml-editor";
import { LintBar } from "./lint-bar";
import { ChatPanel, type ChatMessage } from "./chat-panel";
import { ConnectDialog } from "./connect-dialog";
import { SettingsDialog } from "./settings-dialog";
import {
  activeKey,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type BuilderSettings,
} from "@/lib/builder-settings";
import { PROVIDER_LABELS } from "@/lib/ai/types";
import { buildAreaBlock, buildAvailableCardsBlock, buildInventoryBlock } from "@/lib/ai/prompts";
import { captureElement, dataUrlBytes } from "@/lib/screenshot";
import {
  connectToHomeAssistant,
  fetchLovelaceConfig,
  loadCredentials,
  type HaCredentials,
  type HaDashboardSummary,
  type LiveHaSession,
} from "@/lib/ha-connection";

const DEVICES = [
  { id: "desktop", label: "Desktop", width: 1280, icon: Monitor },
  { id: "tablet", label: "Tablet", width: 834, icon: Tablet },
  { id: "phone", label: "Phone", width: 414, icon: Smartphone },
] as const;
type DeviceId = (typeof DEVICES)[number]["id"];

let messageSeq = 0;
const nextId = () => `m${++messageSeq}`;

export function BuilderApp({
  initialYaml,
  initialTitle,
}: {
  initialYaml: string;
  initialTitle?: string;
}) {
  const theme = useAppTheme();

  const [yaml, setYaml] = useState(initialYaml);
  const [device, setDevice] = useState<DeviceId>("desktop");
  const [viewIndex, setViewIndex] = useState(0);
  const [showEditor, setShowEditor] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [selected, setSelected] = useState<CardPath | null>(null);
  const [copied, setCopied] = useState(false);

  const [settings, setSettings] = useState<BuilderSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);

  const [session, setSession] = useState<LiveHaSession | null>(null);
  const [liveStates, setLiveStates] = useState(0);
  const [haDashboards, setHaDashboards] = useState<HaDashboardSummary[]>([]);
  const [importedFrom, setImportedFrom] = useState<{ title: string; hash: string | null } | null>(
    null,
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<string | null>(null);
  const busy = phase !== null;

  const renderRef = useRef<HTMLDivElement | null>(null);
  /** Lint failures from the previous turn, handed back on the next request. */
  const lintFeedbackRef = useRef<string | null>(null);

  useEffect(() => setSettings(loadSettings()), []);
  useEffect(() => {
    const creds = loadCredentials();
    if (creds) void connect(creds).catch(() => undefined);
    return () => session?.close();
    // Intentionally runs once: reconnecting on every render would thrash the socket.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mockHass = useMemo(() => createMockHass({ darkMode: theme === "dark" }), [theme]);
  const hass: HomeAssistant = session?.hass ?? mockHass;
  void liveStates; // re-render trigger for live state pushes

  const parsed = useMemo(() => parseLovelaceYaml(yaml), [yaml]);
  const config: LovelaceConfig | null = parsed.config;
  const width = DEVICES.find((d) => d.id === device)!.width;

  const inventory = useMemo(() => buildEntityInventory(hass), [hass]);

  // In live mode the vocabulary is whatever HACS actually registered on the
  // instance; in mock mode it is everything the renderer can execute.
  const customCardVocabulary = useMemo(
    () => availableCustomCards(session ? session.resources : null),
    [session],
  );

  const lint = useMemo<LintIssue[]>(() => {
    if (!config) return [];
    return lintDashboard(config, {
      knownEntities: new Set(Object.keys(hass.states)),
      availableCustomCards: customCardVocabulary,
    });
  }, [config, hass, customCardVocabulary]);
  const areaBlock = useMemo(() => {
    const counts = new Map<string, number>();
    for (const reg of Object.values(hass.entities)) {
      if (!reg.area_id) continue;
      counts.set(reg.area_id, (counts.get(reg.area_id) ?? 0) + 1);
    }
    return buildAreaBlock(
      Object.values(hass.areas).map((a) => ({
        name: a.name,
        floor: a.floor_id ? hass.floors[a.floor_id]?.name : undefined,
        entityCount: counts.get(a.area_id) ?? 0,
      })),
    );
  }, [hass]);

  /* -------------------------- Home Assistant --------------------------- */

  const connect = useCallback(async (creds: HaCredentials) => {
    const next = await connectToHomeAssistant(creds, {
      onStates: () => setLiveStates((n) => n + 1),
      darkMode: document.documentElement.classList.contains("dark"),
    });
    setSession(next);
    setHaDashboards(next.dashboards);
    return undefined;
  }, []);

  const disconnect = useCallback(() => {
    session?.close();
    setSession(null);
    setHaDashboards([]);
    toast("Disconnected from Home Assistant");
  }, [session]);

  const importDashboard = useCallback(
    async (urlPath: string | null) => {
      if (!session) return;
      try {
        setPhase("Fetching your dashboard…");
        const { config: cfg, hash } = await fetchLovelaceConfig(session.connection, urlPath);
        setYaml(toLovelaceYaml(cfg));
        setViewIndex(0);
        setImportedFrom({
          title: haDashboards.find((d) => (d.url_path ?? "") === (urlPath ?? ""))?.title ?? "Default",
          hash,
        });
        toast.success("Imported a copy — your instance is untouched");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Import failed");
      } finally {
        setPhase(null);
      }
    },
    [session],
  );

  /* ------------------------------- AI ---------------------------------- */

  const pushMessage = (m: Omit<ChatMessage, "id">) => {
    const message = { ...m, id: nextId() };
    setMessages((prev) => [...prev, message]);
    return message.id;
  };

  const runGeneration = useCallback(
    async (request: string) => {
      const key = activeKey(settings);
      if (!key) {
        setSettingsOpen(true);
        return;
      }
      setInput("");
      pushMessage({ role: "user", content: request });
      const pendingLint = lintFeedbackRef.current;
      lintFeedbackRef.current = null;

      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-8)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      try {
        setPhase("Writing the dashboard…");
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: settings.provider,
            apiKey: key,
            model: settings.model || undefined,
            request,
            history,
            inventory: buildInventoryBlock(inventory),
            areas: areaBlock,
            availableCards: buildAvailableCardsBlock(customCardVocabulary, {
              live: Boolean(session),
            }),
            currentYaml: yaml.trim() ? yaml : null,
            lint: pendingLint ?? undefined,
          }),
        });
        const data = (await res.json()) as {
          text?: string;
          yaml?: string | null;
          error?: string;
          model?: string;
        };
        if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);

        const nextYaml = data.yaml;
        if (nextYaml) {
          const check = parseLovelaceYaml(nextYaml);
          if (check.config) {
            const problems = lintDashboard(check.config, {
              knownEntities: new Set(Object.keys(hass.states)),
              availableCustomCards: customCardVocabulary,
            }).filter((i) => i.severity === "error");
            if (problems.length) {
              pushMessage({
                role: "system",
                content: `${problems.length} configuration problem(s) found; asking the model to fix them.`,
              });
              lintFeedbackRef.current = formatLintForModel(problems);
            } else {
              lintFeedbackRef.current = null;
            }
          }
          if (!check.config) {
            pushMessage({
              role: "system",
              content: `The model returned YAML that does not parse: ${check.errors[0] ?? "no views key"}. Keeping the previous version.`,
              error: true,
            });
          } else {
            setYaml(nextYaml);
            setViewIndex(0);
          }
        }
        pushMessage({
          role: "assistant",
          content: data.text?.trim() || "Updated the dashboard.",
          yamlSnapshot: nextYaml ?? undefined,
        });

        if (settings.visualSelfCheck && nextYaml) {
          await runVisualCheck(nextYaml, request);
        }
      } catch (err) {
        pushMessage({
          role: "system",
          content: err instanceof Error ? err.message : String(err),
          error: true,
        });
      } finally {
        setPhase(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings, messages, inventory, areaBlock, yaml],
  );

  const runVisualCheck = useCallback(
    async (currentYaml: string, intent?: string) => {
      const key = activeKey(settings);
      if (!key || !renderRef.current) return;
      try {
        setPhase("Rendering and taking a screenshot…");
        // Let React paint the new config, and give HACS bundles a moment.
        await new Promise((r) => setTimeout(r, 900));
        const image = await captureElement(renderRef.current, {
          scale: 1,
          background: theme === "dark" ? "#111111" : "#fafafa",
        });
        if (dataUrlBytes(image) > 4.5 * 1024 * 1024) {
          pushMessage({
            role: "system",
            content: "Screenshot was too large to review; skipped the visual check.",
          });
          return;
        }

        setPhase("Looking at the render…");
        const res = await fetch("/api/ai/critique", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: settings.provider,
            apiKey: key,
            model: settings.model || undefined,
            image,
            yaml: currentYaml,
            intent,
          }),
        });
        const data = (await res.json()) as { text?: string; yaml?: string | null; error?: string };
        if (!res.ok) throw new Error(data.error ?? `Review failed (${res.status})`);

        let applied = false;
        if (data.yaml) {
          const check = parseLovelaceYaml(data.yaml);
          if (check.config) {
            setYaml(data.yaml);
            applied = true;
          }
        }
        pushMessage({
          role: "critic",
          content:
            (data.text?.trim() || "No issues found.") +
            (applied ? "\n\nApplied the corrected YAML." : ""),
          image,
          yamlSnapshot: applied ? (data.yaml ?? undefined) : undefined,
        });
      } catch (err) {
        pushMessage({
          role: "system",
          content: `Visual check skipped: ${err instanceof Error ? err.message : String(err)}`,
          error: true,
        });
      }
    },
    [settings, theme],
  );

  const manualVisualCheck = useCallback(async () => {
    if (busy) return;
    setPhase("Looking at the render…");
    await runVisualCheck(yaml);
    setPhase(null);
  }, [busy, runVisualCheck, yaml]);

  /* ----------------------------- Export -------------------------------- */

  const copyYaml = async () => {
    await navigator.clipboard.writeText(yaml);
    setCopied(true);
    toast.success("YAML copied");
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadYaml = () => {
    const blob = new Blob([yaml], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ui-lovelace.yaml";
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasKey = Boolean(activeKey(settings));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ----------------------------- Toolbar ----------------------------- */}
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <button
          type="button"
          className="hs-btn hs-btn--ghost hs-btn--sm"
          onClick={() => setShowChat((v) => !v)}
          aria-label={showChat ? "Hide chat" : "Show chat"}
          title={showChat ? "Hide chat" : "Show chat"}
        >
          {showChat ? <PanelLeftClose size={15} aria-hidden /> : <PanelLeftOpen size={15} aria-hidden />}
        </button>

        <select
          className="hs-input w-auto"
          aria-label="Start from a template"
          value=""
          onChange={(e) => {
            const t = starterById(e.target.value);
            if (!t) return;
            setYaml(toLovelaceYaml(t.config));
            setViewIndex(0);
            toast(`Loaded "${t.name}"`);
          }}
        >
          <option value="">Template…</option>
          {STARTER_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <div className="flex gap-1 rounded-[10px] border p-1">
          {DEVICES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className="hs-btn hs-btn--ghost hs-btn--sm"
              style={device === id ? { background: "var(--brand-soft)", color: "var(--brand)" } : undefined}
              onClick={() => setDevice(id)}
              aria-label={label}
              title={label}
              data-testid={`device-${id}`}
            >
              <Icon size={15} aria-hidden />
            </button>
          ))}
        </div>

        <button
          type="button"
          className="hs-btn hs-btn--sm"
          onClick={() => setConnectOpen(true)}
          data-testid="connect-button"
        >
          {session ? (
            <>
              <Wifi size={14} aria-hidden style={{ color: "var(--ok)" }} /> Live (read-only)
            </>
          ) : (
            <>
              <Database size={14} aria-hidden /> Mock data
            </>
          )}
        </button>

        {importedFrom ? (
          <span
            className="hs-tag"
            title={
              importedFrom.hash
                ? `Config hash at import: ${importedFrom.hash}. The studio never writes back.`
                : "Copied at import time. The studio never writes back."
            }
            data-testid="imported-from"
          >
            copy of “{importedFrom.title}”
          </span>
        ) : null}

        {session && haDashboards.length ? (
          <select
            className="hs-input w-auto"
            aria-label="Import one of your dashboards"
            value=""
            onChange={(e) => void importDashboard(e.target.value || null)}
          >
            <option value="">Import your dashboard…</option>
            <option value="">Default (lovelace)</option>
            {haDashboards.map((d) => (
              <option key={d.id ?? d.url_path ?? d.title} value={d.url_path ?? ""}>
                {d.title}
              </option>
            ))}
          </select>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="hs-btn hs-btn--sm"
            onClick={manualVisualCheck}
            disabled={busy || !hasKey}
            title="Screenshot the render and have the model review it"
          >
            {busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null}
            Visual check
          </button>
          <button
            type="button"
            className="hs-btn hs-btn--ghost hs-btn--sm"
            onClick={() => setShowEditor((v) => !v)}
            aria-label={showEditor ? "Hide YAML" : "Show YAML"}
          >
            <Code2 size={15} aria-hidden />
          </button>
          <button type="button" className="hs-btn hs-btn--sm" onClick={copyYaml} data-testid="copy-yaml">
            {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} Copy
          </button>
          <button type="button" className="hs-btn hs-btn--sm" onClick={downloadYaml}>
            <Download size={14} aria-hidden /> YAML
          </button>
        </div>
      </div>

      {/* ------------------------------ Panes ------------------------------ */}
      <div className="grid min-h-0 flex-1 lg:grid-cols-[var(--chat)_minmax(0,1fr)]"
        style={{ ["--chat" as string]: showChat ? "380px" : "0px" } as never}
      >
        {showChat ? (
          <aside className="min-h-0 border-b lg:border-b-0 lg:border-r" style={{ height: "calc(100vh - 7.5rem)" }}>
            <ChatPanel
              messages={messages}
              input={input}
              onInput={setInput}
              onSubmit={runGeneration}
              onRevert={(y) => {
                setYaml(y);
                toast("Reverted");
              }}
              onOpenSettings={() => setSettingsOpen(true)}
              busy={busy}
              phase={phase}
              hasKey={hasKey}
              providerLabel={PROVIDER_LABELS[settings.provider].split(" ")[0]}
            />
          </aside>
        ) : null}

        <div
          className="grid min-h-0 grid-rows-[minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)_var(--editor)]"
          style={{ ["--editor" as string]: showEditor ? "min(38vh, 360px)" : "0px", height: "calc(100vh - 7.5rem)" } as never}
        >
          <section
            className="min-h-0 overflow-auto"
            style={{ background: theme === "dark" ? "#111111" : "#fafafa" }}
            data-testid="preview-pane"
          >
            {config ? (
              <div style={{ width, maxWidth: "100%", margin: "0 auto" }} ref={renderRef}>
                <DashboardRenderer
                  config={config}
                  hass={hass}
                  theme={theme}
                  viewIndex={viewIndex}
                  onViewChange={setViewIndex}
                  showTabs
                  width={width}
                  selectedPath={selected}
                  onCardSelect={setSelected}
                  options={{ interactive: true, loadCustomCards: settings.loadCustomCards }}
                />
              </div>
            ) : (
              <div className="grid h-full place-items-center p-8 text-center">
                <div>
                  <p className="text-[14px] font-medium">Nothing to render</p>
                  <p className="mt-1 text-[13px] text-muted">
                    {parsed.errors[0] ?? "Add a `views:` key to the YAML, or pick a template."}
                  </p>
                </div>
              </div>
            )}
          </section>

          {showEditor ? (
            <section className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] border-t">
              <YamlEditor value={yaml} onChange={setYaml} />
              <LintBar issues={lint} />
            </section>
          ) : null}
        </div>
      </div>

      <ConnectDialog
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        onConnect={connect}
        connected={Boolean(session)}
        onDisconnect={disconnect}
      />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={(next) => {
          setSettings(next);
          saveSettings(next);
          toast.success("Settings saved in this browser");
        }}
      />

      <span className="sr-only" aria-live="polite" data-testid="data-source-status">
        {session ? "Connected to Home Assistant, read-only" : "Using mock demo entities"}
        {initialTitle ? ` — editing ${initialTitle}` : ""}
      </span>
    </div>
  );
}
