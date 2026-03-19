import { prisma } from "@/server/db/prisma"
import { withPrismaConnectivityHandling } from "@/server/db/prisma-errors"
import { createServerPagination } from "@/server/pagination"
import { listPropertyOptions } from "@/features/flooring/properties/queries"
import { loadTemplatePanelOptions } from "@/features/flooring/shared/template-panel-options"
import { normalizeManagementCompany, normalizeManagementCompanyOption } from "./services"

export async function listManagementCompanies(pagination?: { skip: number; take: number }) {
  const companies = await prisma.flooringManagementCompany.findMany({
    orderBy: { name: "asc" },
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

async function loadManagementCompaniesPageData(page: number) {
  const totalItems = await prisma.flooringManagementCompany.count()
  const pagination = createServerPagination({ page, totalItems })
  const [initialCompanies, propertyOptions, templatePanelOptions] = await Promise.all([
    listManagementCompanies({ skip: pagination.skip, take: pagination.take }),
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
    initialCompanies,
    propertyOptions: propertyOptions.map((property) => ({
      id: property.id,
      name: property.name,
    })),
    ...templatePanelOptions,
  }
}

export async function getManagementCompaniesPageData(page: number) {
  return withPrismaConnectivityHandling(() => loadManagementCompaniesPageData(page))
}
