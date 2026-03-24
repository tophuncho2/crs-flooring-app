import { Prisma } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import {
  createPrismaPageLoadIssue,
  isPrismaNotFoundError,
  withPrismaConnectivityHandling,
  type PrismaDetailPageResult,
} from "@/server/db/prisma-errors"
import { listInventoryLocationOptions, normalizeInventoryRow } from "./api"
import { appendUniqueOrderBy, createServerPagination, type ServerTableQueryState } from "@/server/pagination"

function buildInventoryWhere(searchQuery: string): Prisma.FlooringInventoryWhereInput | undefined {
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

async function loadInventoryPageData(page: number, tableState: ServerTableQueryState) {
  const where = buildInventoryWhere(tableState.searchQuery)
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
    initialInventory: inventory.map((row) =>
      normalizeInventoryRow({
        ...row,
        cutTotal: cutTotalByInventoryId.get(row.id) ?? 0,
      }),
    ),
  }
}

export async function getInventoryPageData(page: number, tableState: ServerTableQueryState) {
  return withPrismaConnectivityHandling(() => loadInventoryPageData(page, tableState))
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
