import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    clearMocks: true,
    restoreMocks: true,
    setupFiles: ["tests/setup.ts"],
    // Throwaway auth config so test files that transitively import the Better Auth
    // instance (via `server/auth/session`) can construct it — `getAuthEnvironment`
    // now fails closed at module load when these are absent.
    env: {
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: "test-better-auth-secret-value",
      GOOGLE_CLIENT_ID: "test-google-client-id",
      GOOGLE_CLIENT_SECRET: "test-google-client-secret",
    },
  },
})
