"use client";

import type { LovelaceCardConfig } from "@ha-studio/lovelace";
import { CustomCardHost } from "./CustomCardHost";
import { useHass, useRenderOptions, type CardPath, cardPathKey } from "./context";
import { ErrorCard, FallbackCard, HaCard } from "./cards/shell";
import { TileCard } from "./cards/tile";
import { EntitiesCard, GlanceCard } from "./cards/entities";
import {
  AlarmPanelCard,
  AreaCard,
  ButtonCard,
  EntityCard,
  HumidifierCard,
  LightCard,
  ThermostatCard,
} from "./cards/controls";
import {
  EnergyCard,
  GaugeCard,
  HistoryGraphCard,
  SensorCard,
  StatisticCard,
  StatisticsGraphCard,
  WeatherForecastCard,
} from "./cards/data";
import {
  CalendarCard,
  HeadingCard,
  IframeCard,
  LogbookCard,
  MapCard,
  MarkdownCard,
  MediaControlCard,
  PictureCard,
  PictureElementsCard,
  PictureEntityCard,
  PictureGlanceCard,
  TodoListCard,
} from "./cards/misc";

/** Card types this renderer implements natively. */
export const SUPPORTED_CARD_TYPES = [
  "alarm-panel", "area", "button", "calendar", "conditional", "entities", "entity",
  "energy-date-selection", "energy-usage-graph", "energy-solar-graph", "energy-distribution",
  "energy-sources-table", "energy-gas-graph", "energy-water-graph", "energy-devices-graph",
  "energy-carbon-consumed-gauge", "energy-grid-neutrality-gauge", "energy-self-sufficiency-gauge",
  "entity-filter", "gauge", "glance", "grid", "heading", "history-graph", "horizontal-stack",
  "humidifier", "iframe", "light", "logbook", "map", "markdown", "media-control", "picture",
  "picture-elements", "picture-entity", "picture-glance", "sensor", "shopping-list",
  "statistic", "statistics-graph", "thermostat", "tile", "todo-list", "vertical-stack",
  "weather-forecast",
] as const;

function GridCard({ config, path }: { config: LovelaceCardConfig; path?: CardPath }) {
  const cards = (config.cards as LovelaceCardConfig[] | undefined) ?? [];
  const columns = Number(config.columns ?? 2);
  const square = config.square !== false;
  return (
    <div
      className={`hui-grid${square ? " hui-grid--square" : ""}`}
      style={{ ["--grid-columns" as string]: columns } as never}
    >
      {cards.map((c, i) => (
        <CardRenderer key={i} config={c} path={path} />
      ))}
    </div>
  );
}

function StackCard({
  config,
  direction,
  path,
}: {
  config: LovelaceCardConfig;
  direction: "horizontal" | "vertical";
  path?: CardPath;
}) {
  const cards = (config.cards as LovelaceCardConfig[] | undefined) ?? [];
  return (
    <div className={`hui-stack hui-stack--${direction}`}>
      {cards.map((c, i) => (
        <CardRenderer key={i} config={c} path={path} />
      ))}
    </div>
  );
}

function ConditionalCard({ config, path }: { config: LovelaceCardConfig; path?: CardPath }) {
  const hass = useHass();
  const conditions = (config.conditions as Array<Record<string, unknown>> | undefined) ?? [];
  const visible = conditions.every((cond) => {
    const condType = String(cond.condition ?? "state");
    if (condType !== "state" && !("state" in cond) && !("state_not" in cond)) return true;
    const entityId = String(cond.entity ?? "");
    const state = hass.states[entityId]?.state;
    if (cond.state !== undefined) {
      const want = Array.isArray(cond.state) ? (cond.state as string[]) : [String(cond.state)];
      return state !== undefined && want.includes(state);
    }
    if (cond.state_not !== undefined) {
      const avoid = Array.isArray(cond.state_not) ? (cond.state_not as string[]) : [String(cond.state_not)];
      return state !== undefined && !avoid.includes(state);
    }
    return true;
  });
  const inner = config.card as LovelaceCardConfig | undefined;
  if (!inner) return <FallbackCard type="conditional" reason="No inner card" />;
  if (!visible) {
    return (
      <div style={{ opacity: 0.35 }} data-conditional-hidden="true">
        <CardRenderer config={inner} path={path} />
      </div>
    );
  }
  return <CardRenderer config={inner} path={path} />;
}

