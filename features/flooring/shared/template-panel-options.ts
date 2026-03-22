import { prisma } from "@/server/db/prisma"
import { listServiceOptions } from "@/features/flooring/services/queries"
import { buildFlooringProductDisplayName, buildPadProductDisplayName } from "@/features/flooring/shared/domain/product-display-name"

function buildPadLabel(product: {
  name: string
  style: string | null
  color: string | null
}) {
  return buildPadProductDisplayName(product)
}

export async function loadTemplatePanelOptions() {
  const [warehouses, padProducts, products, services, units] = await Promise.all([
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
      orderBy: [{ name: "asc" }, { style: "asc" }, { color: "asc" }],
      select: {
        id: true,
        name: true,
        style: true,
        color: true,
      },
    }),
    prisma.flooringProduct.findMany({
      orderBy: [{ name: "asc" }, { style: "asc" }, { color: "asc" }],
      select: {
        id: true,
        name: true,
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
    warehouseOptions: warehouses,
    padProductOptions: padProducts.map((product) => ({
      id: product.id,
      label: buildPadLabel(product),
    })),
    productOptions: products.map((product) => ({
      id: product.id,
      label: buildFlooringProductDisplayName(product),
      sendUnit: product.category.sendUnit?.name ?? "",
    })),
    serviceOptions: services,
    unitOptions: units,
  }
}
