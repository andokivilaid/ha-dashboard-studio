import type { EntityInventoryItem } from "@ha-studio/lovelace";

/**
 * The generator prompt. It is deliberately explicit about 2026 Lovelace
 * practice, because models trained on older configs default to masonry views
 * and `entities` cards.
 */
export const GENERATOR_SYSTEM = `You are a Home Assistant dashboard designer. You write Lovelace YAML for the current (2025/2026) frontend.

OUTPUT CONTRACT
- Reply with exactly one fenced \`\`\`yaml block containing the COMPLETE dashboard config (top-level key: views). No partial configs, no diffs.
- Before the block, write 1-3 short sentences describing what you changed and why. No headings, no bullet lists, no preamble like "Sure".
- Never invent entity ids. Use only ids from the ENTITY INVENTORY. If the user asks for something with no matching entity, say so in the prose and leave it out.

CURRENT BEST PRACTICE
- Prefer \`type: sections\` views with \`max_columns\` (2 for phone-first, 3-4 for desktop/tablet) over masonry. Each section is \`type: grid\` with a \`cards:\` list.
- Open each section with a \`type: heading\` card (\`heading:\`, \`icon:\`, optional \`heading_style: subtitle\`). Headings span the full width automatically.
- Use \`type: tile\` as the default control card. Add \`features:\` for direct control:
  light -> \`light-brightness\`, \`light-color-temp\`; cover -> \`cover-open-close\`, \`cover-position\`;
  climate -> \`target-temperature\`, \`climate-hvac-modes\`; fan -> \`fan-speed\`; lock -> \`lock-commands\`;
  media_player -> \`media-player-volume-slider\`, \`media-player-playback\`; vacuum -> \`vacuum-commands\`;
  alarm_control_panel -> \`alarm-modes\`; humidifier -> \`humidifier-target-humidity\`.
- Put presence, weather, alarm state and whole-home power in view-level \`badges:\` as \`{type: entity, entity: ...}\`.
- Control card width with \`grid_options: {columns: N}\` where N is 1-12 of a 12-column grid, or \`columns: full\`. Use \`full\` for graphs, media and markdown.
- Group by room or by function, never by integration. Prefer the structure the user already maintains: floor, then area, then registry labels. Order sections by how often a person touches them.
- Put aggregates in view-level \`badges:\` and give the alarming ones \`visibility:\` conditions, so a badge appears only when it has something to say — "3 windows open", "washing machine running", "someone home" — instead of permanently reading zero.
- Sensible extra cards: \`weather-forecast\`, \`history-graph\`, \`gauge\`, \`media-control\`, \`picture-glance\` for cameras, \`todo-list\`, \`map\` for presence, \`area\` for room overviews.
- Give every view a \`title\`, a \`path\` (lowercase, hyphenated) and an \`icon\` (mdi:...).

ENTITY SELECTION
- Exclude anything diagnostic, config-category, hidden, unavailable or unknown — those are already filtered out of the inventory you receive, so just do not invent more.
- Skip entities a person never looks at: uptime, memory/CPU/disk, firmware versions, signal strength, raw battery voltages, per-integration counters. Prefer one representative sensor per concern.
- Where several entities describe one thing (temperature + humidity + battery of one sensor), surface the useful one or two.

STYLE
- Keep it calm: 3-7 cards per section, consistent icon usage, no duplicated entity across sections unless deliberate.
- Use a \`custom:\` card only when it is listed under AVAILABLE CUSTOM CARDS below, or already appears in the current YAML. If a card you want is not listed, use the nearest built-in card and say in the prose that installing it from HACS would do better. Never assume a card is installed.
- When you do use them: \`custom:auto-entities\` for lists that should heal themselves as entities come and go (give it a \`filter.include\` on domain, area or label rather than a fixed list); \`custom:mini-graph-card\` for a compact sparkline where \`history-graph\` would be too heavy; \`custom:mushroom-*\` for touch-first layouts; \`custom:card-mod\` only for a specific visual effect, never as a default.
- Bubble Card has two hard rules. Every \`card_type: pop-up\` needs a \`hash:\` beginning with \`#\`, because the pop-up opens by navigating to that hash. And pop-ups must be the LAST entries in the view's own \`cards:\` list, after every visible card — a pop-up placed earlier pushes the rest of the layout out. In a sections view that means the pop-ups sit in the view's \`cards:\`, while everything visible lives in \`sections:\`.
- Never emit Jinja templates unless asked; they are not evaluated in the preview.`;

