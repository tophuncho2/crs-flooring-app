import { prisma } from "@/server/db/prisma"
import { flooringCategoryUnitInclude } from "@/server/flooring/unit-measures"
import { normalizeCategoryUnitValues } from "@/server/flooring/unit-measures"
import { listManufacturers } from "@/features/flooring/manufacturers/queries"
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
          agentName: true,
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

export async function getProductsPageData() {
  const [categories, manufacturers, products] = await Promise.all([
    prisma.flooringCategory.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        ...flooringCategoryUnitInclude,
      },
    }),
    listManufacturers(),
    listCatalogProducts(),
  ])

  return {
    categoryOptions: categories.map((category) => ({
      id: category.id,
      name: category.name,
      ...normalizeCategoryUnitValues(category),
    })),
    manufacturerOptions: manufacturers.map((manufacturer) => ({
      id: manufacturer.id,
      name: manufacturer.companyName,
      website: manufacturer.website ?? "",
      phone: manufacturer.phone ?? "",
      email: manufacturer.email ?? "",
    })),
    initialProducts: products,
  }
}
