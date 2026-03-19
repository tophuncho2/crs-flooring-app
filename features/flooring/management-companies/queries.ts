import { Prisma } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { withPrismaConnectivityHandling } from "@/server/db/prisma-errors"
import { appendUniqueOrderBy, createServerPagination, type ServerTableQueryState } from "@/server/pagination"
import { listPropertyOptions } from "@/features/flooring/properties/queries"
import { loadTemplatePanelOptions } from "@/features/flooring/shared/template-panel-options"
import { normalizeManagementCompany, normalizeManagementCompanyOption } from "./services"

function buildManagementCompaniesWhere(searchQuery: string): Prisma.FlooringManagementCompanyWhereInput | undefined {
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
      {
        properties: {
          some: {
            OR: [
              { name: { contains: searchQuery, mode: "insensitive" } },
              { streetAddress: { contains: searchQuery, mode: "insensitive" } },
              { city: { contains: searchQuery, mode: "insensitive" } },
              { state: { contains: searchQuery, mode: "insensitive" } },
              { postalCode: { contains: searchQuery, mode: "insensitive" } },
            ],
          },
        },
      },
    ],
  }
}

function buildManagementCompaniesOrderBy(tableState: ServerTableQueryState): Prisma.FlooringManagementCompanyOrderByWithRelationInput[] {
  const direction: Prisma.SortOrder = tableState.isAscendingSort ? "asc" : "desc"
  const orderBy: Prisma.FlooringManagementCompanyOrderByWithRelationInput[] = []
  const fieldMap: Record<string, Prisma.FlooringManagementCompanyOrderByWithRelationInput> = {
    company: { name: direction },
    street: { streetAddress: direction },
    city: { city: direction },
    state: { state: direction },
    zip: { postalCode: direction },
    phone: { phone: direction },
    email: { email: direction },
    fullAddress: { streetAddress: direction },
  }

  if (tableState.isGroupingEnabled) {
    for (const groupKey of tableState.groupByKeys) {
      appendUniqueOrderBy(orderBy, fieldMap[groupKey])
    }
  }

  appendUniqueOrderBy(orderBy, { name: direction })

  return orderBy
}

export async function listManagementCompanies(
  pagination: { skip: number; take: number } | undefined,
  tableState: ServerTableQueryState,
) {
  const companies = await prisma.flooringManagementCompany.findMany({
    where: buildManagementCompaniesWhere(tableState.searchQuery),
    orderBy: buildManagementCompaniesOrderBy(tableState),
    select: {
      id: true,
      name: true,
      streetAddress: true,
      city: true,
      state: true,
      postalCode: true,
      phone: true,
      email: true,
      properties: {
        select: {
          id: true,
          name: true,
          streetAddress: true,
          city: true,
          state: true,
          postalCode: true,
        },
        orderBy: { name: "asc" },
      },
    },
    ...(pagination ?? {}),
  })

  return companies.map(normalizeManagementCompany)
}

export async function listManagementCompanyOptions() {
  const companies = await prisma.flooringManagementCompany.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })

  return companies.map(normalizeManagementCompanyOption)
}

export async function getManagementCompanyById(id: string) {
  const company = await prisma.flooringManagementCompany.findUniqueOrThrow({
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
      properties: {
        select: {
          id: true,
          name: true,
          streetAddress: true,
          city: true,
          state: true,
          postalCode: true,
        },
        orderBy: { name: "asc" },
      },
    },
  })

  return normalizeManagementCompany(company)
}

async function loadManagementCompaniesPageData(page: number, tableState: ServerTableQueryState) {
  const where = buildManagementCompaniesWhere(tableState.searchQuery)
  const totalItems = await prisma.flooringManagementCompany.count({ where })
  const pagination = createServerPagination({ page, totalItems })
  const [initialCompanies, propertyOptions, templatePanelOptions] = await Promise.all([
    listManagementCompanies({ skip: pagination.skip, take: pagination.take }, tableState),
    listPropertyOptions(),
    loadTemplatePanelOptions(),
  ])

  return {
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: pagination.totalItems,
      totalPages: pagination.totalPages,
    },
    tableState,
    initialCompanies,
    propertyOptions: propertyOptions.map((property) => ({
      id: property.id,
      name: property.name,
    })),
    ...templatePanelOptions,
  }
}

export async function getManagementCompaniesPageData(page: number, tableState: ServerTableQueryState) {
  return withPrismaConnectivityHandling(() => loadManagementCompaniesPageData(page, tableState))
}
