import { prisma } from "@/server/db/prisma"
import { flooringCategoryUnitInclude } from "@/server/flooring/unit-measures"
import { normalizeCatalogProduct, normalizeProductOption } from "./services"

export async function listCatalogProducts() {
  const products = await prisma.flooringProduct.findMany({
    include: {
      category: {
        select: {
          id: true,
          name: true,
          ...flooringCategoryUnitInclude,
        },
      },
      manufacturer: {
        select: {
          id: true,
          name: true,
          companyName: true,
          website: true,
        },
      },
    },
    orderBy: [{ category: { name: "asc" } }, { manufacturerName: "asc" }, { style: "asc" }, { color: "asc" }],
  })

  return products.map(normalizeCatalogProduct)
}

export async function listProductOptions() {
  const products = await prisma.flooringProduct.findMany({
    orderBy: [{ manufacturerName: "asc" }, { style: "asc" }, { color: "asc" }],
    select: {
      id: true,
      manufacturerName: true,
      style: true,
      color: true,
    },
  })

  return products.map(normalizeProductOption)
}
