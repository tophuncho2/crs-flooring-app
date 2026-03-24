import { beforeEach, describe, expect, it, vi } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    flooringInventory: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    flooringCutLog: {
      groupBy: vi.fn(),
    },
    flooringWarehouse: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: prismaMock,
}))

vi.mock("@/server/db/prisma-errors", () => ({
  createPrismaPageLoadIssue: vi.fn(),
  isPrismaNotFoundError: vi.fn(),
  withPrismaConnectivityHandling: vi.fn(async (operation: () => Promise<unknown>) => ({
    ok: true,
    data: await operation(),
  })),
}))

const { getInventoryPageData } = await import("@/features/flooring/inventory/data/queries")

describe("getInventoryPageData", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.flooringInventory.count.mockResolvedValue(0)
    prismaMock.flooringInventory.findMany.mockResolvedValue([])
    prismaMock.flooringCutLog.groupBy.mockResolvedValue([])
    prismaMock.flooringWarehouse.findMany.mockResolvedValue([
      { id: "wh-1", name: "Main Warehouse" },
      { id: "wh-2", name: "Overflow Warehouse" },
    ])
  })

  it("applies pending status and warehouse filters to the inventory query", async () => {
    await getInventoryPageData(
      2,
      { searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] },
      { status: "pending", warehouseId: "wh-1" },
    )

    expect(prismaMock.flooringInventory.count).toHaveBeenCalledWith({
      where: {
        AND: expect.arrayContaining([
          {
            importEntry: {
              is: {
                status: "PENDING",
              },
            },
          },
          {
            OR: expect.arrayContaining([
              {
                importEntry: {
                  is: {
                    warehouseId: "wh-1",
                  },
                },
              },
            ]),
          },
        ]),
      },
    })
  })

  it("treats final inventory as final imports plus rows with no import", async () => {
    const result = await getInventoryPageData(
      1,
      { searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] },
      { status: "final", warehouseId: "all" },
    )

    expect(prismaMock.flooringInventory.count).toHaveBeenCalledWith({
      where: {
        OR: [
          {
            importEntry: {
              is: null,
            },
          },
          {
            importEntry: {
              is: {
                status: "FINAL",
              },
            },
          },
        ],
      },
    })
    expect(result.data.warehouseOptions).toEqual([
      { id: "wh-1", name: "Main Warehouse" },
      { id: "wh-2", name: "Overflow Warehouse" },
    ])
  })
})
