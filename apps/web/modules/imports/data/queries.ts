import {
  Prisma,
  createPrismaPageLoadIssue,
  importRowSelect,
  isPrismaNotFoundError,
  listImportOptions,
  normalizeImportRow,
  prisma,
  getImportDetailById,
  withPrismaConnectivityHandling,
  type ImportDetailRecord,
  type ImportFormOptions,
  type ImportRecord,
  type PrismaDetailPageResult,
} from "@builders/db"
import { buildFlooringProductDisplayName } from "@builders/domain"
import { appendUniqueOrderBy, createServerPagination, type ServerTableQueryState } from "@/server/pagination"
import { withLoaderTiming } from "@/modules/shared/engines/common/application/loader-timing"

function buildImportsSearchWhere(searchQuery: string): Prisma.FlooringImportEntryWhereInput | undefined {
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
  const where = buildImportsSearchWhere(tableState.searchQuery)
  const totalItems = await prisma.flooringImportEntry.count({ where })
  const pagination = createServerPagination({ page, totalItems })
  const entries = await prisma.flooringImportEntry.findMany({
    select: importRowSelect,
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
    initialImports: entries.map((entry) => normalizeImportRow(entry)),
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

export async function getImportFormOptions(): Promise<{
  productOptions: Array<{ id: string; label: string; stockUnit: string }>
  warehouseOptions: Array<{ id: string; name: string }>
  locationOptions: Array<{ id: string; warehouseId: string; locationCode: string; label: string }>
}> {
  return withLoaderTiming({ loader: "flooring.imports.options" }, async () => {
    const options: ImportFormOptions = await listImportOptions()
    return {
      productOptions: options.products.map((product) => ({
        id: product.id,
        label: buildFlooringProductDisplayName(product),
        stockUnit: product.stockUnit,
      })),
      warehouseOptions: options.warehouses.map((warehouse) => ({ id: warehouse.id, name: warehouse.name })),
      locationOptions: options.locations.map((location) => ({
        id: location.id,
        warehouseId: location.warehouseId,
        locationCode: location.locationCode,
        label: location.locationCode,
      })),
    }
  })
}

export async function getImportDetailPageData(id: string): Promise<PrismaDetailPageResult<{
  entry: ImportDetailRecord
  productOptions: Awaited<ReturnType<typeof getImportFormOptions>>["productOptions"]
  warehouseOptions: Awaited<ReturnType<typeof getImportFormOptions>>["warehouseOptions"]
  locationOptions: Awaited<ReturnType<typeof getImportFormOptions>>["locationOptions"]
}>> {
  try {
    const [entry, options] = await Promise.all([
      getImportDetailById(id),
      getImportFormOptions(),
    ])

    if (!entry) {
      return { ok: false, notFound: true }
    }

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

export type { ImportRecord, ImportDetailRecord }
