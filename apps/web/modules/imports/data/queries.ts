import { Prisma, createPrismaPageLoadIssue, isPrismaNotFoundError, prisma, withPrismaConnectivityHandling, type PrismaDetailPageResult } from "@builders/db"
import { appendUniqueOrderBy, createServerPagination, type ServerTableQueryState } from "@/server/pagination"
import { withLoaderTiming } from "@/modules/shared/engines/common/application/loader-timing"
import { getImportEntryById, listImportLocationOptions, normalizeImportEntry } from "@/modules/imports/api"
import { buildFlooringProductDisplayName } from "@/modules/shared/domain/product-display-name"
import {
  type ImportPageFilterState,
} from "@/modules/imports/domain/filters"

function coerceFilterArray(value: string[] | string | undefined) {
  if (Array.isArray(value)) {
    return value.filter((entry) => entry.length > 0 && entry !== "all")
  }

  if (typeof value === "string" && value.length > 0 && value !== "all") {
    return [value]
  }

  return []
}

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

function buildImportsStatusWhere(statuses: ImportPageFilterState["status"]): Prisma.FlooringImportEntryWhereInput | undefined {
  const normalizedStatuses = coerceFilterArray(statuses)
  if (normalizedStatuses.length === 0) {
    return undefined
  }

  return {
    status: {
      in: normalizedStatuses,
    },
  }
}

function buildImportsWarehouseWhere(warehouseIds: string[] | string): Prisma.FlooringImportEntryWhereInput | undefined {
  const normalizedWarehouseIds = coerceFilterArray(warehouseIds)
  if (normalizedWarehouseIds.length === 0) {
    return undefined
  }

  return {
    warehouseId: {
      in: normalizedWarehouseIds,
    },
  }
}

function buildImportsCombinedWhere(searchQuery: string, filters: ImportPageFilterState): Prisma.FlooringImportEntryWhereInput | undefined {
  const whereClauses = [
    buildImportsWhere(searchQuery),
    buildImportsStatusWhere(filters.status),
    buildImportsWarehouseWhere(filters.warehouseId),
  ].filter(Boolean) as Prisma.FlooringImportEntryWhereInput[]

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

export async function listImportsPageFilterOptions() {
  return prisma.flooringWarehouse.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
}

async function loadImportsPageData(page: number, tableState: ServerTableQueryState, filters: ImportPageFilterState) {
  const where = buildImportsCombinedWhere(tableState.searchQuery, filters)
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
    filterState: filters,
    initialImports: entries.map((entry) => ({
      ...normalizeImportEntry(entry),
      itemsCount: entry._count.inventories,
    })),
  }
}

export async function getImportsPageData(page: number, tableState: ServerTableQueryState, filters: ImportPageFilterState) {
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
      () => loadImportsPageData(page, tableState, filters),
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

export async function getImportCreatePageData() {
  return getImportFormOptions()
}
