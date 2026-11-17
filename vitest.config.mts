// Vitest config (ESM)
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@ha-studio/lovelace": path.resolve(__dirname, "packages/lovelace/src/index.ts"),
      "@ha-studio/catalog": path.resolve(__dirname, "packages/catalog/src/index.ts"),
      "@": path.resolve(__dirname, "apps/web/src"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    globals: false,
    reporters: ["default"],
  },
});
