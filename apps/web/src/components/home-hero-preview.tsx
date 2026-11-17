"use client";

import { useState } from "react";
import { STARTER_TEMPLATES } from "@ha-studio/lovelace";
import { DashboardPreview } from "./dashboard-preview";

const SHOWCASE = STARTER_TEMPLATES.filter((t) => t.id !== "blank");

/** Small tabbed preview on the landing page; everything renders for real. */
export function HomeHeroPreview() {
  const [active, setActive] = useState(0);
  const template = SHOWCASE[active];

  return (
    <div className="hs-card overflow-hidden" style={{ boxShadow: "var(--shadow-lg)" }}>
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ff5f57" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#febc2e" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#28c840" }} />
        </div>
        <div className="hs-scroll-x ml-2 flex gap-1" role="tablist" aria-label="Preview style">
          {SHOWCASE.map((t, i) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              className="hs-chip"
              data-active={i === active}
              onClick={() => setActive(i)}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>
      <DashboardPreview
        key={template.id}
        config={template.config}
        height={420}
        renderWidth={1100}
        fade={false}
        loadCustomCards
      />
    </div>
  );
}
