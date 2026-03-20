import { beforeEach, describe, expect, it, vi } from "vitest"
import { DELETE } from "@/app/api/flooring/inventory/[id]/route"

const { prismaMock, ensureBuilderOrAdminMock } = vi.hoisted(() => ({
  prismaMock: {
    flooringInventory: {
      delete: vi.fn(),
    },
  },
  ensureBuilderOrAdminMock: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: prismaMock,
}))

vi.mock("@/server/auth/route-auth", () => ({
  ensureBuilderOrAdmin: ensureBuilderOrAdminMock,
}))

describe("inventory routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ensureBuilderOrAdminMock.mockResolvedValue(null)
  })

  it("DELETE removes an inventory row and enforces warehouse auth", async () => {
    const response = await DELETE(new Request("http://localhost/api/flooring/inventory/inv-1"), {
      params: Promise.resolve({ id: "inv-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ ok: true })
    expect(prismaMock.flooringInventory.delete).toHaveBeenCalledWith({ where: { id: "inv-1" } })
    expect(ensureBuilderOrAdminMock).toHaveBeenCalledWith({ toolSlug: "warehouse" })
  })
})
