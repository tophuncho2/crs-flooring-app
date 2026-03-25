import { beforeEach, describe, expect, it, vi } from "vitest"
import { deleteContact } from "@/features/flooring/contacts/data/server-mutations"

const prismaMock = vi.hoisted(() => ({
  flooringTemplateSalesRep: {
    count: vi.fn(),
  },
  flooringWorkOrderSalesRep: {
    count: vi.fn(),
  },
  flooringContact: {
    delete: vi.fn(),
  },
}))

vi.mock("@builders/db", async () => {
  const actual = await vi.importActual<typeof import("@builders/db")>("@builders/db")
  return {
    ...actual,
    prisma: prismaMock,
    db: prismaMock,
  }
})

describe("contact server mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("blocks deleting contacts that are linked to work orders", async () => {
    prismaMock.flooringTemplateSalesRep.count.mockResolvedValue(0)
    prismaMock.flooringWorkOrderSalesRep.count.mockResolvedValue(2)

    await expect(deleteContact("contact-1")).rejects.toMatchObject({
      kind: "app",
      status: 409,
      message: "This contact is linked to templates or work orders and cannot be deleted",
    })

    expect(prismaMock.flooringContact.delete).not.toHaveBeenCalled()
  })

  it("deletes contacts that have no work-order sales rep assignments", async () => {
    prismaMock.flooringTemplateSalesRep.count.mockResolvedValue(0)
    prismaMock.flooringWorkOrderSalesRep.count.mockResolvedValue(0)
    prismaMock.flooringContact.delete.mockResolvedValue({ id: "contact-1" })

    await deleteContact("contact-1")

    expect(prismaMock.flooringContact.delete).toHaveBeenCalledWith({
      where: { id: "contact-1" },
    })
  })

  it("blocks deleting contacts that are linked to templates", async () => {
    prismaMock.flooringTemplateSalesRep.count.mockResolvedValue(1)
    prismaMock.flooringWorkOrderSalesRep.count.mockResolvedValue(0)

    await expect(deleteContact("contact-1")).rejects.toMatchObject({
      kind: "app",
      status: 409,
      message: "This contact is linked to templates or work orders and cannot be deleted",
    })

    expect(prismaMock.flooringContact.delete).not.toHaveBeenCalled()
  })
})
