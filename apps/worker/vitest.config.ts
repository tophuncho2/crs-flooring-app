import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@builders/db": fileURLToPath(new URL("../../packages/db/src/index.ts", import.meta.url)),
      "@builders/domain": fileURLToPath(new URL("../../packages/domain/src/index.ts", import.meta.url)),
      "@builders/lib": fileURLToPath(new URL("../../packages/lib/src/index.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true,
  },
})
