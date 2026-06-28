import { describe, expect, it, vi } from "vitest"
import {
  findOpenInviteByEmail,
  listInvitesForListView,
} from "../../../src/management/invites/read-repository.js"

const NOW = new Date("2026-06-28T00:00:00.000Z")

describe("findOpenInviteByEmail", () => {
  it("queries only open invites (not accepted, not expired), newest first", async () => {
    const row = {
      id: "inv-1",
      email: "a@crsfloorcovering.com",
      rank: "TIER_2",
      invitedBy: "otto@crsfloorcovering.com",
      expiresAt: new Date("2026-07-05T00:00:00.000Z"),
      acceptedAt: null,
      createdAt: NOW,
    }
    const client = { userInvite: { findFirst: vi.fn().mockResolvedValue(row) } }

    const result = await findOpenInviteByEmail("a@crsfloorcovering.com", NOW, client as never)

    expect(client.userInvite.findFirst).toHaveBeenCalledWith({
      where: { email: "a@crsfloorcovering.com", acceptedAt: null, expiresAt: { gt: NOW } },
      orderBy: { createdAt: "desc" },
    })
    expect(result).toMatchObject({ id: "inv-1", rank: "TIER_2" })
  })

  it("returns null when no open invite exists", async () => {
    const client = { userInvite: { findFirst: vi.fn().mockResolvedValue(null) } }
    expect(await findOpenInviteByEmail("nobody@crsfloorcovering.com", NOW, client as never)).toBeNull()
  })
})

describe("listInvitesForListView", () => {
  it("counts + lists open invites only and returns normalized rows", async () => {
    const rows = [
      {
        id: "inv-1",
        email: "a@crsfloorcovering.com",
        rank: "TIER_2",
        invitedBy: "otto@crsfloorcovering.com",
        expiresAt: new Date("2026-07-05T00:00:00.000Z"),
        createdAt: NOW,
      },
    ]
    const client = {
      userInvite: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue(rows),
      },
    }

    const result = await listInvitesForListView({ skip: 0, take: 50 }, NOW, client as never)

    const openWhere = { acceptedAt: null, expiresAt: { gt: NOW } }
    expect(client.userInvite.count).toHaveBeenCalledWith({ where: openWhere })
    const findArg = client.userInvite.findMany.mock.calls[0][0]
    expect(findArg.where).toEqual(openWhere)
    expect(findArg).toMatchObject({ skip: 0, take: 50, orderBy: [{ createdAt: "desc" }, { id: "asc" }] })
    expect(result.total).toBe(1)
    expect(result.rows[0]).toMatchObject({ id: "inv-1", email: "a@crsfloorcovering.com", rank: "TIER_2" })
  })
})
