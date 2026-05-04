import { db } from "../../client.js"
import type { Prisma } from "@prisma/client"
import type { ProductPickerOption } from "@builders/domain"
import {
  listCategories,
  type CategoryRecord,
} from "../categories/read-repository.js"
import {
  listManufacturers,
  type ManufacturerRecord,
} from "../manufacturers/read-repository.js"
import {
  productOptionSelect,
  productPickerSelect,
  productRowSelect,
  type ProductOptionPayload,
  type ProductPickerPayload,
  type ProductRowPayload,
  type ProductsDbClient,
} from "./shared.js"

// --- Record types ---

export type ProductRecordCategory = {
  id: string
  slug: string
  name: string
  sendUnitId: string
  stockUnitId: string
  itemCoverageUnitId: string
}

export type ProductRecord = {
  id: string
  name: string
  categoryId: string
  manufacturerId: string
  manufacturerName: string
  style: string
  color: string
  width: string
  sheetSize: string
  thickness: string
  unitWeight: string
  coveragePerUnit: string
  sendUnitName: string
  sendUnitAbbrev: string
  stockUnitName: string
  stockUnitAbbrev: string
  itemCoverageUnitName: string
  itemCoverageUnitAbbrev: string
  // Backward-compat alias — same value as `itemCoverageUnitName`.
  coverageUnit: string
  notes: string
  createdAt: string
  updatedAt: string
  category: ProductRecordCategory
}

export type ProductDetailRecord = ProductRecord

export type ProductOptionRecord = {
  id: string
  name: string
  categoryId: string
  sendUnitName: string
  sendUnitAbbrev: string
}

export type ProductFormOptions = {
  categoryOptions: CategoryRecord[]
  manufacturerOptions: ManufacturerRecord[]
}

export type ProductDeleteStateResult = {
  id: string
  _count: {
    inventories: number
    templateItems: number
    workOrderItems: number
  }
}

// --- Normalizers ---

export function normalizeProductRow(product: ProductRowPayload): ProductRecord {
  const itemCoverageUnitName = product.itemCoverageUnitName ?? ""
  return {
    id: product.id,
    name: product.name,
    categoryId: product.categoryId,
    manufacturerId: product.manufacturerId ?? "",
    // Display rule: use manufacturer.companyName (live relation), falling back to
    // the stored manufacturerName column for products whose manufacturer link was
    // disconnected. agentName is intentionally NOT a fallback — products surface
    // the company name, not the agent's personal name.
    manufacturerName: product.manufacturer?.companyName ?? product.manufacturerName ?? "",
    style: product.style ?? "",
    color: product.color ?? "",
    width: product.width ?? "",
    sheetSize: product.sheetSize ?? "",
    thickness: product.thickness ?? "",
    unitWeight: product.unitWeight ?? "",
    coveragePerUnit: product.coveragePerUnit?.toString() ?? "",
    sendUnitName: product.sendUnitName ?? "",
    sendUnitAbbrev: product.sendUnitAbbrev ?? "",
    stockUnitName: product.stockUnitName ?? "",
    stockUnitAbbrev: product.stockUnitAbbrev ?? "",
    itemCoverageUnitName,
    itemCoverageUnitAbbrev: product.itemCoverageUnitAbbrev ?? "",
    coverageUnit: itemCoverageUnitName,
    notes: product.notes ?? "",
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    category: {
      id: product.category.id,
      slug: product.category.slug,
      name: product.category.name,
      sendUnitId: product.category.sendUnitId ?? "",
      stockUnitId: product.category.stockUnitId ?? "",
      itemCoverageUnitId: product.category.itemCoverageUnitId ?? "",
    },
  }
}

export function normalizeProductDetail(product: ProductRowPayload): ProductDetailRecord {
  return normalizeProductRow(product)
}

export function normalizeProductOption(product: ProductOptionPayload): ProductOptionRecord {
  const fallback = [product.style, product.color].filter((value): value is string => Boolean(value)).join(" - ")
  return {
    id: product.id,
    name: product.name || fallback,
    categoryId: product.categoryId,
    sendUnitName: product.sendUnitName ?? "",
    sendUnitAbbrev: product.sendUnitAbbrev ?? "",
  }
}

// --- Read functions ---

export async function listProducts(client: ProductsDbClient = db): Promise<ProductRecord[]> {
  const rows = await client.flooringProduct.findMany({
    select: productRowSelect,
    orderBy: [{ name: "asc" }, { createdAt: "desc" }],
  })
  return rows.map(normalizeProductRow)
}

export async function getProductById(
  id: string,
  client: ProductsDbClient = db,
): Promise<ProductRecord | null> {
  const row = await client.flooringProduct.findUnique({
    where: { id },
    select: productRowSelect,
  })
  return row ? normalizeProductRow(row) : null
}

export async function getProductDetailById(
  id: string,
  client: ProductsDbClient = db,
): Promise<ProductDetailRecord | null> {
  const row = await client.flooringProduct.findUnique({
    where: { id },
    select: productRowSelect,
  })
  return row ? normalizeProductDetail(row) : null
}

