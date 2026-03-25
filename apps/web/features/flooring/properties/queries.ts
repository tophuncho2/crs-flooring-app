import { Prisma, createPrismaPageLoadIssue, isPrismaNotFoundError, prisma, withPrismaConnectivityHandling, type PrismaDetailPageResult } from "@builders/db"
import { buildPadProductDisplayName } from "@/features/flooring/shared/domain/product-display-name"
import { withLoaderTiming } from "@/features/flooring/shared/application/loader-timing"
import { appendUniqueOrderBy, createServerPagination, type ServerTableQueryState } from "@/server/pagination"
import { normalizeProperty, normalizePropertyListRow, normalizePropertyOption } from "./services"

function buildPropertiesWhere(searchQuery: string): Prisma.PropertyWhereInput | undefined {
  if (!searchQuery) return undefined

  return {
    OR: [
      { name: { contains: searchQuery, mode: "insensitive" } },
      { streetAddress: { contains: searchQuery, mode: "insensitive" } },
      { city: { contains: searchQuery, mode: "insensitive" } },
      { state: { contains: searchQuery, mode: "insensitive" } },
      { postalCode: { contains: searchQuery, mode: "insensitive" } },
      { phone: { contains: searchQuery, mode: "insensitive" } },
      { email: { contains: searchQuery, mode: "insensitive" } },
      { managementCompany: { name: { contains: searchQuery, mode: "insensitive" } } },
    ],
  }
}

function buildPropertiesOrderBy(tableState: ServerTableQueryState): Prisma.PropertyOrderByWithRelationInput[] {
  const direction: Prisma.SortOrder = tableState.isAscendingSort ? "asc" : "desc"
  const orderBy: Prisma.PropertyOrderByWithRelationInput[] = []
  const fieldMap: Record<string, Prisma.PropertyOrderByWithRelationInput> = {
    property: { name: direction },
    street: { streetAddress: direction },
    city: { city: direction },
    state: { state: direction },
    zip: { postalCode: direction },
    phone: { phone: direction },
    email: { email: direction },
    fullAddress: { streetAddress: direction },
    managementCompany: { managementCompany: { name: direction } },
  }

  if (tableState.isGroupingEnabled) {
    for (const groupKey of tableState.groupByKeys) {
      appendUniqueOrderBy(orderBy, fieldMap[groupKey])
    }
  }

  appendUniqueOrderBy(orderBy, { name: direction })

  return orderBy
}

export async function listProperties(
  pagination: { skip: number; take: number } | undefined,
  tableState: ServerTableQueryState,
) {
  const properties = await prisma.property.findMany({
    where: buildPropertiesWhere(tableState.searchQuery),
    orderBy: buildPropertiesOrderBy(tableState),
    select: {
      id: true,
      updatedAt: true,
      name: true,
      streetAddress: true,
      city: true,
      state: true,
      postalCode: true,
      phone: true,
      email: true,
      managementCompany: {
        select: { id: true, name: true },
      },
      _count: {
        select: { templates: true },
      },
      templates: {
        select: {
          id: true,
          templateTag: true,
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
    ...(pagination ?? {}),
  })

  return properties.map(normalizePropertyListRow)
}

export async function listPropertyOptions() {
  const properties = await prisma.property.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      updatedAt: true,
      name: true,
      streetAddress: true,
      city: true,
      state: true,
      postalCode: true,
    },
  })

  return properties.map(normalizePropertyOption)
}

export async function getPropertyById(id: string) {
  const property = await prisma.property.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      updatedAt: true,
      name: true,
      streetAddress: true,
      city: true,
      state: true,
      postalCode: true,
      phone: true,
      email: true,
      managementCompany: {
        select: { id: true, name: true },
      },
      templates: {
        select: {
          id: true,
          templateTag: true,
          warehouse: { select: { name: true } },
          _count: { select: { items: true, serviceItems: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  return normalizeProperty(property)
}

async function loadPropertyDetailOptions() {
  const [managementOptions, warehouses, padProducts] = await Promise.all([
    prisma.flooringManagementCompany.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.flooringWarehouse.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.flooringProduct.findMany({
      where: {
        category: {
          name: "Pad",
        },
      },
      orderBy: [{ name: "asc" }, { style: "asc" }, { color: "asc" }],
      select: {
        id: true,
        name: true,
        style: true,
        color: true,
      },
    }),
  ])

  return {
    managementOptions,
    warehouseOptions: warehouses,
    padProductOptions: padProducts.map((product) => ({
      id: product.id,
      label: buildPadProductDisplayName(product),
    })),
  }
}

export async function getPropertyDetailPageData(id: string): Promise<PrismaDetailPageResult<{
  property: Awaited<ReturnType<typeof getPropertyById>>
  managementOptions: Awaited<ReturnType<typeof loadPropertyDetailOptions>>["managementOptions"]
  warehouseOptions: Awaited<ReturnType<typeof loadPropertyDetailOptions>>["warehouseOptions"]
  padProductOptions: Awaited<ReturnType<typeof loadPropertyDetailOptions>>["padProductOptions"]
}>> {
  try {
    const [property, options] = await Promise.all([
      getPropertyById(id),
      loadPropertyDetailOptions(),
    ])

    return {
      ok: true,
      data: {
        property,
        managementOptions: options.managementOptions,
        warehouseOptions: options.warehouseOptions,
        padProductOptions: options.padProductOptions,
      },
    }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }

    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "PROPERTY_DETAIL_LOAD_FAILED",
        title: "Property Unavailable",
        message: "The app could not load this property.",
        detail: "The property record or its supporting options could not be loaded.",
      }),
    }
  }
}

async function loadPropertiesPageData(page: number, tableState: ServerTableQueryState) {
  const where = buildPropertiesWhere(tableState.searchQuery)
  const totalItems = await prisma.property.count({ where })
  const pagination = createServerPagination({ page, totalItems })
  const [initialProperties, managementOptions] = await Promise.all([
    listProperties({ skip: pagination.skip, take: pagination.take }, tableState),
    prisma.flooringManagementCompany.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ])

  return {
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: pagination.totalItems,
      totalPages: pagination.totalPages,
    },
    tableState,
    initialProperties,
    managementOptions,
  }
}

export async function getPropertiesPageData(page: number, tableState: ServerTableQueryState) {
  return withPrismaConnectivityHandling(() =>
    withLoaderTiming(
      {
        loader: "flooring.properties.list",
        details: {
          page,
          searchQuery: tableState.searchQuery,
          groupCount: tableState.groupByKeys.length,
        },
      },
      () => loadPropertiesPageData(page, tableState),
    ),
  )
}
