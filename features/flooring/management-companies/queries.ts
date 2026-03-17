import { prisma } from "@/server/db/prisma"
import { listServiceOptions } from "@/features/flooring/services/queries"
import { buildProductName } from "@/features/flooring/products/services"
import { listPropertyOptions } from "@/features/flooring/properties/queries"
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

function buildPadLabel(product: {
  manufacturerName: string | null
  style: string | null
  color: string | null
}) {
  return buildProductName(product).replace("Flooring Product", "Pad Product")
}

export async function getManagementCompaniesPageData() {
  const [initialCompanies, propertyOptions, warehouses, padProducts, products, services, units] = await Promise.all([
    listManagementCompanies(),
    listPropertyOptions(),
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
      orderBy: [{ manufacturerName: "asc" }, { style: "asc" }, { color: "asc" }],
      select: {
        id: true,
        manufacturerName: true,
        style: true,
        color: true,
      },
    }),
    prisma.flooringProduct.findMany({
      orderBy: [{ manufacturerName: "asc" }, { style: "asc" }, { color: "asc" }],
      select: {
        id: true,
        manufacturerName: true,
        style: true,
        color: true,
        category: {
          select: { sendUnit: { select: { name: true } } },
        },
      },
    }),
    listServiceOptions(),
    prisma.flooringUnitOfMeasure.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ])

  return {
    initialCompanies,
    propertyOptions: propertyOptions.map((property) => ({
      id: property.id,
      name: property.name,
    })),
    warehouseOptions: warehouses,
    padProductOptions: padProducts.map((product) => ({
      id: product.id,
      label: buildPadLabel(product),
    })),
    productOptions: products.map((product) => ({
      id: product.id,
      label: buildProductName(product),
      sendUnit: product.category.sendUnit?.name ?? "",
    })),
    serviceOptions: services,
    unitOptions: units,
  }
}
