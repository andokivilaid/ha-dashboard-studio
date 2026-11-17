"use client";

import {
  computeEntityName,
  demoHistory,
  formatEntityState,
  formatNumber,
  stateIcon,
  weatherIcon,
  type LovelaceCardConfig,
} from "@ha-studio/lovelace";
import { Icon } from "../Icon";
import { useEntity, useHass } from "../context";
import { FallbackCard, HaCard } from "./shell";

const SERIES_COLORS = [
  "#03a9f4", "#ff9800", "#4caf50", "#e91e63", "#9c27b0",
  "#00bcd4", "#8bc34a", "#ff5722", "#795548", "#607d8b",
];

function sparkPath(points: { t: number; v: number }[], w: number, h: number, pad = 2) {
  if (points.length < 2) return { line: "", area: "", min: 0, max: 0 };
  const vs = points.map((p) => p.v);
  const min = Math.min(...vs);
  const max = Math.max(...vs);
  const span = max - min || 1;
  const xs = (i: number) => (i / (points.length - 1)) * w;
  const ys = (v: number) => h - pad - ((v - min) / span) * (h - pad * 2);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xs(i).toFixed(2)} ${ys(p.v).toFixed(2)}`).join(" ");
  const area = `${line} L ${w} ${h} L 0 ${h} Z`;
  return { line, area, min, max };
}

export function HistoryGraphCard({ config }: { config: LovelaceCardConfig }) {
  const hass = useHass();
  const raw = (config.entities as Array<string | { entity: string; name?: string }> | undefined) ?? [];
  const entities = raw.map((e) => (typeof e === "string" ? { entity: e } : e)).filter((e) => e.entity);
  const hours = Number(config.hours_to_show ?? 24);
  const w = 480;
  const h = 150;

  const series = entities.slice(0, 6).map((e, i) => {
    const points = demoHistory(e.entity, hours, 72);
    const ent = hass.states[e.entity];
    return {
      id: e.entity,
      name: e.name ?? computeEntityName(ent, e.entity),
      color: SERIES_COLORS[i % SERIES_COLORS.length],
      points,
      unit: ent?.attributes.unit_of_measurement as string | undefined,
    };
  });

  const all = series.flatMap((s) => s.points.map((p) => p.v));
  const gMin = all.length ? Math.min(...all) : 0;
  const gMax = all.length ? Math.max(...all) : 1;
  const span = gMax - gMin || 1;
  const yFor = (v: number) => h - 6 - ((v - gMin) / span) * (h - 18);

  return (
    <HaCard header={config.title as string | undefined} className="hui-history-graph-card">
      <div className="hui-graph">
        <div className="hui-graph__legend">
          {series.map((s) => (
            <span key={s.id}>
              <i className="hui-graph__dot" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
        <svg className="hui-graph__svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="History graph">
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <line key={f} x1={0} x2={w} y1={6 + f * (h - 18)} y2={6 + f * (h - 18)} stroke="var(--divider-color)" strokeWidth={1} />
          ))}
          {series.map((s) => {
            const d = s.points
              .map((p, i) => `${i === 0 ? "M" : "L"} ${((i / (s.points.length - 1)) * w).toFixed(2)} ${yFor(p.v).toFixed(2)}`)
              .join(" ");
            return <path key={s.id} d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />;
          })}
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--secondary-text-color)", marginTop: 4 }}>
          <span>{hours}h ago</span>
          <span>{formatNumber(gMin)} – {formatNumber(gMax)}</span>
          <span>now</span>
        </div>
      </div>
    </HaCard>
  );
}

export function SensorCard({ config }: { config: LovelaceCardConfig }) {
  const entityId = config.entity as string | undefined;
  const entity = useEntity(entityId);
  const hours = Number(config.hours_to_show ?? 24);
  const points = entityId ? demoHistory(entityId, hours, 48) : [];
  const { line, area } = sparkPath(points, 300, 60);
  const color = (config.graph === "line" ? "var(--accent-color)" : "var(--accent-color)") as string;

  return (
    <HaCard className="hui-sensor-card">
      <div style={{ padding: "16px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ color: "var(--secondary-text-color)", fontSize: 13 }}>
            {(config.name as string) ?? computeEntityName(entity, entityId)}
          </div>
          <div style={{ fontSize: 28 }}>{formatEntityState(entity)}</div>
        </div>
        <Icon icon={(config.icon as string) ?? stateIcon(entity, entityId)} size={24} style={{ color: "var(--state-icon-color)" }} />
      </div>
      {config.graph === "line" && points.length ? (
        <svg viewBox="0 0 300 60" className="hui-graph__svg" preserveAspectRatio="none" style={{ height: 60 }} aria-hidden="true">
          <path d={area} fill={color} opacity={0.15} />
          <path d={line} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </svg>
      ) : (
        <div style={{ height: 16 }} />
      )}
    </HaCard>
  );
}

export function GaugeCard({ config }: { config: LovelaceCardConfig }) {
  const entityId = config.entity as string | undefined;
  const entity = useEntity(entityId);
  const value = Number(entity?.state);
  const min = Number(config.min ?? 0);
  const max = Number(config.max ?? 100);
  const frac = Number.isFinite(value) && max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0;

  const severity = config.severity as Record<string, number> | undefined;
  let color = "var(--primary-color)";
  if (severity) {
    const entries = Object.entries(severity).sort((a, b) => b[1] - a[1]);
    for (const [level, threshold] of entries) {
      if (value >= threshold) {
        color = level === "red" ? "var(--red-color)" : level === "yellow" ? "var(--amber-color)" : "var(--green-color)";
        break;
      }
    }
  }

  const w = 180;
  const r = 70;
  const cx = w / 2;
  const cy = 80;
  const toXY = (f: number) => {
    const rad = Math.PI * (1 - f);
    return [cx + r * Math.cos(rad), cy - r * Math.sin(rad)];
  };
  const [sx, sy] = toXY(0);
  const [ex, ey] = toXY(1);
  const [vx, vy] = toXY(frac);

  return (
    <HaCard className="hui-gauge-card">
      <div className="hui-gauge">
        <svg width={w} height={92} viewBox={`0 0 ${w} 92`} aria-hidden="true">
          <path d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`} fill="none" stroke="var(--slider-track-color)" strokeWidth={14} strokeLinecap="round" />
          {frac > 0 ? (
            <path d={`M ${sx} ${sy} A ${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${vx} ${vy}`} fill="none" stroke={color} strokeWidth={14} strokeLinecap="round" />
          ) : null}
        </svg>
        <div className="hui-gauge__value">
          {Number.isFinite(value) ? formatNumber(value) : "—"}
          {config.unit ? <span style={{ fontSize: 14 }}> {String(config.unit)}</span> : null}
        </div>
        <div className="hui-gauge__name">{(config.name as string) ?? computeEntityName(entity, entityId)}</div>
      </div>
    </HaCard>
  );
}

