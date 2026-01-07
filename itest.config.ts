import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["itest/**/*.itest.ts"],
    exclude: ["dist", "node_modules"],
  },
});
