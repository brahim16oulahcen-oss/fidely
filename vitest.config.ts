import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/stubs/empty.ts"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    testTimeout: 20000,
    env: { FIDELY_PERSIST: "false", DEMO_MODE: "true", SESSION_SECRET: "test-secret-test-secret-test-secret" },
  },
});
