import { describe, expect, it, vi } from "vitest"
import { listUserLoginActivityForListView } from "../../src/user-activity/read-repository.js"

// D7 re-point: Login Activity is sourced from Better Auth `Session` rows, NOT the
// retired `UserLoginActivity` table. The fake client deliberately has no
// `userLoginActivity` model, so any regression back to it would throw here.
describe("listUserLoginActivityForListView", () => {
  it("reads Session rows (createdAt -> loggedInAt, joined user email), most-recent-first", async () => {
    const sessionRows = [
      { id: "s-1", createdAt: new Date("2026-06-28T09:00:00.000Z"), user: { email: "otto@crsfloorcovering.com" } },
    ]
    const client = {
      session: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue(sessionRows),
      },
    }

    const result = await listUserLoginActivityForListView({ skip: 0, take: 50 }, client as never)

    expect(client.session.count).toHaveBeenCalledTimes(1)
    const findArg = client.session.findMany.mock.calls[0][0]
    expect(findArg).toMatchObject({ skip: 0, take: 50, orderBy: [{ createdAt: "desc" }, { id: "asc" }] })
    expect(findArg.select).toMatchObject({ id: true, createdAt: true, user: { select: { email: true } } })

    expect(result.total).toBe(1)
    expect(result.rows[0]).toEqual({
      id: "s-1",
      userEmail: "otto@crsfloorcovering.com",
      loggedInAt: "2026-06-28T09:00:00.000Z",
    })
  })
})
