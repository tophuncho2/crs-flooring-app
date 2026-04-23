import { Prisma, prisma } from "@builders/db"
import {
  createPrismaPageLoadIssue,
  isPrismaNotFoundError,
  withPrismaConnectivityHandling,
  type PrismaDetailPageResult,
} from "@builders/db"
import { appendUniqueOrderBy, createServerPagination, type ServerTableQueryState } from "@/server/pagination"
import { withLoaderTiming } from "@/modules/shared/engines/common/application/loader-timing"
import {
  normalizeManagementCompany,
  normalizeManagementCompanyListRow,
  normalizeManagementCompanyOption,
} from "@builders/domain"

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

function buildManagementCompaniesOrderBy(
  tableState: ServerTableQueryState,
): Prisma.FlooringManagementCompanyOrderByWithRelationInput[] {
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
      updatedAt: true,
      name: true,
      streetAddress: true,
      city: true,
      state: true,
      postalCode: true,
      phone: true,
      email: true,
      _count: {
        select: { properties: true },
      },
      properties: {
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: "asc" },
        take: 3,
      },
    },
    ...(pagination ?? {}),
  })

  return companies.map(normalizeManagementCompanyListRow)
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
      updatedAt: true,
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
          templates: {
            select: {
              id: true,
              templateTag: true,
              warehouse: {
                select: { name: true },
              },
              _count: {
                select: {
                  items: true,
                  serviceItems: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { name: "asc" },
      },
    },
  })

  return normalizeManagementCompany(company)
}

export async function getManagementCompanyDetailPageData(id: string): Promise<PrismaDetailPageResult<{
  company: Awaited<ReturnType<typeof getManagementCompanyById>>
}>> {
  try {
    return {
      ok: true,
      data: {
        company: await getManagementCompanyById(id),
      },
    }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }

    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "MANAGEMENT_COMPANY_DETAIL_LOAD_FAILED",
        title: "Management Company Unavailable",
        message: "The app could not load this management company.",
        detail: "The management company record could not be loaded.",
      }),
    }
  }
}

async function loadManagementCompaniesPageData(page: number, tableState: ServerTableQueryState) {
  const where = buildManagementCompaniesWhere(tableState.searchQuery)
  const totalItems = await prisma.flooringManagementCompany.count({ where })
  const pagination = createServerPagination({ page, totalItems })
  const initialCompanies = await listManagementCompanies({ skip: pagination.skip, take: pagination.take }, tableState)

  return {
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: pagination.totalItems,
      totalPages: pagination.totalPages,
    },
    tableState,
    initialCompanies,
  }
}

export async function getManagementCompaniesPageData(page: number, tableState: ServerTableQueryState) {
  return withPrismaConnectivityHandling(() =>
    withLoaderTiming(
      {
        loader: "flooring.management-companies.list",
        details: {
          page,
          searchQuery: tableState.searchQuery,
          groupCount: tableState.groupByKeys.length,
        },
      },
      () => loadManagementCompaniesPageData(page, tableState),
    ),
  )
}
