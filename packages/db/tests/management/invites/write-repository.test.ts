import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createInviteRecord,
  deleteInviteById,
  markInviteAcceptedByEmail,
} from "../../../src/management/invites/write-repository.js"

function makeClient() {
  return {
    userInvite: {
      create: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
  }
}

const ROW = {
  id: "inv-1",
  email: "newhire@crsfloorcovering.com",
  rank: "TIER_2",
  invitedBy: "otto@crsfloorcovering.com",
  expiresAt: new Date("2026-07-05T00:00:00.000Z"),
  acceptedAt: null,
  createdAt: new Date("2026-06-28T00:00:00.000Z"),
}

describe("createInviteRecord", () => {
  it("inserts email/rank/invitedBy/expiresAt and NO token, returning the normalized invite", async () => {
    const client = makeClient()
    client.userInvite.create.mockResolvedValue(ROW)

    const result = await createInviteRecord(
      {
        email: "newhire@crsfloorcovering.com",
        rank: "TIER_2",
        invitedBy: "otto@crsfloorcovering.com",
        expiresAt: ROW.expiresAt,
      },
      client as never,
    )

    expect(client.userInvite.create).toHaveBeenCalledTimes(1)
    const arg = client.userInvite.create.mock.calls[0][0]
    expect(arg.data).toMatchObject({
      email: "newhire@crsfloorcovering.com",
      rank: "TIER_2",
      invitedBy: "otto@crsfloorcovering.com",
      expiresAt: ROW.expiresAt,
    })
    // The token column was dropped — it must never be written.
    expect(arg.data).not.toHaveProperty("token")
    expect(result).toMatchObject({ id: "inv-1", email: "newhire@crsfloorcovering.com", acceptedAt: null })
    expect(result).not.toHaveProperty("token")
  })
})

describe("markInviteAcceptedByEmail", () => {
  it("STAMPS acceptedAt on the open invite (updateMany) and never deletes the row", async () => {
    const client = makeClient()
    client.userInvite.updateMany.mockResolvedValue({ count: 1 })
    const acceptedAt = new Date("2026-06-28T12:00:00.000Z")

    await markInviteAcceptedByEmail("newhire@crsfloorcovering.com", acceptedAt, client as never)

    expect(client.userInvite.updateMany).toHaveBeenCalledWith({
      where: { email: "newhire@crsfloorcovering.com", acceptedAt: null },
      data: { acceptedAt },
    })
    // Accepting an invite must retire it in place — not delete it.
    expect(client.userInvite.delete).not.toHaveBeenCalled()
  })
})

describe("deleteInviteById", () => {
  it("hard-deletes the invite row by id (revoke path)", async () => {
    const client = makeClient()
    client.userInvite.delete.mockResolvedValue(undefined)

    await deleteInviteById("inv-1", client as never)

    expect(client.userInvite.delete).toHaveBeenCalledWith({ where: { id: "inv-1" } })
    expect(client.userInvite.updateMany).not.toHaveBeenCalled()
  })
})
