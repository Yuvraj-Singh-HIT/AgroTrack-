import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["backend/src/**/*.ts", "frontend/src/lib/**/*.ts"],
    },
  },
  resolve: {
    alias: {
      "@backend": path.resolve(__dirname, "backend/src"),
    },
  },
});
