import { collectEntityIds } from "./synthesize";
import type { LovelaceCardConfig, LovelaceConfig, LovelaceViewConfig } from "./types";

/**
 * Rules that catch the Lovelace mistakes a generator actually makes.
 *
 * These are fed back to the model after a generation, alongside the visual
 * critique, so it can correct configuration errors a screenshot cannot show —
 * a pop-up that never opens, a card the user has not installed, an entity id
 * that does not exist.
 */

export type LintSeverity = "error" | "warning" | "info";

export interface LintIssue {
  rule: string;
  severity: LintSeverity;
  message: string;
  /** Where it is, in words, for a model that cannot see line numbers. */
  where?: string;
}

export interface LintContext {
  /** Entity ids that exist. Omit to skip the entity check. */
  knownEntities?: Set<string> | string[];
  /** Custom card tags the target instance can actually load. */
  availableCustomCards?: string[];
}

function viewCards(view: LovelaceViewConfig): LovelaceCardConfig[] {
  const direct = (view.cards ?? []) as LovelaceCardConfig[];
  const sectioned = (view.sections ?? []).flatMap((s) => (s.cards ?? []) as LovelaceCardConfig[]);
  return [...direct, ...sectioned];
}

function describeView(view: LovelaceViewConfig, index: number): string {
  return `view ${index + 1}${view.title ? ` ("${view.title}")` : ""}`;
}

function isBubblePopUp(card: LovelaceCardConfig): boolean {
  return card.type === "custom:bubble-card" && card.card_type === "pop-up";
}

export function lintDashboard(config: LovelaceConfig, ctx: LintContext = {}): LintIssue[] {
  const issues: LintIssue[] = [];
  const views = Array.isArray(config.views) ? config.views : [];

  views.forEach((view, viewIndex) => {
    const where = describeView(view, viewIndex);

    /* -- Bubble Card pop-ups ------------------------------------------- */
    // A pop-up replaces the card slot it occupies with a hidden dialog bound
    // to a URL hash. Anything placed after it in the same list is pushed out
    // of the layout, so Bubble Card requires pop-ups to come last.
    const direct = (view.cards ?? []) as LovelaceCardConfig[];
    const lastPopUp = direct.map(isBubblePopUp).lastIndexOf(true);
    if (lastPopUp !== -1) {
      const nonPopUpAfter = direct.slice(lastPopUp + 1).some((c) => !isBubblePopUp(c));
      if (nonPopUpAfter) {
        issues.push({
          rule: "bubble-popup-last",
          severity: "error",
          message:
            "Bubble Card pop-ups must be the last cards in a view. Move every `card_type: pop-up` to the end of `cards:`, after all visible cards.",
          where,
        });
      }
    }

    for (const card of viewCards(view)) {
      if (!isBubblePopUp(card)) continue;
      if (!card.hash || typeof card.hash !== "string" || !String(card.hash).startsWith("#")) {
        issues.push({
          rule: "bubble-popup-hash",
          severity: "error",
          message:
            "A Bubble Card pop-up needs a `hash:` starting with `#` (for example `hash: '#living-room'`); it is opened by navigating to that hash.",
          where,
        });
      }
      if (view.sections?.some((s) => ((s.cards ?? []) as LovelaceCardConfig[]).some(isBubblePopUp))) {
        issues.push({
          rule: "bubble-popup-in-section",
          severity: "warning",
          message:
            "Bubble Card pop-ups belong in the view's own `cards:` list, not inside a section's grid, where the section's layout will size them.",
          where,
        });
      }
    }

    /* -- Views ---------------------------------------------------------- */
    if (view.type === "sections" && !view.sections?.length) {
      issues.push({
        rule: "sections-view-empty",
        severity: "error",
        message: "A `type: sections` view needs at least one `type: grid` section in `sections:`.",
        where,
      });
    }
    if (view.type === "sections" && (view.cards ?? []).length && !direct.every(isBubblePopUp)) {
      issues.push({
        rule: "sections-view-loose-cards",
        severity: "warning",
        message:
          "Cards in a sections view belong inside a section. Only Bubble Card pop-ups should sit in the view's own `cards:`.",
        where,
      });
    }
    if (!view.title) {
      issues.push({ rule: "view-title", severity: "info", message: "Give the view a `title`.", where });
    }
    if (!view.path) {
      issues.push({
        rule: "view-path",
        severity: "info",
        message: "Give the view a lowercase hyphenated `path` so it gets a stable URL.",
        where,
      });
    }
  });

  /* -- Custom cards ----------------------------------------------------- */
  if (ctx.availableCustomCards) {
    const available = new Set(ctx.availableCustomCards);
    const used = new Set<string>();
    const walk = (value: unknown): void => {
      if (Array.isArray(value)) return value.forEach(walk);
      if (!value || typeof value !== "object") return;
      const node = value as Record<string, unknown>;
      if (typeof node.type === "string" && node.type.startsWith("custom:")) {
        used.add(node.type.slice("custom:".length));
      }
      Object.values(node).forEach(walk);
    };
    walk(config);
    for (const tag of [...used].sort()) {
      if (available.has(tag)) continue;
      issues.push({
        rule: "custom-card-unavailable",
        severity: "error",
        message: `\`custom:${tag}\` is not installed on this instance. Use a built-in card instead, or tell the user to install it from HACS first.`,
      });
    }
  }

  /* -- Entities --------------------------------------------------------- */
  if (ctx.knownEntities) {
    const known =
      ctx.knownEntities instanceof Set ? ctx.knownEntities : new Set(ctx.knownEntities);
    const missing = [...collectEntityIds(config)].filter((id) => !known.has(id)).sort();
    for (const id of missing.slice(0, 12)) {
      issues.push({
        rule: "unknown-entity",
        severity: "error",
        message: `\`${id}\` is not in the entity inventory. Replace it with a real entity or drop the card.`,
      });
    }
    if (missing.length > 12) {
      issues.push({
        rule: "unknown-entity",
        severity: "error",
        message: `…and ${missing.length - 12} further entity ids that do not exist.`,
      });
    }
  }

  return issues;
}

/** Renders issues as the block appended to the model's next turn. */
export function formatLintForModel(issues: LintIssue[]): string {
  const blocking = issues.filter((i) => i.severity !== "info");
  if (!blocking.length) return "";
  return [
    "CONFIGURATION PROBLEMS FOUND IN YOUR LAST OUTPUT — fix every one of these:",
    ...blocking.map((i) => `- [${i.severity}] ${i.where ? `${i.where}: ` : ""}${i.message}`),
  ].join("\n");
}
