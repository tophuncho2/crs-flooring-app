import { describe, expect, it, vi } from "vitest"
import { resolveOwnerRecoveryInput, upsertOwnerUser } from "../../packages/db/scripts/owner-recovery.js"

describe("resolveOwnerRecoveryInput", () => {
  it("accepts a positional email argument", () => {
    expect(resolveOwnerRecoveryInput([" Owner@Test.com "])).toEqual({
      email: "owner@test.com",
    })
  })

  it("accepts a flag-based email argument", () => {
    expect(resolveOwnerRecoveryInput(["--email", " Owner@Test.com "])).toEqual({
      email: "owner@test.com",
    })
  })

  it("rejects invalid invocation shapes", () => {
    expect(() => resolveOwnerRecoveryInput([])).toThrow(
      "Usage: node scripts/owner-recovery.js <email> or --email <email>",
    )
  })
})

describe("upsertOwnerUser", () => {
  it("upserts a passwordless DEVELOPER account", async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: "owner-1",
      email: "owner@test.com",
      rank: "DEVELOPER",
      isActive: true,
    })
    const logger = { log: vi.fn() }

    await expect(
      upsertOwnerUser({
        prisma: { user: { upsert } },
        email: " Owner@Test.com ",
        logger,
      }),
    ).resolves.toEqual({
      id: "owner-1",
      email: "owner@test.com",
      rank: "DEVELOPER",
      isActive: true,
    })

    expect(upsert).toHaveBeenCalledWith({
      where: { email: "owner@test.com" },
      update: {
        rank: "DEVELOPER",
        isActive: true,
        emailVerified: true,
      },
      create: {
        email: "owner@test.com",
        rank: "DEVELOPER",
        emailVerified: true,
      },
      select: {
        id: true,
        email: true,
        rank: true,
        isActive: true,
      },
    })
  })

  it("rejects a missing email", async () => {
    await expect(
      upsertOwnerUser({
        prisma: { user: { upsert: vi.fn() } },
        email: "   ",
      }),
    ).rejects.toThrow("Email is required")
  })
})
