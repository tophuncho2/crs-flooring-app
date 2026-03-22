import { Prisma } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { withPrismaConnectivityHandling } from "@/server/db/prisma-errors"
import { appendUniqueOrderBy, createServerPagination, type ServerTableQueryState } from "@/server/pagination"
import { listImportLocationOptions, normalizeImportEntry } from "@/features/flooring/imports/api"
import { buildFlooringProductDisplayName } from "@/features/flooring/shared/domain/product-display-name"

function buildImportsWhere(searchQuery: string): Prisma.FlooringImportEntryWhereInput | undefined {
  if (!searchQuery) return undefined

  const numericImportNumber = Number(searchQuery)
  const numericSearchClauses =
    Number.isFinite(numericImportNumber) && searchQuery.trim() !== ""
      ? [{ importNumber: Math.floor(numericImportNumber) }]
      : []

  return {
    OR: [
      ...numericSearchClauses,
      { orderNumber: { contains: searchQuery, mode: "insensitive" } },
      { tag: { contains: searchQuery, mode: "insensitive" } },
      { notes: { contains: searchQuery, mode: "insensitive" } },
      { warehouse: { name: { contains: searchQuery, mode: "insensitive" } } },
    ],
  }
}

function buildImportsOrderBy(tableState: ServerTableQueryState): Prisma.FlooringImportEntryOrderByWithRelationInput[] {
  const direction: Prisma.SortOrder = tableState.isAscendingSort ? "asc" : "desc"
  const orderBy: Prisma.FlooringImportEntryOrderByWithRelationInput[] = []
  const fieldMap: Record<string, Prisma.FlooringImportEntryOrderByWithRelationInput> = {
    importNumber: { importNumber: direction },
    tag: { tag: direction },
    transport: { transportType: direction },
    status: { status: direction },
    warehouse: { warehouse: { name: direction } },
    created: { createdAt: direction },
  }

  if (tableState.isGroupingEnabled) {
    for (const groupKey of tableState.groupByKeys) {
      appendUniqueOrderBy(orderBy, fieldMap[groupKey])
    }
  }

  appendUniqueOrderBy(orderBy, { importNumber: direction })

  return orderBy
}

async function loadImportsPageData(page: number, tableState: ServerTableQueryState) {
  const where = buildImportsWhere(tableState.searchQuery)
  const totalItems = await prisma.flooringImportEntry.count({ where })
  const pagination = createServerPagination({ page, totalItems })
  const [entries, products, warehouses, locations] = await Promise.all([
    prisma.flooringImportEntry.findMany({
      include: {
        warehouse: { select: { id: true, name: true } },
        _count: { select: { inventories: true } },
        inventories: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
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
          },
          orderBy: [{ createdAt: "asc" }],
        },
      },
      where,
      orderBy: buildImportsOrderBy(tableState),
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.flooringProduct.findMany({
      include: {
        category: { select: { stockUnit: { select: { name: true } } } },
      },
      orderBy: [{ name: "asc" }, { style: "asc" }, { color: "asc" }],
    }),
    prisma.flooringWarehouse.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    listImportLocationOptions(),
  ])

  return {
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: pagination.totalItems,
      totalPages: pagination.totalPages,
    },
    tableState,
    initialImports: entries.map((entry) => ({
      ...normalizeImportEntry(entry),
      itemsCount: entry._count.inventories,
    })),
    productOptions: products.map((product) => ({
      id: product.id,
      label: buildFlooringProductDisplayName(product),
      stockUnit: product.category.stockUnit?.name ?? "",
    })),
    warehouseOptions: warehouses,
    locationOptions: locations.map((location) => ({
      id: location.id,
      warehouseId: location.warehouseId,
      locationCode: location.locationCode,
      label: location.locationCode,
    })),
  }
}

export async function getImportsPageData(page: number, tableState: ServerTableQueryState) {
  return withPrismaConnectivityHandling(() => loadImportsPageData(page, tableState))
}

export async function getImportById(id: string) {
  const entry = await prisma.flooringImportEntry.findUniqueOrThrow({
    where: { id },
    include: importEntryInclude(),
  })

  return {
    ...normalizeImportEntry(entry),
    itemsCount: entry._count.inventories,
  }
}

function importEntryInclude() {
  return {
    warehouse: { select: { id: true, name: true } },
    _count: { select: { inventories: true } },
    inventories: {
      include: {
        product: {
          select: {
            id: true,
            name: true,
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
      },
      orderBy: [{ createdAt: "asc" }],
    },
  } satisfies Prisma.FlooringImportEntryInclude
}
