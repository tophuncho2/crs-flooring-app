import { describe, expect, it } from "vitest"
import { resetDatabaseEnvironmentCacheForTests, validateDatabaseEnvironment } from "@builders/db"

describe("validateDatabaseEnvironment", () => {
  it("accepts a configured database url", () => {
    const parsed = validateDatabaseEnvironment({
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/builderswebapp",
    })

    expect(parsed.DATABASE_URL).toContain("postgresql://")
  })

  it("rejects missing database urls", () => {
    expect(() => validateDatabaseEnvironment({})).toThrow("DATABASE_URL is required")
  })

  it("can clear the cached environment between tests", () => {
    resetDatabaseEnvironmentCacheForTests()

    expect(() =>
      validateDatabaseEnvironment({
        DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/builderswebapp",
      }),
    ).not.toThrow()
  })
})
