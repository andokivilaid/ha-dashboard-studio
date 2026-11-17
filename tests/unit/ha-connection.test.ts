import { describe, expect, it } from "vitest";
import { isAllowedCommand, ReadOnlyViolation } from "@/lib/ha-connection";

/**
 * The read-only guarantee is the project's strongest promise, so it is tested
 * as a list rather than trusted as a convention.
 */
describe("websocket command allow-list", () => {
  it.each([
    "get_states",
    "get_config",
    "auth/current_user",
    "config/entity_registry/list",
    "config/device_registry/list",
    "config/area_registry/list",
    "config/floor_registry/list",
    "lovelace/config",
    "lovelace/dashboards/list",
    "lovelace/resources",
    "frontend/get_themes",
    "subscribe_entities",
  ])("allows %s", (cmd) => {
    expect(isAllowedCommand(cmd)).toBe(true);
  });

  it.each([
    "call_service",
    "execute_script",
    "config/entity_registry/update",
    "config/area_registry/create",
    "lovelace/config/save",
    "lovelace/dashboards/create",
    "config/auth/delete",
    "supervisor/api",
    "render_template",
    "",
  ])("refuses %s", (cmd) => {
    expect(isAllowedCommand(cmd)).toBe(false);
  });

  it("names the refused command in the error", () => {
    const err = new ReadOnlyViolation("call_service");
    expect(err.message).toContain("call_service");
    expect(err.message).toContain("read-only");
    expect(err.name).toBe("ReadOnlyViolation");
  });

  it("allows nothing that writes", () => {
    const writeShaped = /save|create|update|delete|remove|set_|turn_|call_service|execute/;
    const allowed = [
      "get_states", "get_config", "get_services", "get_panels", "auth/current_user",
      "config/entity_registry/list", "config/entity_registry/list_for_display",
      "config/device_registry/list", "config/area_registry/list", "config/floor_registry/list",
      "config/label_registry/list", "lovelace/config", "lovelace/dashboards/list",
      "lovelace/resources", "frontend/get_themes", "subscribe_entities", "subscribe_events", "ping",
    ];
    for (const cmd of allowed) {
      expect(isAllowedCommand(cmd), cmd).toBe(true);
      expect(writeShaped.test(cmd), `${cmd} looks like a write`).toBe(false);
    }
  });
});
