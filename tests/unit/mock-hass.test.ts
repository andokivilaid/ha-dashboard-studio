import { describe, expect, it, vi } from "vitest";
import {
  buildEntityInventory,
  createMockHass,
  demoHistory,
  DEMO_ENTITY_IDS,
  isNoisyEntity,
  ReadOnlyError,
} from "@ha-studio/lovelace";

describe("createMockHass", () => {
  const hass = createMockHass();

  it("exposes a populated demo home", () => {
    expect(Object.keys(hass.states).length).toBeGreaterThan(100);
    expect(hass.states["light.living_room_ceiling"].state).toBe("on");
    expect(Object.keys(hass.areas).length).toBeGreaterThan(5);
    expect(Object.keys(hass.floors).length).toBe(3);
  });

  it("gives every state entry a matching registry entry", () => {
    for (const id of DEMO_ENTITY_IDS) {
      expect(hass.entities[id], `registry entry for ${id}`).toBeDefined();
    }
  });

  it("refuses every service call", async () => {
    await expect(hass.callService("light", "turn_on", { entity_id: "light.a" })).rejects.toBeInstanceOf(
      ReadOnlyError,
    );
  });

  it("refuses websocket and REST writes", async () => {
    await expect(hass.callWS({ type: "config/entity_registry/update" })).rejects.toBeInstanceOf(
      ReadOnlyError,
    );
    await expect(hass.callApi("POST", "services/light/turn_on")).rejects.toBeInstanceOf(ReadOnlyError);
  });

  it("reports an attempted service call to the caller's hook", async () => {
    const onServiceCall = vi.fn();
    const guarded = createMockHass({ onServiceCall });
    await guarded.callService("switch", "turn_off").catch(() => undefined);
    expect(onServiceCall).toHaveBeenCalledWith("switch", "turn_off", undefined);
  });

  it("marks itself read-only", () => {
    expect(hass.readOnly).toBe(true);
  });

  it("formats states through the HA-shaped helper", () => {
    const e = hass.states["sensor.living_room_temperature"];
    expect(hass.formatEntityState(e)).toBe("21.4 °C");
  });

  it("is deterministic across constructions", () => {
    const a = createMockHass();
    const b = createMockHass();
    expect(a.states["sensor.power_consumption"]).toEqual(b.states["sensor.power_consumption"]);
  });
});

describe("isNoisyEntity", () => {
  const hass = createMockHass();
  it("hides diagnostic and config entities", () => {
    expect(isNoisyEntity(hass, "sensor.cpu_temperature")).toBe(true);
    expect(isNoisyEntity(hass, "update.home_assistant_core")).toBe(true);
  });
  it("hides unavailable entities", () => {
    expect(isNoisyEntity(hass, "sensor.unavailable_demo")).toBe(true);
  });
  it("keeps ordinary entities", () => {
    expect(isNoisyEntity(hass, "light.living_room_ceiling")).toBe(false);
  });
  it("treats unknown ids as noise", () => {
    expect(isNoisyEntity(hass, "light.does_not_exist")).toBe(true);
  });
});

describe("buildEntityInventory", () => {
  const hass = createMockHass();
  const inventory = buildEntityInventory(hass);

  it("excludes the noise by default", () => {
    const ids = inventory.map((i) => i.entity_id);
    expect(ids).not.toContain("sensor.cpu_temperature");
    expect(ids).not.toContain("sensor.unavailable_demo");
    expect(ids).toContain("light.living_room_ceiling");
  });

  it("annotates area, device class and unit", () => {
    const temp = inventory.find((i) => i.entity_id === "sensor.living_room_temperature");
    expect(temp).toMatchObject({ area: "Living room", device_class: "temperature", unit: "°C" });
    expect(temp?.floor).toBe("Ground floor");
  });

  it("is sorted and can include the noise on request", () => {
    const ids = inventory.map((i) => i.entity_id);
    expect([...ids].sort()).toEqual(ids);
    expect(buildEntityInventory(hass, { includeNoisy: true }).length).toBeGreaterThan(inventory.length);
  });
});

describe("demoHistory", () => {
  it("is deterministic and ends at the current state", () => {
    const a = demoHistory("sensor.living_room_temperature");
    const b = demoHistory("sensor.living_room_temperature");
    expect(a).toEqual(b);
    expect(a.at(-1)?.v).toBe(21.4);
  });

  it("produces the requested number of ascending points", () => {
    const points = demoHistory("sensor.power_consumption", 12, 30);
    expect(points).toHaveLength(30);
    for (let i = 1; i < points.length; i += 1) expect(points[i].t).toBeGreaterThan(points[i - 1].t);
  });
});
