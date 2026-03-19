import { prisma } from "@/server/db/prisma"
import { listPropertyOptions } from "@/features/flooring/properties/queries"
import { loadTemplatePanelOptions } from "@/features/flooring/shared/template-panel-options"
import { normalizeManagementCompany, normalizeManagementCompanyOption } from "./services"

export async function listManagementCompanies() {
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
    take: 250,
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

export async function getManagementCompaniesPageData() {
  const [initialCompanies, propertyOptions, templatePanelOptions] = await Promise.all([
    listManagementCompanies(),
    listPropertyOptions(),
    loadTemplatePanelOptions(),
  ])

  return {
    initialCompanies,
    propertyOptions: propertyOptions.map((property) => ({
      id: property.id,
      name: property.name,
    })),
    ...templatePanelOptions,
  }
}
