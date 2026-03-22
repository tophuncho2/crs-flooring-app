import { prisma } from "@/server/db/prisma"
import { listServiceOptions } from "@/features/flooring/services/queries"
import { buildProductName } from "@/features/flooring/products/services"

type PadProductOptionSource = {
  id: string
  manufacturerName: string | null
  style: string | null
  color: string | null
}

function buildPadLabel(product: PadProductOptionSource) {
  return buildProductName(product).replace("Flooring Product", "Pad Product")
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
      orderBy: [{ manufacturerName: "asc" }, { style: "asc" }, { color: "asc" }],
      select: {
        id: true,
        manufacturerName: true,
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
      label: buildProductName(product),
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
      orderBy: [{ manufacturerName: "asc" }, { style: "asc" }, { color: "asc" }],
      select: {
        id: true,
        manufacturerName: true,
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
