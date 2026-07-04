import { describe, expect, it, vi } from "vitest"
import {
  deleteUserRecordById,
  deleteUserSessions,
  setUserRank,
} from "../../../src/management/users/write-repository.js"

const USER_ROW = {
  id: "u-1",
  email: "joe@crsfloorcovering.com",
  rank: "TIER_2",
  createdAt: new Date("2026-06-01T00:00:00.000Z"),
  updatedAt: new Date("2026-06-28T00:00:00.000Z"),
}

describe("setUserRank", () => {
  it("updates only rank and returns the normalized row (with updatedAt token)", async () => {
    const client = { user: { update: vi.fn().mockResolvedValue({ ...USER_ROW, rank: "TIER_1" }) } }

    const result = await setUserRank("u-1", "TIER_1", client as never)

    const arg = client.user.update.mock.calls[0][0]
    expect(arg.where).toEqual({ id: "u-1" })
    expect(arg.data).toEqual({ rank: "TIER_1" })
    expect(result).toMatchObject({ id: "u-1", rank: "TIER_1", updatedAt: "2026-06-28T00:00:00.000Z" })
  })
})

describe("deleteUserRecordById", () => {
  it("deletes the user row by id (cascade removes sessions/accounts/receipts)", async () => {
    const client = { user: { delete: vi.fn().mockResolvedValue(USER_ROW) } }

    await deleteUserRecordById("u-1", client as never)

    expect(client.user.delete).toHaveBeenCalledWith({ where: { id: "u-1" } })
  })
})

describe("deleteUserSessions", () => {
  it("revokes every session for the user (immediate lockout)", async () => {
    const client = { session: { deleteMany: vi.fn().mockResolvedValue({ count: 3 }) } }

    await deleteUserSessions("u-1", client as never)

    expect(client.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "u-1" } })
  })
})
