import { describe, expect, it } from "vitest";
import { domainIcon, stateIcon, weatherIcon, type HassEntity } from "@ha-studio/lovelace";

const entity = (
  entity_id: string,
  state: string,
  attributes: Record<string, unknown> = {},
): HassEntity => ({
  entity_id,
  state,
  last_changed: "",
  last_updated: "",
  attributes,
  context: { id: "c", user_id: null, parent_id: null },
});

describe("stateIcon", () => {
  it("prefers an explicitly configured icon", () => {
    expect(stateIcon(entity("light.a", "on", { icon: "mdi:ufo" }))).toBe("mdi:ufo");
  });

  it.each([
    ["light.a", "on", {}, "mdi:lightbulb"],
    ["light.a", "off", {}, "mdi:lightbulb-outline"],
    ["switch.a", "on", { device_class: "outlet" }, "mdi:power-plug"],
    ["lock.a", "unlocked", {}, "mdi:lock-open"],
    ["lock.a", "jammed", {}, "mdi:lock-alert"],
    ["binary_sensor.a", "on", { device_class: "door" }, "mdi:door-open"],
    ["binary_sensor.a", "off", { device_class: "window" }, "mdi:window-closed"],
    ["cover.a", "closed", { device_class: "garage" }, "mdi:garage"],
    ["climate.a", "cool", {}, "mdi:snowflake"],
    ["weather.a", "pouring", {}, "mdi:weather-pouring"],
    ["media_player.a", "playing", {}, "mdi:play-circle"],
    ["sun.sun", "below_horizon", {}, "mdi:weather-night"],
  ])("%s/%s -> %s", (id, state, attrs, expected) => {
    expect(stateIcon(entity(id, state, attrs))).toBe(expected);
  });

  it("picks a battery level icon", () => {
    expect(stateIcon(entity("sensor.b", "68", { device_class: "battery" }))).toBe("mdi:battery-70");
    expect(stateIcon(entity("sensor.b", "3", { device_class: "battery" }))).toBe(
      "mdi:battery-alert-variant-outline",
    );
  });

  it("falls back to a domain icon", () => {
    expect(stateIcon(undefined, "vacuum.robot")).toBe("mdi:robot-vacuum-variant");
    expect(stateIcon(undefined, "wat.unknown")).toBe("mdi:bookmark");
  });
});

describe("domainIcon / weatherIcon", () => {
  it("maps known domains", () => {
    expect(domainIcon("camera")).toBe("mdi:video");
    expect(domainIcon("nope")).toBe("mdi:bookmark");
  });
  it("maps weather conditions", () => {
    expect(weatherIcon("clear-night")).toBe("mdi:weather-night");
    expect(weatherIcon("nonsense")).toBe("mdi:weather-partly-cloudy");
  });
});
