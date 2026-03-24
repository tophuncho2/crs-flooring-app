import { Prisma } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { createPrismaPageLoadIssue, isPrismaNotFoundError, withPrismaConnectivityHandling, type PrismaDetailPageResult } from "@/server/db/prisma-errors"
import { appendUniqueOrderBy, createServerPagination, type ServerTableQueryState } from "@/server/pagination"
import { withLoaderTiming } from "@/features/flooring/shared/application/loader-timing"
import { getImportEntryById, listImportLocationOptions, normalizeImportEntry } from "@/features/flooring/imports/api"
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
  const entries = await prisma.flooringImportEntry.findMany({
    include: {
      warehouse: { select: { id: true, name: true } },
      _count: { select: { inventories: true } },
    },
    where,
    orderBy: buildImportsOrderBy(tableState),
    skip: pagination.skip,
    take: pagination.take,
  })

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
  }
}

export async function getImportsPageData(page: number, tableState: ServerTableQueryState) {
  return withPrismaConnectivityHandling(() =>
    withLoaderTiming(
      {
        loader: "flooring.imports.list",
        details: {
          page,
          searchQuery: tableState.searchQuery,
          groupCount: tableState.groupByKeys.length,
        },
      },
      () => loadImportsPageData(page, tableState),
    ),
  )
}

export async function getImportFormOptions() {
  return withLoaderTiming(
    {
      loader: "flooring.imports.options",
    },
    async () => {
      const [products, warehouses, locations] = await Promise.all([
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
    },
  )
}

export async function getImportById(id: string) {
  return getImportEntryById(id, prisma)
}

async function loadImportDetailOptions() {
  return getImportFormOptions()
}

export async function getImportDetailPageData(id: string): Promise<PrismaDetailPageResult<{
  entry: Awaited<ReturnType<typeof getImportById>>
  productOptions: Awaited<ReturnType<typeof loadImportDetailOptions>>["productOptions"]
  warehouseOptions: Awaited<ReturnType<typeof loadImportDetailOptions>>["warehouseOptions"]
  locationOptions: Awaited<ReturnType<typeof loadImportDetailOptions>>["locationOptions"]
}>> {
  try {
    const [entry, options] = await Promise.all([
      getImportById(id),
      loadImportDetailOptions(),
    ])

    return {
      ok: true,
      data: {
        entry,
        productOptions: options.productOptions,
        warehouseOptions: options.warehouseOptions,
        locationOptions: options.locationOptions,
      },
    }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }

    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "IMPORT_DETAIL_LOAD_FAILED",
        title: "Import Unavailable",
        message: "The app could not load this import.",
        detail: "The import record or its supporting options could not be loaded.",
      }),
    }
  }
}