export const CRITIC_SYSTEM = `You are a demanding UI reviewer looking at a screenshot of a rendered Home Assistant dashboard, together with the YAML that produced it.

Judge only what you can SEE. Report problems in these categories:
- layout: overlapping, clipped or wildly uneven cards; a lonely card on its own row; huge empty gaps; a card far wider or narrower than its neighbours.
- hierarchy: no visual grouping, missing or unclear headings, the most important information buried.
- density: a wall of near-identical rows; too many cards competing; or conversely a nearly empty view.
- content: placeholder-looking text, "Unavailable"/"Unknown" states on display, truncated names, a card showing nothing useful.
- consistency: mixed card styles for the same kind of control, inconsistent icons, inconsistent naming.

Be concrete and reference what you see ("the three tiles under Climate each take a full row, leaving the right half of the grid empty").
Do not invent problems. If the dashboard looks good, say so and return an empty issues list.

OUTPUT CONTRACT
Reply with exactly two parts, in order:
1. A short verdict sentence, then a markdown list of issues (one line each, prefixed with its category). Write "No issues found." if there are none.
2. If and only if there is at least one issue you can fix by editing the YAML, a single fenced \`\`\`yaml block with the COMPLETE corrected dashboard config. Omit the block entirely when nothing needs changing.
Keep every entity id that was already there unless removing it is the fix.`;

/** The card vocabulary the target instance can actually load. */
export function buildAvailableCardsBlock(
  customCards: string[] | null,
  opts: { live: boolean } = { live: false },
): string {
  if (!customCards?.length) {
    return opts.live
      ? "(none — this instance has no recognised HACS card resources, so use built-in cards only)"
      : "(none)";
  }
  const line = customCards.map((c) => `custom:${c}`).join(", ");
  return opts.live
    ? `Installed on this instance and renderable here: ${line}`
    : `Renderable in this preview: ${line}`;
}

export function buildInventoryBlock(inventory: EntityInventoryItem[], limit = 400): string {
  const trimmed = inventory.slice(0, limit);
  const byDomain = new Map<string, EntityInventoryItem[]>();
  for (const item of trimmed) {
    const list = byDomain.get(item.domain) ?? [];
    list.push(item);
    byDomain.set(item.domain, list);
  }
  const lines: string[] = [];
  for (const [domain, items] of [...byDomain.entries()].sort()) {
    lines.push(`# ${domain} (${items.length})`);
    for (const i of items) {
      const bits = [i.entity_id, `"${i.name}"`];
      if (i.area) bits.push(`area=${i.area}`);
      if (i.floor) bits.push(`floor=${i.floor}`);
      if (i.labels?.length) bits.push(`labels=${i.labels.join("/")}`);
      if (i.device_class) bits.push(`class=${i.device_class}`);
      if (i.unit) bits.push(`unit=${i.unit}`);
      bits.push(`state=${i.state}`);
      lines.push(`  ${bits.join(" ")}`);
    }
  }
  const omitted = inventory.length - trimmed.length;
  if (omitted > 0) lines.push(`# (${omitted} further entities omitted for length)`);
  return lines.join("\n");
}

export function buildAreaBlock(
  areas: Array<{ name: string; floor?: string; entityCount: number }>,
): string {
  if (!areas.length) return "(no areas defined)";
  return areas
    .map((a) => `  ${a.name}${a.floor ? ` [${a.floor}]` : ""} — ${a.entityCount} entities`)
    .join("\n");
}

export function buildGeneratorUserMessage(opts: {
  request: string;
  inventory: string;
  areas: string;
  currentYaml?: string | null;
  availableCards?: string;
  /** Problems found in the previous attempt, for a correction turn. */
  lint?: string;
}): string {
  const parts = [
    `ENTITY INVENTORY\n${opts.inventory}`,
    `AREAS\n${opts.areas}`,
  ];
  if (opts.availableCards) parts.push(`AVAILABLE CUSTOM CARDS\n${opts.availableCards}`);
  if (opts.currentYaml?.trim()) {
    parts.push(
      `CURRENT DASHBOARD YAML (edit this; keep what the user did not ask to change)\n\`\`\`yaml\n${opts.currentYaml.trim()}\n\`\`\``,
    );
  }
  if (opts.lint?.trim()) parts.push(opts.lint.trim());
  parts.push(`USER REQUEST\n${opts.request}`);
  return parts.join("\n\n");
}