export function StatisticCard({ config }: { config: LovelaceCardConfig }) {
  const entityId = config.entity as string | undefined;
  const entity = useEntity(entityId);
  return (
    <HaCard className="hui-statistic-card">
      <div className="hui-statistic">
        <div className="hui-statistic__value">{formatEntityState(entity)}</div>
        <div className="hui-statistic__name">
          {(config.name as string) ?? computeEntityName(entity, entityId)}
          {config.stat_type ? ` · ${String(config.stat_type)}` : ""}
        </div>
      </div>
    </HaCard>
  );
}

export function StatisticsGraphCard({ config }: { config: LovelaceCardConfig }) {
  const entities = ((config.entities as Array<string | { entity: string }> | undefined) ?? []).map((e) =>
    typeof e === "string" ? e : e.entity,
  );
  const first = entities[0];
  const points = first ? demoHistory(first, 24, 24) : [];
  const max = Math.max(...points.map((p) => p.v), 1);
  return (
    <HaCard header={(config.title as string) ?? "Statistics"} className="hui-statistics-graph-card">
      <div className="hui-energy__bars">
        {points.map((p, i) => (
          <div key={i} className="hui-energy__bar" style={{ height: `${(p.v / max) * 100}%`, background: SERIES_COLORS[0] }} />
        ))}
      </div>
      <div style={{ padding: "6px 16px 14px", fontSize: 12, color: "var(--secondary-text-color)" }}>
        {entities.join(", ") || "No statistics configured"}
      </div>
    </HaCard>
  );
}

