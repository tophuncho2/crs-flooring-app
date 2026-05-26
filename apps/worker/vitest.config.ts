import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@builders/db": fileURLToPath(new URL("../../packages/db/src/index.ts", import.meta.url)),
      "@builders/domain": fileURLToPath(new URL("../../packages/domain/src/index.ts", import.meta.url)),
      // Subpath alias must precede the barrel alias so the more specific key
      // wins — `hashing` is a server-only entry deliberately kept out of the barrel.
      "@builders/lib/hashing": fileURLToPath(new URL("../../packages/lib/src/hashing.ts", import.meta.url)),
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
