import { beforeEach, describe, expect, it, vi } from "vitest"

const { findUserByEmailMock } = vi.hoisted(() => ({
  findUserByEmailMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  findUserByEmail: findUserByEmailMock,
}))

import { getAuthAccountStatusUseCase } from "../../src/auth/get-account-status.js"

beforeEach(() => {
  findUserByEmailMock.mockReset()
})

describe("getAuthAccountStatusUseCase", () => {
  it("returns needs-setup when the user exists without a password", async () => {
    findUserByEmailMock.mockResolvedValue({
      id: "u1",
      email: "a@test.com",
      role: "ADMIN",
      password: null,
      isVerified: false,
    })

    await expect(getAuthAccountStatusUseCase({ email: "a@test.com" })).resolves.toEqual({
      status: "needs-setup",
    })
  })

  it("returns needs-password when the user already has a password", async () => {
    findUserByEmailMock.mockResolvedValue({
      id: "u1",
      email: "a@test.com",
      role: "ADMIN",
      password: "hashed",
      isVerified: true,
    })

    await expect(getAuthAccountStatusUseCase({ email: "a@test.com" })).resolves.toEqual({
      status: "needs-password",
    })
  })

  it("returns needs-password for an unknown email (no enumeration)", async () => {
    findUserByEmailMock.mockResolvedValue(null)

    await expect(getAuthAccountStatusUseCase({ email: "missing@test.com" })).resolves.toEqual({
      status: "needs-password",
    })
  })

  it("normalizes the email before lookup", async () => {
    findUserByEmailMock.mockResolvedValue(null)

    await getAuthAccountStatusUseCase({ email: "  MixedCase@Test.com  " })

    expect(findUserByEmailMock).toHaveBeenCalledWith("mixedcase@test.com")
  })
})
