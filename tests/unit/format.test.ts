import { describe, expect, it } from "vitest";
import {
  computeEntityName,
  entityIdToName,
  formatEntityState,
  formatNumber,
  isActive,
  isUnavailable,
  relativeTime,
  stateColorVar,
  type HassEntity,
} from "@ha-studio/lovelace";

const entity = (
  entity_id: string,
  state: string,
  attributes: Record<string, unknown> = {},
): HassEntity => ({
  entity_id,
  state,
  last_changed: "2026-03-14T18:00:00.000Z",
  last_updated: "2026-03-14T18:00:00.000Z",
  attributes,
  context: { id: "c", user_id: null, parent_id: null },
});

describe("entityIdToName", () => {
  it("title-cases the object id", () => {
    expect(entityIdToName("light.kitchen_ceiling")).toBe("Kitchen Ceiling");
  });
  it("prefers the friendly name when present", () => {
    expect(computeEntityName(entity("light.a", "on", { friendly_name: "Reading lamp" }))).toBe(
      "Reading lamp",
    );
  });
});

describe("formatEntityState", () => {
  it("appends the unit with a non-breaking space", () => {
    expect(formatEntityState(entity("sensor.t", "21.4", { unit_of_measurement: "°C" }))).toBe(
      "21.4 °C",
    );
  });
  it("omits the space before a percent sign", () => {
    expect(formatEntityState(entity("sensor.h", "44", { unit_of_measurement: "%" }))).toBe("44%");
  });
  it("uses device-class labels for binary sensors", () => {
    expect(formatEntityState(entity("binary_sensor.d", "on", { device_class: "door" }))).toBe("Open");
    expect(formatEntityState(entity("binary_sensor.d", "off", { device_class: "motion" }))).toBe("Clear");
  });
  it("humanises enum states", () => {
    expect(formatEntityState(entity("alarm_control_panel.a", "armed_away"))).toBe("Armed away");
    expect(formatEntityState(entity("person.p", "not_home"))).toBe("Away");
  });
  it("handles unavailable and missing entities", () => {
    expect(formatEntityState(entity("sensor.x", "unavailable"))).toBe("Unavailable");
    expect(formatEntityState(undefined)).toBe("Unavailable");
  });
  it("respects display_precision", () => {
    expect(
      formatEntityState(entity("sensor.p", "612.4567", { unit_of_measurement: "W", display_precision: 1 })),
    ).toBe("612.5 W");
  });
});

describe("formatNumber", () => {
  it("drops decimals for integers and large values", () => {
    expect(formatNumber(42)).toBe("42");
    expect(formatNumber(1234.56)).toBe("1,235");
  });
  it("keeps two decimals for small fractions", () => {
    expect(formatNumber(1.234)).toBe("1.23");
  });
});

describe("isUnavailable / isActive", () => {
  it("treats unavailable and unknown as unavailable", () => {
    expect(isUnavailable("unavailable")).toBe(true);
    expect(isUnavailable("unknown")).toBe(true);
    expect(isUnavailable("on")).toBe(false);
  });

  it.each([
    ["light.a", "on", true],
    ["light.a", "off", false],
    ["cover.a", "open", true],
    ["cover.a", "closed", false],
    ["lock.a", "unlocked", true],
    ["lock.a", "locked", false],
    ["climate.a", "heat", true],
    ["climate.a", "off", false],
    ["media_player.a", "playing", true],
    ["media_player.a", "idle", false],
    ["alarm_control_panel.a", "armed_away", true],
    ["alarm_control_panel.a", "disarmed", false],
    ["person.a", "home", true],
    ["person.a", "not_home", false],
    ["vacuum.a", "cleaning", true],
    ["vacuum.a", "docked", false],
  ])("%s in state %s -> active=%s", (id, state, expected) => {
    expect(isActive(entity(id, state))).toBe(expected);
  });

  it("is never active when unavailable", () => {
    expect(isActive(entity("light.a", "unavailable"))).toBe(false);
  });
});

describe("stateColorVar", () => {
  it("returns a domain variable for active entities", () => {
    expect(stateColorVar(entity("light.a", "on"))).toContain("--state-light-active-color");
  });
  it("uses the alerting colour for safety binary sensors", () => {
    expect(stateColorVar(entity("binary_sensor.s", "on", { device_class: "smoke" }))).toBe(
      "var(--state-binary_sensor-alerting-color)",
    );
  });
  it("maps climate states to their own colours", () => {
    expect(stateColorVar(entity("climate.a", "cool"))).toBe("var(--state-climate-cool-color)");
    expect(stateColorVar(entity("climate.a", "heat"))).toBe("var(--state-climate-heat-color)");
  });
  it("returns undefined for inactive entities", () => {
    expect(stateColorVar(entity("light.a", "off"))).toBeUndefined();
  });
});

describe("relativeTime", () => {
  it("formats minutes ago", () => {
    const now = Date.parse("2026-03-14T18:30:00.000Z");
    expect(relativeTime("2026-03-14T18:00:00.000Z", now)).toMatch(/30 minutes ago/);
  });
  it("returns an empty string for junk", () => {
    expect(relativeTime("not-a-date")).toBe("");
  });
});
