import { prisma } from "@/server/db/prisma"
import { listSalesRepContactOptions } from "@/features/flooring/contacts/data/queries"
import { listServiceOptions } from "@/features/flooring/services/data/queries"
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

async function loadBaseRecordOptionData() {
  const [properties, warehouses, products, services, units, salesRepOptions] = await Promise.all([
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
    listSalesRepContactOptions(),
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
    salesRepOptions,
  }
}

async function loadPadProductOptions() {
  const padProducts = await prisma.flooringProduct.findMany({
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
  })

  return padProducts.map((product) => ({
    id: product.id,
    label: buildPadLabel(product),
  }))
}

export async function loadSharedRecordOptionData() {
  return loadBaseRecordOptionData()
}

export async function loadTemplateRecordOptionData() {
  const [sharedOptions, padProductOptions] = await Promise.all([
    loadBaseRecordOptionData(),
    loadPadProductOptions(),
  ])

  return {
    ...sharedOptions,
    padProductOptions,
  }
}

export async function loadTemplatePanelOptionData() {
  const [sharedOptions, padProductOptions] = await Promise.all([
    loadBaseRecordOptionData(),
    loadPadProductOptions(),
  ])

  return {
    warehouseOptions: sharedOptions.warehouseOptions,
    padProductOptions,
    productOptions: sharedOptions.productOptions,
    serviceOptions: sharedOptions.serviceOptions,
    unitOptions: sharedOptions.unitOptions,
  }
}
