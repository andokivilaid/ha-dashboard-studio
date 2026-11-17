"use client";

import { useEffect, useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { yaml as yamlLang } from "@codemirror/lang-yaml";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import { useAppTheme } from "@/lib/use-app-theme";
import { AlertTriangle, Check } from "lucide-react";
import { parseLovelaceYaml } from "@ha-studio/lovelace";

const lightTheme = EditorView.theme({
  "&": { backgroundColor: "transparent", color: "var(--ink)" },
  ".cm-content": { caretColor: "var(--brand)" },
  ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--brand) 6%, transparent)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent" },
  ".cm-selectionBackground, ::selection": { backgroundColor: "var(--brand-soft) !important" },
});

export function YamlEditor({
  value,
  onChange,
  readOnly = false,
}: {
  value: string;
  onChange: (next: string) => void;
  readOnly?: boolean;
}) {
  const appTheme = useAppTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const status = useMemo(() => {
    if (!value.trim()) return { ok: false, message: "Empty document" };
    const { config, errors } = parseLovelaceYaml(value);
    if (errors.length) return { ok: false, message: errors[0] };
    if (!config) return { ok: false, message: "No `views` key found" };
    const cards = config.views.reduce(
      (acc, v) =>
        acc +
        (v.cards?.length ?? 0) +
        (v.sections ?? []).reduce((a, s) => a + (s.cards?.length ?? 0), 0),
      0,
    );
    return { ok: true, message: `${config.views.length} views · ${cards} cards` };
  }, [value]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">
        {mounted ? (
          <CodeMirror
            value={value}
            height="100%"
            style={{ height: "100%" }}
            theme={appTheme === "dark" ? oneDark : lightTheme}
            extensions={[yamlLang(), EditorView.lineWrapping]}
            editable={!readOnly}
            onChange={onChange}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              highlightActiveLine: true,
              autocompletion: true,
              bracketMatching: true,
            }}
            data-testid="yaml-editor"
          />
        ) : (
          <div className="hui-skeleton h-full w-full" />
        )}
      </div>
      <div
        className="flex shrink-0 items-center gap-2 border-t px-3 py-1.5 text-[12px]"
        data-testid="yaml-status"
        style={{ color: status.ok ? "var(--ink-2)" : "var(--danger)" }}
      >
        {status.ok ? <Check size={13} aria-hidden /> : <AlertTriangle size={13} aria-hidden />}
        <span className="truncate">{status.message}</span>
      </div>
    </div>
  );
}
