import { beforeEach, describe, expect, it, vi } from "vitest"

const { findUserByEmailMock, recordUserLoginActivityMock, bcryptCompareMock } = vi.hoisted(() => ({
  findUserByEmailMock: vi.fn(),
  recordUserLoginActivityMock: vi.fn(),
  bcryptCompareMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  findUserByEmail: findUserByEmailMock,
  recordUserLoginActivity: recordUserLoginActivityMock,
}))

vi.mock("bcrypt", () => ({
  default: {
    compare: bcryptCompareMock,
    hashSync: () => "dummy-hash",
  },
}))

import { authenticateCredentialsUseCase } from "../../src/auth/authenticate-credentials.js"

const verifiedUser = {
  id: "u1",
  email: "user@test.com",
  rank: "DEVELOPER",
  password: "hashed",
  isVerified: true,
}

beforeEach(() => {
  findUserByEmailMock.mockReset()
  recordUserLoginActivityMock.mockReset()
  bcryptCompareMock.mockReset()
})

describe("authenticateCredentialsUseCase", () => {
  it("returns ok and records login activity for valid verified credentials", async () => {
    findUserByEmailMock.mockResolvedValue(verifiedUser)
    bcryptCompareMock.mockResolvedValue(true)

    const result = await authenticateCredentialsUseCase({ email: "User@Test.com ", password: "right" })

    expect(result).toEqual({
      outcome: "ok",
      user: { id: "u1", email: "user@test.com", rank: "DEVELOPER", isVerified: true },
    })
    expect(findUserByEmailMock).toHaveBeenCalledWith("user@test.com")
    expect(recordUserLoginActivityMock).toHaveBeenCalledWith({ userId: "u1", userEmail: "user@test.com" })
  })

  it("returns invalid-credentials for a wrong password and does not record activity", async () => {
    findUserByEmailMock.mockResolvedValue(verifiedUser)
    bcryptCompareMock.mockResolvedValue(false)

    const result = await authenticateCredentialsUseCase({ email: "user@test.com", password: "wrong" })

    expect(result).toEqual({ outcome: "invalid-credentials" })
    expect(recordUserLoginActivityMock).not.toHaveBeenCalled()
  })

  it("returns invalid-credentials for an unknown email but still runs a compare (timing parity)", async () => {
    findUserByEmailMock.mockResolvedValue(null)
    bcryptCompareMock.mockResolvedValue(false)

    const result = await authenticateCredentialsUseCase({ email: "missing@test.com", password: "whatever" })

    expect(result).toEqual({ outcome: "invalid-credentials" })
    expect(bcryptCompareMock).toHaveBeenCalledTimes(1)
  })

  it("returns account-restricted for an unverified user", async () => {
    findUserByEmailMock.mockResolvedValue({ ...verifiedUser, isVerified: false })
    bcryptCompareMock.mockResolvedValue(true)

    const result = await authenticateCredentialsUseCase({ email: "user@test.com", password: "right" })

    expect(result).toEqual({ outcome: "account-restricted", userId: "u1", userEmail: "user@test.com" })
    expect(recordUserLoginActivityMock).not.toHaveBeenCalled()
  })
})
