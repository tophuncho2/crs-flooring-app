import { Prisma, createPrismaPageLoadIssue, isPrismaNotFoundError, prisma, type PrismaDetailPageResult } from "@builders/db"
import { appendUniqueOrderBy, createServerPagination, type ServerTableQueryState } from "@/server/pagination"
import { flooringCategoryUnitInclude } from "@/server/flooring/unit-measures"
import { normalizeCategoryUnitValues } from "@/server/flooring/unit-measures"
import { listManufacturers } from "@/features/flooring/manufacturers/queries"
import { listInventoryRows } from "@/features/flooring/inventory/data/api"
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
    orderBy: [{ name: "asc" }, { style: "asc" }, { color: "asc" }],
    select: {
      id: true,
      name: true,
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

async function listProductCategoryOptions() {
  const categories = await prisma.flooringCategory.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      ...flooringCategoryUnitInclude,
    },
  })

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    ...normalizeCategoryUnitValues(category),
  }))
}

async function listProductManufacturerOptions() {
  const manufacturers = await listManufacturers()

  return manufacturers.map((manufacturer) => ({
    id: manufacturer.id,
    name: manufacturer.companyName,
    website: manufacturer.website ?? "",
    phone: manufacturer.phone ?? "",
    email: manufacturer.email ?? "",
  }))
}

export async function getProductFormOptions() {
  const [categoryOptions, manufacturerOptions] = await Promise.all([
    listProductCategoryOptions(),
    listProductManufacturerOptions(),
  ])

  return {
    categoryOptions,
    manufacturerOptions,
  }
}

export async function getProductCreatePageData() {
  return getProductFormOptions()
}

export async function getProductsPageData(page: number, tableState: ServerTableQueryState) {
  const where = buildProductWhere(tableState.searchQuery)
  const totalItems = await prisma.flooringProduct.count({ where })
  const pagination = createServerPagination({ page, totalItems })

  const [products] = await Promise.all([
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
    initialProducts: products,
  }
}

async function loadProductDetailOptions(productId: string) {
  const [formOptions, inventoryRows] = await Promise.all([
    getProductFormOptions(),
    listInventoryRows(prisma, productId),
  ])

  return {
    categoryOptions: formOptions.categoryOptions,
    manufacturerOptions: formOptions.manufacturerOptions,
    inventoryRows,
  }
}

export async function getProductDetailPageData(id: string): Promise<PrismaDetailPageResult<{
  product: Awaited<ReturnType<typeof getProductById>>
  categoryOptions: Awaited<ReturnType<typeof loadProductDetailOptions>>["categoryOptions"]
  manufacturerOptions: Awaited<ReturnType<typeof loadProductDetailOptions>>["manufacturerOptions"]
  inventoryRows: Awaited<ReturnType<typeof loadProductDetailOptions>>["inventoryRows"]
}>> {
  try {
    const [product, options] = await Promise.all([
      getProductById(id),
      loadProductDetailOptions(id),
    ])

    return {
      ok: true,
      data: {
        product,
        categoryOptions: options.categoryOptions,
        manufacturerOptions: options.manufacturerOptions,
        inventoryRows: options.inventoryRows,
      },
    }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }

    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "PRODUCT_DETAIL_LOAD_FAILED",
        title: "Product Unavailable",
        message: "The app could not load this product.",
        detail: "The product record or its supporting options could not be loaded.",
      }),
    }
  }
}
