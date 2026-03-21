import { describe, expect, it, vi } from "vitest"
import { promoteUserToAdmin, resolveAdminRecoveryTarget } from "../prisma/admin-recovery.js"

describe("resolveAdminRecoveryTarget", () => {
  it("accepts a positional email argument", () => {
    expect(resolveAdminRecoveryTarget([" Admin@Test.com "])).toBe("admin@test.com")
  })

  it("accepts the --email flag", () => {
    expect(resolveAdminRecoveryTarget(["--email", " Admin@Test.com "])).toBe("admin@test.com")
  })

  it("rejects missing or invalid args", () => {
    expect(() => resolveAdminRecoveryTarget([])).toThrow(
      "Usage: node prisma/admin-recovery.js <email> or --email <email>",
    )
    expect(() => resolveAdminRecoveryTarget(["--email"])).toThrow(
      "Usage: node prisma/admin-recovery.js <email> or --email <email>",
    )
  })
})

describe("promoteUserToAdmin", () => {
  it("promotes an existing builder to a verified admin", async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: "user-1",
      email: "builder@test.com",
      role: "BUILDER",
      isVerified: false,
    })
    const update = vi.fn().mockResolvedValue({
      id: "user-1",
      email: "builder@test.com",
      role: "ADMIN",
      isVerified: true,
    })
    const logger = { log: vi.fn() }

    await expect(
      promoteUserToAdmin({
        prisma: {
          user: {
            findUnique,
            update,
          },
        },
        email: " Builder@Test.com ",
        logger,
      }),
    ).resolves.toEqual({
      id: "user-1",
      email: "builder@test.com",
      role: "ADMIN",
      isVerified: true,
      changed: true,
    })

    expect(findUnique).toHaveBeenCalledWith({
      where: { email: "builder@test.com" },
      select: {
        id: true,
        email: true,
        role: true,
        isVerified: true,
      },
    })
    expect(update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        role: "ADMIN",
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

  it("is a no-op for an already verified admin", async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: "user-1",
      email: "admin@test.com",
      role: "ADMIN",
      isVerified: true,
    })
    const update = vi.fn()
    const logger = { log: vi.fn() }

    await expect(
      promoteUserToAdmin({
        prisma: {
          user: {
            findUnique,
            update,
          },
        },
        email: "admin@test.com",
        logger,
      }),
    ).resolves.toEqual({
      id: "user-1",
      email: "admin@test.com",
      role: "ADMIN",
      isVerified: true,
      changed: false,
    })

    expect(update).not.toHaveBeenCalled()
  })

  it("fails when the user does not exist", async () => {
    const findUnique = vi.fn().mockResolvedValue(null)

    await expect(
      promoteUserToAdmin({
        prisma: {
          user: {
            findUnique,
          },
        },
        email: "missing@test.com",
      }),
    ).rejects.toThrow("No user found for missing@test.com")
  })
})