function EntityFilterCard({ config, path }: { config: LovelaceCardConfig; path?: CardPath }) {
  const hass = useHass();
  const entities = (config.entities as Array<string | { entity: string }> | undefined) ?? [];
  const stateFilter = (config.state_filter as unknown[] | undefined) ?? ["on"];
  const kept = entities.filter((e) => {
    const id = typeof e === "string" ? e : e.entity;
    const state = hass.states[id]?.state;
    return stateFilter.some((f) => (typeof f === "object" && f ? false : state === String(f)));
  });
  const base = (config.card as LovelaceCardConfig | undefined) ?? { type: "entities" };
  return <CardRenderer config={{ ...base, entities: kept } as LovelaceCardConfig} path={path} />;
}

export function CardRenderer({
  config,
  path,
}: {
  config: LovelaceCardConfig | undefined;
  path?: CardPath;
}) {
  const options = useRenderOptions();

  if (!config || typeof config !== "object") {
    return <ErrorCard message="Card configuration is not an object" config={config} />;
  }
  const type = String(config.type ?? (config.entity ? "entity" : ""));
  if (!type) return <ErrorCard message="Card is missing a `type`" config={config} />;

  const selected = options.selectedPath && cardPathKey(options.selectedPath) === cardPathKey(path);
  const wrapperProps = {
    "data-card-type": type,
    "data-card-path": cardPathKey(path),
    className: `hui-card-slot${selected ? " hui-card-slot--selected" : ""}`,
    style: {
      outline: selected
        ? "2px solid var(--primary-color)"
        : options.showCardOutlines
          ? "1px dashed var(--divider-color)"
          : undefined,
      outlineOffset: selected || options.showCardOutlines ? "2px" : undefined,
      borderRadius: "12px",
      cursor: options.onCardSelect && path ? "pointer" : undefined,
      height: "100%",
    } as React.CSSProperties,
    onClick: options.onCardSelect && path ? () => options.onCardSelect?.(path) : undefined,
  };

  return <div {...wrapperProps}>{renderInner(type, config, path)}</div>;
}

function renderInner(type: string, config: LovelaceCardConfig, path?: CardPath) {
  if (type.startsWith("custom:")) return <CustomCardHost config={config} />;

  switch (type) {
    case "tile":
      return <TileCard config={config} />;
    case "entities":
      return <EntitiesCard config={config} />;
    case "glance":
      return <GlanceCard config={config} />;
    case "button":
      return <ButtonCard config={config} />;
    case "entity":
      return <EntityCard config={config} />;
    case "light":
      return <LightCard config={config} />;
    case "thermostat":
      return <ThermostatCard config={config} />;
    case "humidifier":
      return <HumidifierCard config={config} />;
    case "alarm-panel":
      return <AlarmPanelCard config={config} />;
    case "area":
      return <AreaCard config={config} />;
    case "weather-forecast":
      return <WeatherForecastCard config={config} />;
    case "sensor":
      return <SensorCard config={config} />;
    case "gauge":
      return <GaugeCard config={config} />;
    case "history-graph":
      return <HistoryGraphCard config={config} />;
    case "statistic":
      return <StatisticCard config={config} />;
    case "statistics-graph":
      return <StatisticsGraphCard config={config} />;
    case "media-control":
      return <MediaControlCard config={config} />;
    case "markdown":
      return <MarkdownCard config={config} />;
    case "picture":
      return <PictureCard config={config} />;
    case "picture-entity":
      return <PictureEntityCard config={config} />;
    case "picture-glance":
      return <PictureGlanceCard config={config} />;
    case "picture-elements":
      return <PictureElementsCard config={config} />;
    case "iframe":
      return <IframeCard config={config} />;
    case "map":
      return <MapCard config={config} />;
    case "todo-list":
    case "shopping-list":
      return <TodoListCard config={config} />;
    case "calendar":
      return <CalendarCard config={config} />;
    case "logbook":
      return <LogbookCard config={config} />;
    case "heading":
      return <HeadingCard config={config} />;
    case "grid":
      return <GridCard config={config} path={path} />;
    case "horizontal-stack":
      return <StackCard config={config} direction="horizontal" path={path} />;
    case "vertical-stack":
      return <StackCard config={config} direction="vertical" path={path} />;
    case "conditional":
      return <ConditionalCard config={config} path={path} />;
    case "entity-filter":
      return <EntityFilterCard config={config} path={path} />;
    default:
      if (type.startsWith("energy-")) return <EnergyCard config={config} />;
      if (type === "divider") return <div className="hui-section-divider" />;
      if (type === "starting" || type === "empty-state")
        return (
          <HaCard>
            <div style={{ padding: 16, color: "var(--secondary-text-color)" }}>{type}</div>
          </HaCard>
        );
      return (
        <FallbackCard
          type={type}
          entity={config.entity as string | undefined}
          reason="Card type not implemented in the studio renderer"
        />
      );
  }
}
