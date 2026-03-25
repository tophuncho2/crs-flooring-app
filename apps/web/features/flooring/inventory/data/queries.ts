import { Prisma, prisma } from "@builders/db"
import {
  createPrismaPageLoadIssue,
  isPrismaNotFoundError,
  withPrismaConnectivityHandling,
  type PrismaDetailPageResult,
} from "@builders/db"
import { listInventoryLocationOptions, normalizeInventoryRow } from "./api"
import { appendUniqueOrderBy, createServerPagination, type ServerTableQueryState } from "@/server/pagination"
import {
  type InventoryPageFilterState,
} from "@/features/flooring/inventory/domain/filters"
import { buildFlooringProductDisplayName } from "@/features/flooring/shared/domain/product-display-name"

function coerceFilterArray(value: string[] | string | undefined) {
  if (Array.isArray(value)) {
    return value.filter((entry) => entry.length > 0 && entry !== "all")
  }

  if (typeof value === "string" && value.length > 0 && value !== "all") {
    return [value]
  }

  return []
}

function buildInventorySearchWhere(searchQuery: string): Prisma.FlooringInventoryWhereInput | undefined {
  if (!searchQuery) return undefined

  const numericImportNumber = Number(searchQuery)
  const numericSearchClauses =
    Number.isFinite(numericImportNumber) && searchQuery.trim() !== ""
      ? [{ importEntry: { is: { importNumber: Math.floor(numericImportNumber) } } }]
      : []

  return {
    OR: [
      ...numericSearchClauses,
      { itemNumber: { contains: searchQuery, mode: "insensitive" } },
      { dyeLot: { contains: searchQuery, mode: "insensitive" } },
      { notes: { contains: searchQuery, mode: "insensitive" } },
      {
        product: {
          OR: [
            { name: { contains: searchQuery, mode: "insensitive" } },
            { manufacturerName: { contains: searchQuery, mode: "insensitive" } },
            { style: { contains: searchQuery, mode: "insensitive" } },
            { color: { contains: searchQuery, mode: "insensitive" } },
          ],
        },
      },
      { location: { is: { locationCode: { contains: searchQuery, mode: "insensitive" } } } },
      { location: { is: { warehouse: { name: { contains: searchQuery, mode: "insensitive" } } } } },
      { location: { is: { section: { is: { name: { contains: searchQuery, mode: "insensitive" } } } } } },
      { importEntry: { is: { tag: { contains: searchQuery, mode: "insensitive" } } } },
      { importEntry: { is: { status: { contains: searchQuery, mode: "insensitive" } } } },
      { importEntry: { is: { transportType: { contains: searchQuery, mode: "insensitive" } } } },
    ],
  }
}

function buildInventoryStatusWhere(statuses: InventoryPageFilterState["status"]): Prisma.FlooringInventoryWhereInput | undefined {
  const normalizedStatuses = coerceFilterArray(statuses)
  const includesPending = normalizedStatuses.includes("pending")
  const includesFinal = normalizedStatuses.includes("final")

  if (normalizedStatuses.length === 0 || (includesPending && includesFinal)) {
    return undefined
  }

  if (includesPending) {
    return {
      importEntry: {
        is: {
          status: "PENDING",
        },
      },
    }
  }

  return {
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
  }
}

function buildInventoryWarehouseWhere(warehouseIds: string[] | string): Prisma.FlooringInventoryWhereInput | undefined {
  const normalizedWarehouseIds = coerceFilterArray(warehouseIds)
  if (normalizedWarehouseIds.length === 0) {
    return undefined
  }

  return {
    OR: [
      {
        importEntry: {
          is: {
            warehouseId: {
              in: normalizedWarehouseIds,
            },
          },
        },
      },
      {
        AND: [
          {
            importEntry: {
              is: null,
            },
          },
          {
            location: {
              is: {
                warehouseId: {
                  in: normalizedWarehouseIds,
                },
              },
            },
          },
        ],
      },
    ],
  }
}

function buildInventoryCategoryWhere(categoryIds: string[] | string): Prisma.FlooringInventoryWhereInput | undefined {
  const normalizedCategoryIds = coerceFilterArray(categoryIds)
  if (normalizedCategoryIds.length === 0) {
    return undefined
  }

  return {
    product: {
      categoryId: {
        in: normalizedCategoryIds,
      },
    },
  }
}

function buildInventoryProductWhere(productIds: string[] | string): Prisma.FlooringInventoryWhereInput | undefined {
  const normalizedProductIds = coerceFilterArray(productIds)
  if (normalizedProductIds.length === 0) {
    return undefined
  }

  return {
    productId: {
      in: normalizedProductIds,
    },
  }
}

function buildInventoryWhere(searchQuery: string, filters: InventoryPageFilterState): Prisma.FlooringInventoryWhereInput | undefined {
  const whereClauses = [
    buildInventorySearchWhere(searchQuery),
    buildInventoryStatusWhere(filters.status),
    buildInventoryWarehouseWhere(filters.warehouseId),
    buildInventoryCategoryWhere(filters.categoryId),
    buildInventoryProductWhere(filters.productId),
  ].filter(Boolean) as Prisma.FlooringInventoryWhereInput[]

  if (whereClauses.length === 0) {
    return undefined
  }

  if (whereClauses.length === 1) {
    return whereClauses[0]
  }

  return {
    AND: whereClauses,
  }
}

