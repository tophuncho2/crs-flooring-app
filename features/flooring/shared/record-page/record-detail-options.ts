import { prisma } from "@/server/db/prisma"
import { listServiceOptions } from "@/features/flooring/services/queries"
import { buildFlooringProductDisplayName, buildPadProductDisplayName } from "@/features/flooring/shared/domain/product-display-name"

type PadProductOptionSource = {
  id: string
  name: string
  style: string | null
  color: string | null
}

function buildPadLabel(product: PadProductOptionSource) {
  return buildPadProductDisplayName(product)
}

export async function loadSharedRecordDetailOptions() {
  const [properties, warehouses, products, services, units] = await Promise.all([
    prisma.property.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        streetAddress: true,
        city: true,
        state: true,
        postalCode: true,
      },
    }),
    prisma.flooringWarehouse.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.flooringProduct.findMany({
      orderBy: [{ name: "asc" }, { style: "asc" }, { color: "asc" }],
      select: {
        id: true,
        name: true,
        style: true,
        color: true,
        category: { select: { sendUnit: { select: { name: true } } } },
      },
    }),
    listServiceOptions(),
    prisma.flooringUnitOfMeasure.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ])

  return {
    propertyOptions: properties.map((property) => ({
      id: property.id,
      name: property.name,
      address: [property.streetAddress, property.city, property.state, property.postalCode].filter(Boolean).join(", "),
    })),
    warehouseOptions: warehouses,
    productOptions: products.map((product) => ({
      id: product.id,
      label: buildFlooringProductDisplayName(product),
      sendUnit: product.category.sendUnit?.name ?? "",
    })),
    serviceOptions: services,
    unitOptions: units,
  }
}

export async function loadTemplateRecordDetailOptions() {
  const [sharedOptions, padProducts] = await Promise.all([
    loadSharedRecordDetailOptions(),
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
    ...sharedOptions,
    padProductOptions: padProducts.map((product) => ({
      id: product.id,
      label: buildPadLabel(product),
    })),
  }
}
