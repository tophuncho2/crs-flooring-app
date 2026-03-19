import { Prisma } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { withPrismaConnectivityHandling } from "@/server/db/prisma-errors"
import { appendUniqueOrderBy, createServerPagination, type ServerTableQueryState } from "@/server/pagination"

function buildProductLabel(product: {
  name: string
  manufacturerName: string | null
  style: string | null
  color: string | null
}) {
  return product.name || [product.manufacturerName, product.style, product.color].filter(Boolean).join(" - ") || "Flooring Product"
}

export async function listImportLocationOptions() {
  const rows = await prisma.flooringLocation.findMany({
    select: {
      id: true,
      warehouseId: true,
      locationCode: true,
      section: { select: { name: true } },
      warehouse: { select: { name: true } },
    },
    orderBy: [{ warehouse: { name: "asc" } }, { locationCode: "asc" }],
  })

  return rows.map((row) => ({
    id: row.id,
    warehouseId: row.warehouseId,
    locationCode: row.locationCode,
    sectionName: row.section?.name ?? null,
    warehouseName: row.warehouse.name,
  }))
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
      orderBy: [{ manufacturerName: "asc" }, { style: "asc" }, { color: "asc" }],
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
      id: entry.id,
      importNumber: entry.importNumber,
      orderNumber: entry.orderNumber ?? "",
      tag: entry.tag ?? "",
      transportType: entry.transportType,
      status: entry.status,
      notes: entry.notes ?? "",
      warehouseId: entry.warehouseId ?? "",
      warehouseName: entry.warehouse?.name ?? "",
      itemsCount: entry._count.inventories,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      inventories: entry.inventories.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: buildProductLabel(item.product),
        stockUnit: item.product.category.stockUnit?.name ?? "",
        itemNumber: item.itemNumber,
        dyeLot: item.dyeLot,
        stockCount: item.stockCount.toString(),
        cost: item.cost?.toString() ?? "",
        freight: item.freight?.toString() ?? "",
        notes: item.notes ?? "",
        locationId: item.locationId ?? "",
        locationCode: item.location?.locationCode ?? "",
        warehouseId: item.location?.warehouse.id ?? "",
        warehouseName: item.location?.warehouse.name ?? "",
        sectionName: item.location?.section?.name ?? "",
      })),
    })),
    productOptions: products.map((product) => ({
      id: product.id,
      label: buildProductLabel(product),
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