function buildInventoryOrderBy(tableState: ServerTableQueryState): Prisma.FlooringInventoryOrderByWithRelationInput[] {
  const direction: Prisma.SortOrder = tableState.isAscendingSort ? "asc" : "desc"
  const orderBy: Prisma.FlooringInventoryOrderByWithRelationInput[] = []
  const fieldMap: Record<string, Prisma.FlooringInventoryOrderByWithRelationInput> = {
    importNumber: { importEntry: { importNumber: direction } },
    importTag: { importEntry: { tag: direction } },
    status: { importEntry: { status: direction } },
    transport: { importEntry: { transportType: direction } },
    product: { product: { name: direction } },
    itemNumber: { itemNumber: direction },
    section: { location: { section: { name: direction } } },
    location: { location: { locationCode: direction } },
    warehouse: { location: { warehouse: { name: direction } } },
    dyeLot: { dyeLot: direction },
    cost: { cost: direction },
    freight: { freight: direction },
    updated: { updatedAt: direction },
  }

  if (tableState.isGroupingEnabled) {
    for (const groupKey of tableState.groupByKeys) {
      appendUniqueOrderBy(orderBy, fieldMap[groupKey])
    }
  }

  appendUniqueOrderBy(orderBy, { itemNumber: direction })

  return orderBy
}

async function listInventoryWarehouseOptions() {
  return prisma.flooringWarehouse.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: [{ name: "asc" }],
  })
}

export async function listInventoryPageFilterOptions() {
  const [warehouseOptions, categoryOptions, productOptions] = await Promise.all([
    listInventoryWarehouseOptions(),
    prisma.flooringCategory.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: [{ name: "asc" }],
    }),
    prisma.flooringProduct.findMany({
      select: {
        id: true,
        name: true,
        style: true,
        color: true,
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ name: "asc" }, { style: "asc" }, { color: "asc" }],
    }),
  ])

  return {
    warehouseOptions,
    categoryOptions,
    productOptions: productOptions.map((product) => ({
      id: product.id,
      label: buildFlooringProductDisplayName({
        name: product.name,
        style: product.style,
        color: product.color,
        categoryName: product.category.name,
      }),
    })),
  }
}

async function loadInventoryPageData(page: number, tableState: ServerTableQueryState, filters: InventoryPageFilterState) {
  const where = buildInventoryWhere(tableState.searchQuery, filters)
  const totalItems = await prisma.flooringInventory.count({ where })
  const pagination = createServerPagination({ page, totalItems })
  const inventory = await prisma.flooringInventory.findMany({
    where,
    include: {
      product: {
        select: {
          id: true,
          name: true,
          manufacturerName: true,
          style: true,
          color: true,
          category: { select: { stockUnit: { select: { name: true } } } },
        },
      },
      location: {
        select: {
          id: true,
          locationCode: true,
          section: { select: { name: true } },
          warehouse: { select: { id: true, name: true } },
        },
      },
      importEntry: {
        select: {
          id: true,
          importNumber: true,
          tag: true,
          status: true,
          transportType: true,
          warehouse: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: buildInventoryOrderBy(tableState),
    skip: pagination.skip,
    take: pagination.take,
  })
  const cutLogTotals = inventory.length
    ? await prisma.flooringCutLog.groupBy({
        by: ["inventoryId"],
        where: {
          inventoryId: {
            in: inventory.map((row) => row.id),
          },
        },
        _sum: {
          cut: true,
        },
      })
    : []
  const cutTotalByInventoryId = new Map(cutLogTotals.map((row) => [row.inventoryId, row._sum.cut ?? 0]))

  return {
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: pagination.totalItems,
      totalPages: pagination.totalPages,
    },
    tableState,
    filterState: filters,
    initialInventory: inventory.map((row) =>
      normalizeInventoryRow({
        ...row,
        cutTotal: cutTotalByInventoryId.get(row.id) ?? 0,
      }),
    ),
  }
}

export async function getInventoryPageData(page: number, tableState: ServerTableQueryState, filters: InventoryPageFilterState) {
  return withPrismaConnectivityHandling(() => loadInventoryPageData(page, tableState, filters))
}

export async function getInventoryById(id: string) {
  const row = await prisma.flooringInventory.findUniqueOrThrow({
    where: { id },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          manufacturerName: true,
          style: true,
          color: true,
          category: { select: { stockUnit: { select: { name: true } } } },
        },
      },
      location: {
        select: {
          id: true,
          locationCode: true,
          section: { select: { name: true } },
          warehouse: { select: { id: true, name: true } },
        },
      },
      importEntry: {
        select: {
          id: true,
          importNumber: true,
          tag: true,
          status: true,
          transportType: true,
          warehouse: { select: { id: true, name: true } },
        },
      },
      cutLogs: {
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          inventoryId: true,
          before: true,
          cut: true,
          after: true,
          notes: true,
          createdAt: true,
        },
      },
    },
  })

  return normalizeInventoryRow(row)
}

export async function getInventoryDetailPageData(id: string): Promise<PrismaDetailPageResult<{
  inventory: Awaited<ReturnType<typeof getInventoryById>>
  locationOptions: Awaited<ReturnType<typeof listInventoryLocationOptions>>
}>> {
  try {
    const [inventory, locationOptions] = await Promise.all([
      getInventoryById(id),
      listInventoryLocationOptions(),
    ])

    return {
      ok: true,
      data: {
        inventory,
        locationOptions,
      },
    }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }

    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "INVENTORY_DETAIL_LOAD_FAILED",
        title: "Inventory Unavailable",
        message: "The app could not load this inventory record.",
        detail: "The inventory record could not be loaded.",
      }),
    }
  }
}
