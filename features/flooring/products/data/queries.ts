import { Prisma } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { appendUniqueOrderBy, createServerPagination, type ServerTableQueryState } from "@/server/pagination"
import { flooringCategoryUnitInclude } from "@/server/flooring/unit-measures"
import { normalizeCategoryUnitValues } from "@/server/flooring/unit-measures"
import { listManufacturers } from "@/features/flooring/manufacturers/queries"
import { normalizeCatalogProduct, normalizeProductOption } from "../domain/services"

function buildProductWhere(searchQuery: string): Prisma.FlooringProductWhereInput | undefined {
  if (!searchQuery) return undefined

  return {
    OR: [
      { name: { contains: searchQuery, mode: "insensitive" } },
      { manufacturerName: { contains: searchQuery, mode: "insensitive" } },
      { style: { contains: searchQuery, mode: "insensitive" } },
      { color: { contains: searchQuery, mode: "insensitive" } },
      { baseColor: { contains: searchQuery, mode: "insensitive" } },
      { category: { name: { contains: searchQuery, mode: "insensitive" } } },
    ],
  }
}

function buildProductOrderBy(tableState: ServerTableQueryState): Prisma.FlooringProductOrderByWithRelationInput[] {
  const direction: Prisma.SortOrder = tableState.isAscendingSort ? "asc" : "desc"
  const orderBy: Prisma.FlooringProductOrderByWithRelationInput[] = []
  const fieldMap: Record<string, Prisma.FlooringProductOrderByWithRelationInput> = {
    name: { name: direction },
    category: { category: { name: direction } },
    manufacturer: { manufacturerName: direction },
    manufacturerName: { manufacturerName: direction },
    style: { style: direction },
    color: { color: direction },
    baseColor: { baseColor: direction },
    width: { width: direction },
    sheetSize: { sheetSize: direction },
    thickness: { thickness: direction },
    unitWeight: { unitWeight: direction },
    coveragePerUnit: { coveragePerUnit: direction },
    notes: { notes: direction },
  }

  if (tableState.isGroupingEnabled) {
    for (const groupKey of tableState.groupByKeys) {
      appendUniqueOrderBy(orderBy, fieldMap[groupKey])
    }
  }

  appendUniqueOrderBy(orderBy, { category: { name: direction } })
  appendUniqueOrderBy(orderBy, { manufacturerName: direction })
  appendUniqueOrderBy(orderBy, { style: direction })
  appendUniqueOrderBy(orderBy, { color: direction })

  return orderBy
}

export async function listCatalogProducts(
  pagination: { skip: number; take: number } | undefined,
  tableState: ServerTableQueryState,
) {
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
    where: buildProductWhere(tableState.searchQuery),
    orderBy: buildProductOrderBy(tableState),
    ...(pagination ?? {}),
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

export async function getProductById(id: string) {
  const product = await prisma.flooringProduct.findUniqueOrThrow({
    where: { id },
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
  })

  return normalizeCatalogProduct(product)
}

export async function getProductsPageData(page: number, tableState: ServerTableQueryState) {
  const where = buildProductWhere(tableState.searchQuery)
  const totalItems = await prisma.flooringProduct.count({ where })
  const pagination = createServerPagination({ page, totalItems })

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
    listCatalogProducts({ skip: pagination.skip, take: pagination.take }, tableState),
  ])

  return {
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: pagination.totalItems,
      totalPages: pagination.totalPages,
    },
    tableState,
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
