"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CodeBlock({
  code,
  language = "yaml",
  maxHeight = 480,
}: {
  code: string;
  language?: string;
  maxHeight?: number;
}) {
  const [copied, setCopied] = useState(false);
  const lines = code.split("\n");

  return (
    <div className="hs-card relative overflow-hidden">
      <button
        type="button"
        className="hs-btn hs-btn--sm absolute right-3 top-3 z-10"
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre
        className="overflow-auto p-4 text-[12.5px] leading-[1.6]"
        style={{ maxHeight, fontFamily: "var(--font-mono)", background: "var(--surface-2)" }}
        data-language={language}
      >
        <code>
          {lines.map((line, i) => (
            <span key={i} className="grid grid-cols-[3rem_1fr]">
              <span className="select-none text-right pr-3 tabular-nums" style={{ color: "var(--ink-3)" }}>
                {i + 1}
              </span>
              <span>{line || " "}</span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
