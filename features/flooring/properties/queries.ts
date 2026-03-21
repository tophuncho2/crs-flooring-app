import { Prisma } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { withPrismaConnectivityHandling } from "@/server/db/prisma-errors"
import { appendUniqueOrderBy, createServerPagination, type ServerTableQueryState } from "@/server/pagination"
import { normalizeProperty, normalizePropertyOption } from "./services"

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
    ...(pagination ?? {}),
  })

  return properties.map(normalizeProperty)
}

export async function listPropertyOptions() {
  const properties = await prisma.property.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
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
  return withPrismaConnectivityHandling(() => loadPropertiesPageData(page, tableState))
}
