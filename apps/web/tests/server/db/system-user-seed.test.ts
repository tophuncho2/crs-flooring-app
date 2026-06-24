import { describe, expect, it } from "vitest"
import { resolveSeededSystemUsers } from "../../packages/db/scripts/system-user-seed.js"

describe("resolveSeededSystemUsers", () => {
  it("returns an empty list when no seeded users are configured", () => {
    expect(resolveSeededSystemUsers({})).toEqual([])
  })

  it("normalizes valid admin and builder seed users", () => {
    expect(
      resolveSeededSystemUsers({
        SEEDED_ADMIN_EMAIL: " Admin@Test.com ",
        SEEDED_ADMIN_PASSWORD: "Admin-Seed-7Nw!4Qk2Lp",
        SEEDED_BUILDER_EMAIL: " Builder@Test.com ",
        SEEDED_BUILDER_PASSWORD: "Builder-Seed-3Hv!8Tx5Mz",
      }),
    ).toEqual([
      {
        label: "admin",
        rank: "DEVELOPER",
        email: "admin@test.com",
        password: "Admin-Seed-7Nw!4Qk2Lp",
      },
      {
        label: "builder",
        rank: "DEVELOPER",
        email: "builder@test.com",
        password: "Builder-Seed-3Hv!8Tx5Mz",
      },
    ])
  })

  it("rejects partial or weak seeded-user configuration", () => {
    expect(() =>
      resolveSeededSystemUsers({
        SEEDED_ADMIN_EMAIL: "admin@test.com",
        SEEDED_BUILDER_PASSWORD: "short",
      }),
    ).toThrowError(
      "SEEDED_ADMIN_PASSWORD is required when configuring the admin seed user; SEEDED_BUILDER_EMAIL is required when configuring the builder seed user; SEEDED_BUILDER_PASSWORD must be at least 12 characters",
    )
  })
})
