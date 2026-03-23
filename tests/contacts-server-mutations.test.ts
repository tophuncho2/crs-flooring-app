import { beforeEach, describe, expect, it, vi } from "vitest"
import { deleteContact } from "@/features/flooring/contacts/data/server-mutations"

const prismaMock = vi.hoisted(() => ({
  flooringWorkOrderSalesRep: {
    count: vi.fn(),
  },
  flooringContact: {
    delete: vi.fn(),
  },
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: prismaMock,
}))

describe("contact server mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("blocks deleting contacts that are linked to work orders", async () => {
    prismaMock.flooringWorkOrderSalesRep.count.mockResolvedValue(2)

    await expect(deleteContact("contact-1")).rejects.toMatchObject({
      kind: "app",
      status: 409,
      message: "This contact is linked to work orders and cannot be deleted",
    })

    expect(prismaMock.flooringContact.delete).not.toHaveBeenCalled()
  })

  it("deletes contacts that have no work-order sales rep assignments", async () => {
    prismaMock.flooringWorkOrderSalesRep.count.mockResolvedValue(0)
    prismaMock.flooringContact.delete.mockResolvedValue({ id: "contact-1" })

    await deleteContact("contact-1")

    expect(prismaMock.flooringContact.delete).toHaveBeenCalledWith({
      where: { id: "contact-1" },
    })
  })
})
