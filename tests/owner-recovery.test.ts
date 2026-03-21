import { describe, expect, it, vi } from "vitest"
import { resolveOwnerRecoveryInput, upsertOwnerUser } from "../prisma/owner-recovery.js"

describe("resolveOwnerRecoveryInput", () => {
  it("accepts positional email and password arguments", () => {
    expect(resolveOwnerRecoveryInput([" Owner@Test.com ", "Owner-Password-123" ])).toEqual({
      email: "owner@test.com",
      password: "Owner-Password-123",
    })
  })

  it("accepts flag-based email and password arguments", () => {
    expect(resolveOwnerRecoveryInput(["--email", " Owner@Test.com ", "--password", "Owner-Password-123"])).toEqual({
      email: "owner@test.com",
      password: "Owner-Password-123",
    })
  })

  it("rejects invalid invocation shapes", () => {
    expect(() => resolveOwnerRecoveryInput([])).toThrow(
      "Usage: node prisma/owner-recovery.js <email> <password> or --email <email> --password <password>",
    )
  })
})

describe("upsertOwnerUser", () => {
  it("upserts a verified owner account", async () => {
    const hash = vi.fn().mockResolvedValue("hashed-password")
    const upsert = vi.fn().mockResolvedValue({
      id: "owner-1",
      email: "owner@test.com",
      role: "OWNER",
      isVerified: true,
    })
    const logger = { log: vi.fn() }

    await expect(
      upsertOwnerUser({
        prisma: {
          user: {
            upsert,
          },
        },
        bcrypt: {
          hash,
        },
        email: " Owner@Test.com ",
        password: "Owner-Password-123",
        logger,
      }),
    ).resolves.toEqual({
      id: "owner-1",
      email: "owner@test.com",
      role: "OWNER",
      isVerified: true,
    })

    expect(hash).toHaveBeenCalledWith("Owner-Password-123", 10)
    expect(upsert).toHaveBeenCalledWith({
      where: { email: "owner@test.com" },
      update: {
        password: "hashed-password",
        role: "OWNER",
        isVerified: true,
      },
      create: {
        email: "owner@test.com",
        password: "hashed-password",
        role: "OWNER",
        isVerified: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isVerified: true,
      },
    })
  })

  it("rejects weak passwords", async () => {
    await expect(
      upsertOwnerUser({
        prisma: {
          user: {
            upsert: vi.fn(),
          },
        },
        bcrypt: {
          hash: vi.fn(),
        },
        email: "owner@test.com",
        password: "short",
      }),
    ).rejects.toThrow("Password must be at least 12 characters")
  })
})
