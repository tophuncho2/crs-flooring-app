import { prisma } from "@/server/db/prisma"
import { withPrismaConnectivityHandling } from "@/server/db/prisma-errors"
import { listServiceOptions } from "@/features/flooring/services/queries"
import { buildProductName } from "@/features/flooring/products/services"
import { normalizeProperty, normalizePropertyOption } from "./services"

export async function listProperties() {
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
    take: 250,
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

function buildPadLabel(product: {
  manufacturerName: string | null
  style: string | null
  color: string | null
}) {
  return buildProductName(product).replace("Flooring Product", "Pad Product")
}

async function loadPropertiesPageData() {
  const [initialProperties, managementOptions, propertyOptions, warehouses, padProducts, products, services, units] = await Promise.all([
    listProperties(),
    prisma.flooringManagementCompany.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
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
    initialProperties,
    managementOptions,
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

export async function getPropertiesPageData() {
  return withPrismaConnectivityHandling(loadPropertiesPageData)
}
