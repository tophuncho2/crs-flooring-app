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
    flooringCategory: {
      findMany: vi.fn(),
    },
    flooringProduct: {
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

const { getInventoryPageData, listInventoryPageFilterOptions } = await import("@/features/flooring/inventory/data/queries")

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
    prismaMock.flooringCategory.findMany.mockResolvedValue([
      { id: "cat-1", name: "Hard Surface" },
    ])
    prismaMock.flooringProduct.findMany.mockResolvedValue([
      {
        id: "prod-1",
        name: "Oak Plank",
        style: "Prime",
        color: "Natural",
        category: { name: "Hard Surface" },
      },
    ])
  })

  it("applies pending status and warehouse filters to the inventory query", async () => {
    await getInventoryPageData(
      2,
      { searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] },
      { status: "pending", warehouseId: "wh-1", categoryId: "all", productId: "all" },
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
      { status: "final", warehouseId: "all", categoryId: "all", productId: "all" },
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
    expect(result.data.filterState).toEqual({
      status: "final",
      warehouseId: "all",
      categoryId: "all",
      productId: "all",
    })
  })

  it("applies category and product filters to the inventory query", async () => {
    await getInventoryPageData(
      1,
      { searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] },
      { status: "all", warehouseId: "all", categoryId: "cat-1", productId: "prod-1" },
    )

    expect(prismaMock.flooringInventory.count).toHaveBeenCalledWith({
      where: {
        AND: expect.arrayContaining([
          {
            product: {
              categoryId: "cat-1",
            },
          },
          {
            productId: "prod-1",
          },
        ]),
      },
    })
  })

  it("lists canonical inventory filter options for warehouse, category, and product", async () => {
    const result = await listInventoryPageFilterOptions()

    expect(result).toEqual({
      warehouseOptions: [
        { id: "wh-1", name: "Main Warehouse" },
        { id: "wh-2", name: "Overflow Warehouse" },
      ],
      categoryOptions: [
        { id: "cat-1", name: "Hard Surface" },
      ],
      productOptions: [
        { id: "prod-1", label: "Oak Plank" },
      ],
    })
  })
})
