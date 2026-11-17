// Vitest config (ESM)
import { defineConfig } from "vitest/config";
import path from "node:path";

const root = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      "@ha-studio/lovelace": path.resolve(root, "packages/lovelace/src/index.ts"),
      "@ha-studio/catalog": path.resolve(root, "packages/catalog/src/index.ts"),
      "@": path.resolve(root, "apps/web/src"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    globals: false,
    reporters: ["default"],
  },
});
