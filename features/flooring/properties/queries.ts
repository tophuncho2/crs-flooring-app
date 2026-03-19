import { prisma } from "@/server/db/prisma"
import { withPrismaConnectivityHandling } from "@/server/db/prisma-errors"
import { createServerPagination } from "@/server/pagination"
import { loadTemplatePanelOptions } from "@/features/flooring/shared/template-panel-options"
import { normalizeProperty, normalizePropertyOption } from "./services"

export async function listProperties(pagination?: { skip: number; take: number }) {
  const properties = await prisma.property.findMany({
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

async function loadPropertiesPageData(page: number) {
  const totalItems = await prisma.property.count()
  const pagination = createServerPagination({ page, totalItems })
  const [initialProperties, managementOptions, templatePanelOptions] = await Promise.all([
    listProperties({ skip: pagination.skip, take: pagination.take }),
    prisma.flooringManagementCompany.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    loadTemplatePanelOptions(),
  ])

  return {
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: pagination.totalItems,
      totalPages: pagination.totalPages,
    },
    initialProperties,
    managementOptions,
    propertyOptions: initialProperties.map((property) => ({
      id: property.id,
      name: property.name,
    })),
    ...templatePanelOptions,
  }
}

export async function getPropertiesPageData(page: number) {
  return withPrismaConnectivityHandling(() => loadPropertiesPageData(page))
}
