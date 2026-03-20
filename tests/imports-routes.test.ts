import { beforeEach, describe, expect, it, vi } from "vitest"
import { DELETE } from "@/app/api/flooring/imports/[id]/route"

const { prismaMock, ensureBuilderOrAdminMock } = vi.hoisted(() => ({
  prismaMock: {
    flooringImportEntry: {
      findUnique: vi.fn(),
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

describe("imports routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ensureBuilderOrAdminMock.mockResolvedValue(null)
  })

  it("DELETE returns 404 when the import is missing", async () => {
    prismaMock.flooringImportEntry.findUnique.mockResolvedValue(null)

    const response = await DELETE(new Request("http://localhost/api/flooring/imports/imp-1"), {
      params: Promise.resolve({ id: "imp-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(404)
    expect(payload.error).toBe("Import not found")
    expect(prismaMock.flooringImportEntry.delete).not.toHaveBeenCalled()
  })

  it("DELETE returns 409 when the import still has inventory rows", async () => {
    prismaMock.flooringImportEntry.findUnique.mockResolvedValue({
      id: "imp-1",
      _count: { inventories: 2 },
    })

    const response = await DELETE(new Request("http://localhost/api/flooring/imports/imp-1"), {
      params: Promise.resolve({ id: "imp-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("This import has inventory rows and cannot be deleted")
    expect(prismaMock.flooringImportEntry.delete).not.toHaveBeenCalled()
  })

  it("DELETE succeeds when there are no inventory rows", async () => {
    prismaMock.flooringImportEntry.findUnique.mockResolvedValue({
      id: "imp-1",
      _count: { inventories: 0 },
    })

    const response = await DELETE(new Request("http://localhost/api/flooring/imports/imp-1"), {
      params: Promise.resolve({ id: "imp-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ ok: true })
    expect(prismaMock.flooringImportEntry.delete).toHaveBeenCalledWith({ where: { id: "imp-1" } })
    expect(ensureBuilderOrAdminMock).toHaveBeenCalledWith({ toolSlug: "warehouse" })
  })
})
