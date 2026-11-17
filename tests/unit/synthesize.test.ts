import { describe, expect, it } from "vitest";
import {
  collectEntityIds,
  createMockHass,
  isEntityId,
  synthesizeEntity,
  synthesizeMissingEntities,
  synthesizeRegistryEntries,
  formatEntityState,
  isActive,
  stateIcon,
} from "@ha-studio/lovelace";

describe("isEntityId", () => {
  it.each(["light.kitchen", "binary_sensor.front_door", "media_player.tv_2"])(
    "accepts %s",
    (id) => expect(isEntityId(id)).toBe(true),
  );
  it.each([
    "custom:mushroom-light-card",
    "mdi:lightbulb",
    "not-an-entity",
    "notadomain.thing",
    "Light.Kitchen",
    "",
    42,
    null,
  ])("rejects %s", (v) => expect(isEntityId(v)).toBe(false));
});

describe("collectEntityIds", () => {
  it("finds ids however deeply they are nested", () => {
    const config = {
      views: [
        {
          badges: ["person.ando"],
          cards: [
            { type: "tile", entity: "light.a" },
            { type: "entities", entities: [{ entity: "sensor.b" }, "switch.c"] },
            {
              type: "picture-elements",
              camera_image: "camera.d",
              elements: [{ type: "state-icon", entity: "binary_sensor.e" }],
            },
            { type: "custom:mushroom-chips-card", chips: [{ entity: "climate.f" }] },
          ],
        },
      ],
    };
    expect([...collectEntityIds(config)].sort()).toEqual([
      "binary_sensor.e",
      "camera.d",
      "climate.f",
      "light.a",
      "person.ando",
      "sensor.b",
      "switch.c",
    ]);
  });

  it("ignores card types, icons and arbitrary strings", () => {
    const ids = collectEntityIds({
      type: "custom:bubble-card",
      icon: "mdi:lightbulb",
      theme: "ios-dark-mode",
      path: "home",
    });
    expect([...ids]).toEqual([]);
  });
});

describe("synthesizeEntity", () => {
  it("is deterministic", () => {
    expect(synthesizeEntity("light.tv_lysa")).toEqual(synthesizeEntity("light.tv_lysa"));
  });

  it("names the entity from its id", () => {
    expect(synthesizeEntity("light.tv_lysa").attributes.friendly_name).toBe("Tv Lysa");
  });

  it("gives lights brightness and colour support", () => {
    const e = synthesizeEntity("light.some_lamp");
    expect(["on", "off"]).toContain(e.state);
    expect(e.attributes.supported_color_modes).toContain("color_temp");
  });

  it.each([
    ["sensor.living_room_temperature", "temperature", "°C"],
    ["sensor.kitchen_humidity", "humidity", "%"],
    ["sensor.heat_pump_power", "power", "W"],
    ["sensor.phone_battery_level", "battery", "%"],
    ["sensor.daily_energy_consumption", "energy", "kWh"],
    ["sensor.outdoor_pressure", "pressure", "hPa"],
  ])("infers %s as %s", (id, deviceClass, unit) => {
    const e = synthesizeEntity(id);
    expect(e.attributes.device_class).toBe(deviceClass);
    expect(e.attributes.unit_of_measurement).toBe(unit);
    expect(Number.isFinite(Number(e.state))).toBe(true);
  });

  it("infers binary sensor device classes from the name", () => {
    expect(synthesizeEntity("binary_sensor.hallway_motion").attributes.device_class).toBe("motion");
    expect(synthesizeEntity("binary_sensor.kitchen_window").attributes.device_class).toBe("window");
    expect(synthesizeEntity("binary_sensor.basement_leak").attributes.device_class).toBe("moisture");
  });

  it("gives covers a device class and a position", () => {
    const e = synthesizeEntity("cover.garage_port");
    expect(e.attributes.device_class).toBe("garage");
    expect(["open", "closed"]).toContain(e.state);
  });

  it("gives climate a current and target temperature", () => {
    const e = synthesizeEntity("climate.stue");
    expect(Number(e.attributes.current_temperature)).toBeGreaterThan(10);
    expect(Number(e.attributes.temperature)).toBeGreaterThan(10);
    expect(e.attributes.hvac_modes).toContain("heat");
  });

  it("gives weather a five-day forecast", () => {
    const e = synthesizeEntity("weather.hjemme");
    expect((e.attributes.forecast as unknown[]).length).toBe(5);
  });

  it("produces entities the rest of the renderer understands", () => {
    for (const id of [
      "light.a", "switch.b", "sensor.c_temperature", "binary_sensor.d_motion",
      "climate.e", "cover.f", "media_player.g", "lock.h", "person.i",
      "alarm_control_panel.j", "vacuum.k", "fan.l", "weather.m", "camera.n",
      "scene.o", "script.p", "automation.q", "update.r", "timer.s", "todo.t",
    ]) {
      const e = synthesizeEntity(id);
      expect(e.entity_id, id).toBe(id);
      expect(typeof formatEntityState(e), id).toBe("string");
      expect(formatEntityState(e), id).not.toBe("Unavailable");
      expect(stateIcon(e), id).toMatch(/^mdi:/);
      expect(typeof isActive(e), id).toBe("boolean");
    }
  });
});

describe("synthesizeMissingEntities", () => {
  const hass = createMockHass();

  it("leaves the demo home's own entities alone", () => {
    const { states, synthesized } = synthesizeMissingEntities(hass, {
      views: [{ cards: [{ type: "tile", entity: "light.living_room_ceiling" }] }],
    });
    expect(synthesized).toEqual([]);
    expect(states).toEqual({});
  });

  it("invents only what is missing", () => {
    const { states, synthesized } = synthesizeMissingEntities(hass, {
      views: [
        {
          cards: [
            { type: "tile", entity: "light.living_room_ceiling" },
            { type: "tile", entity: "light.someone_elses_lamp" },
          ],
        },
      ],
    });
    expect(synthesized).toEqual(["light.someone_elses_lamp"]);
    expect(states["light.someone_elses_lamp"]).toBeDefined();
    expect(states["light.living_room_ceiling"]).toBeUndefined();
  });

  it("is stable across calls", () => {
    const config = { views: [{ cards: [{ type: "tile", entity: "sensor.foo_bar_temperature" }] }] };
    expect(synthesizeMissingEntities(hass, config)).toEqual(
      synthesizeMissingEntities(hass, config),
    );
  });
});

describe("synthesizeRegistryEntries", () => {
  it("guesses an area from the object id", () => {
    const reg = synthesizeRegistryEntries([
      "light.living_room_lamp",
      "sensor.kjokken_temp",
      "switch.mystery_box",
    ]);
    expect(reg["light.living_room_lamp"].area_id).toBe("living_room");
    expect(reg["sensor.kjokken_temp"].area_id).toBe("kitchen");
    expect(reg["switch.mystery_box"].area_id).toBeUndefined();
  });
});
