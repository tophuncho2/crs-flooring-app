import { describe, expect, it } from "vitest"
import { resolveSeededSystemUsers } from "../../packages/db/scripts/system-user-seed.js"

describe("resolveSeededSystemUsers", () => {
  it("returns an empty list when no seeded users are configured", () => {
    expect(resolveSeededSystemUsers({})).toEqual([])
  })

  it("normalizes valid admin and builder seed users (passwordless)", () => {
    expect(
      resolveSeededSystemUsers({
        SEEDED_ADMIN_EMAIL: " Admin@Test.com ",
        SEEDED_BUILDER_EMAIL: " Builder@Test.com ",
      }),
    ).toEqual([
      {
        label: "admin",
        rank: "DEVELOPER",
        email: "admin@test.com",
      },
      {
        label: "builder",
        rank: "DEVELOPER",
        email: "builder@test.com",
      },
    ])
  })

  it("skips definitions without a configured email", () => {
    expect(
      resolveSeededSystemUsers({
        SEEDED_BUILDER_EMAIL: "builder@test.com",
      }),
    ).toEqual([
      {
        label: "builder",
        rank: "DEVELOPER",
        email: "builder@test.com",
      },
    ])
  })
})