export function WeatherForecastCard({ config }: { config: LovelaceCardConfig }) {
  const entityId = config.entity as string | undefined;
  const entity = useEntity(entityId);
  if (!entity) return <FallbackCard type="weather-forecast" entity={entityId} reason="Entity not found" icon="mdi:weather-partly-cloudy" />;
  const a = entity.attributes;
  const forecast = ((a.forecast as Array<Record<string, unknown>> | undefined) ?? []).slice(0, 5);
  const showForecast = config.show_forecast !== false && forecast.length > 0;

  return (
    <HaCard className="hui-weather-card">
      <div className="hui-weather">
        <div className="hui-weather__now">
          <Icon icon={weatherIcon(entity.state)} size={56} style={{ color: "var(--state-icon-color)" }} />
          <div className="hui-weather__meta">
            <div className="hui-weather__name">{(config.name as string) ?? computeEntityName(entity, entityId)}</div>
            <div className="hui-weather__cond">{formatEntityState(entity)}</div>
          </div>
          <div className="hui-weather__temp">
            {a.temperature !== undefined ? `${formatNumber(Number(a.temperature))}°` : "—"}
          </div>
        </div>
        <div className="hui-weather__attrs">
          {a.humidity !== undefined ? <span>💧 {String(a.humidity)}%</span> : null}
          {a.wind_speed !== undefined ? <span>🌬 {String(a.wind_speed)} {String(a.wind_speed_unit ?? "")}</span> : null}
          {a.pressure !== undefined ? <span>⏲ {String(a.pressure)} {String(a.pressure_unit ?? "")}</span> : null}
        </div>
        {showForecast ? (
          <div className="hui-weather__forecast">
            {forecast.map((f, i) => (
              <div className="hui-weather__day" key={i}>
                <span>
                  {new Date(String(f.datetime)).toLocaleDateString("en-GB", { weekday: "short" })}
                </span>
                <Icon icon={weatherIcon(String(f.condition))} size={22} />
                <span>
                  <b>{formatNumber(Number(f.temperature))}°</b>
                </span>
                {f.templow !== undefined ? (
                  <span className="hui-weather__low">{formatNumber(Number(f.templow))}°</span>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </HaCard>
  );
}

export function EnergyCard({ config }: { config: LovelaceCardConfig }) {
  const hass = useHass();
  const type = config.type as string;
  const label = type.replace(/^energy-/, "").replace(/-/g, " ");
  const consumed = Number(hass.states["sensor.energy_today"]?.state ?? 0);
  const solar = Number(hass.states["sensor.solar_energy_today"]?.state ?? 0);
  const returned = Number(hass.states["sensor.grid_return_today"]?.state ?? 0);
  const bars = demoHistory("sensor.energy_today", 24, 24).map((p) => Math.abs(p.v));
  const max = Math.max(...bars, 1);

  return (
    <HaCard header={(config.title as string) ?? `Energy — ${label}`} className="hui-energy-card">
      <div style={{ display: "flex", gap: 20, padding: "4px 16px 0", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--secondary-text-color)" }}>Consumed</div>
          <div style={{ fontSize: 22 }}>{formatNumber(consumed)} kWh</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "var(--secondary-text-color)" }}>Solar</div>
          <div style={{ fontSize: 22, color: "var(--amber-color)" }}>{formatNumber(solar)} kWh</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "var(--secondary-text-color)" }}>Returned</div>
          <div style={{ fontSize: 22, color: "var(--green-color)" }}>{formatNumber(returned)} kWh</div>
        </div>
      </div>
      <div className="hui-energy__bars">
        {bars.map((v, i) => (
          <div
            key={i}
            className="hui-energy__bar"
            style={{ height: `${(v / max) * 100}%`, background: i % 3 === 0 ? "var(--amber-color)" : "var(--primary-color)" }}
          />
        ))}
      </div>
      <div style={{ height: 12 }} />
    </HaCard>
  );
}