export async function listProductOptions(client: ProductsDbClient = db): Promise<ProductOptionRecord[]> {
  const rows = await client.flooringProduct.findMany({
    select: productOptionSelect,
    orderBy: [{ name: "asc" }, { style: "asc" }, { color: "asc" }],
  })
  return rows.map(normalizeProductOption)
}

// --- Picker / options search ---

export type ProductOptionsSearchArgs = {
  search?: string
  categoryId?: string
  take: number
}

function normalizeProductPicker(row: ProductPickerPayload): ProductPickerOption {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.categoryId,
    categoryName: row.category.name,
    sendUnitAbbrev: row.sendUnitAbbrev ?? "",
  }
}

export async function searchProductOptions(
  args: ProductOptionsSearchArgs,
  client: ProductsDbClient = db,
): Promise<ProductPickerOption[]> {
  const clauses: Prisma.FlooringProductWhereInput[] = []
  if (args.search) {
    clauses.push({ name: { contains: args.search, mode: "insensitive" } })
  }
  if (args.categoryId) {
    clauses.push({ categoryId: args.categoryId })
  }
  const where =
    clauses.length === 0 ? undefined : clauses.length === 1 ? clauses[0] : { AND: clauses }

  const rows = await client.flooringProduct.findMany({
    where,
    orderBy: { name: "asc" },
    take: args.take,
    select: productPickerSelect,
  })

  return rows.map(normalizeProductPicker)
}

export async function getProductPickerOptionById(
  id: string,
  client: ProductsDbClient = db,
): Promise<ProductPickerOption | null> {
  const row = await client.flooringProduct.findUnique({
    where: { id },
    select: productPickerSelect,
  })
  return row ? normalizeProductPicker(row) : null
}

export async function getProductPickerOptionsByIds(
  ids: ReadonlyArray<string>,
  client: ProductsDbClient = db,
): Promise<ProductPickerOption[]> {
  if (ids.length === 0) return []
  const unique = Array.from(
    new Set(ids.filter((id) => typeof id === "string" && id.length > 0)),
  )
  if (unique.length === 0) return []
  const rows = await client.flooringProduct.findMany({
    where: { id: { in: unique } },
    select: productPickerSelect,
  })
  return rows.map(normalizeProductPicker)
}

export async function productNameExists(
  name: string,
  options: { excludeId?: string; client?: ProductsDbClient } = {},
): Promise<boolean> {
  const client = options.client ?? db
  const existing = await client.flooringProduct.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      ...(options.excludeId ? { NOT: { id: options.excludeId } } : {}),
    },
    select: { id: true },
  })
  return Boolean(existing)
}

export async function getProductDeleteState(
  id: string,
  client: ProductsDbClient = db,
): Promise<ProductDeleteStateResult | null> {
  return client.flooringProduct.findUnique({
    where: { id },
    select: {
      id: true,
      _count: {
        select: {
          inventories: true,
          templateItems: true,
          workOrderItems: true,
        },
      },
    },
  })
}

export async function getProductFormOptions(
  client: ProductsDbClient = db,
): Promise<ProductFormOptions> {
  // Pass-through of the canonical category and manufacturer records.
  // UI consumers / application use cases reshape for specific dropdowns.
  const [categoryOptions, manufacturerOptions] = await Promise.all([
    listCategories(client),
    listManufacturers(client),
  ])
  return { categoryOptions, manufacturerOptions }
}

// --- List-view read ---

export type ProductListViewOptions = {
  search?: string
  filters?: { categoryId?: ReadonlyArray<string> }
  skip: number
  take: number
}

export type ProductListViewResult = {
  rows: ProductRecord[]
  total: number
}

function buildListViewWhere(
  options: Pick<ProductListViewOptions, "search" | "filters">,
): Prisma.FlooringProductWhereInput | undefined {
  const clauses: Prisma.FlooringProductWhereInput[] = []

  if (options.search) {
    clauses.push({ style: { contains: options.search, mode: "insensitive" } })
  }

  const categoryIds = options.filters?.categoryId
  if (categoryIds && categoryIds.length > 0) {
    clauses.push({ categoryId: { in: [...categoryIds] } })
  }

  if (clauses.length === 0) return undefined
  if (clauses.length === 1) return clauses[0]
  return { AND: clauses }
}

export async function listProductsForListView(
  options: ProductListViewOptions,
  client: ProductsDbClient = db,
): Promise<ProductListViewResult> {
  const where = buildListViewWhere(options)

  const [total, rows] = await Promise.all([
    client.flooringProduct.count({ where }),
    client.flooringProduct.findMany({
      where,
      orderBy: [{ category: { slug: "asc" } }, { name: "asc" }],
      skip: options.skip,
      take: options.take,
      select: productRowSelect,
    }),
  ])

  return {
    total,
    rows: rows.map(normalizeProductRow),
  }
}
