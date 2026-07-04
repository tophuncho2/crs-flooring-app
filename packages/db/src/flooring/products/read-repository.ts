import { db } from "../../client.js"
import type { Prisma } from "../../generated/prisma/client.js"
import type { PaletteColor, ProductOption, ProductStats } from "@builders/domain"
import {
  listCategories,
  type CategoryRecord,
} from "../categories/read-repository.js"
import {
  productDetailSelect,
  productOptionSelect,
  productRowSelect,
  type ProductDetailPayload,
  type ProductOptionPayload,
  type ProductRowPayload,
  type ProductsDbClient,
} from "./shared.js"
import { numberNeighborQueries } from "../../shared/number-neighbors.js"

// --- Record types ---

export type ProductRecordCategory = {
  id: string
  name: string
}

// Resolved unit-of-measure (UoM epic 2A) — the product's real unit off the FK.
export type ProductRecordUnit = {
  id: string
  name: string
  abbreviation: string
}

export type ProductRecord = {
  id: string
  productNumber: string
  name: string
  categoryId: string
  // Canonical unit FK + resolved unit. `unit` is null only for legacy rows not
  // yet backfilled (the column is nullable until the NOT-NULL migration runs).
  unitId: string
  unit: ProductRecordUnit | null
  entityId: string
  entityName: string
  style: string
  color: string
  // Non-semantic palette tag (metadata-only). Distinct from the physical `color`.
  paletteColor: PaletteColor
  coveragePerUnit: string
  // The product's own coverage unit FK + resolved unit (UoM epic 1a). Nullable —
  // "" / null until the user picks one. Independent of the main `unitId`.
  coverageUnitId: string
  coverageUnit: ProductRecordUnit | null
  productNamingAddon: string
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
  category: ProductRecordCategory
}

// Record-view shell stepper neighbors — the product rows immediately
// before/after this one in the global productNumberInt order. Mirrors the
// property/job-type neighbor shape. Products has no domain normalizers.ts, so
// these live here in the data layer alongside the row normalizer.
export type ProductNeighbor = { id: string }

export type ProductNeighbors = {
  previousProduct: ProductNeighbor | null
  nextProduct: ProductNeighbor | null
}

export const NO_PRODUCT_NEIGHBORS: ProductNeighbors = {
  previousProduct: null,
  nextProduct: null,
}

export type ProductDetailRecord = ProductRecord & ProductNeighbors

export type ProductOptionRecord = {
  id: string
  name: string
  categoryId: string
  // Canonical unit FK (UoM epic 2A) — seeds downstream row pickers.
  unitId: string
  categoryName: string
  unitName: string
  unitAbbrev: string
}

export type ProductFormOptions = {
  categoryOptions: CategoryRecord[]
}

export type ProductDeleteStateResult = {
  id: string
  _count: {
    inventories: number
    plannedProducts: number
    workOrderItems: number
  }
}

// --- Normalizers ---

export function normalizeProductRow(product: ProductRowPayload): ProductRecord {
  return {
    id: product.id,
    productNumber: product.productNumber,
    name: product.name,
    categoryId: product.categoryId,
    // Canonical unit FK + resolved unit (UoM epic 2A). `unitId` is "" only on
    // legacy rows before the backfill (the column is nullable until NOT NULL).
    unitId: product.unitId ?? "",
    unit: product.unit
      ? {
          id: product.unit.id,
          name: product.unit.name,
          abbreviation: product.unit.abbreviation,
        }
      : null,
    // Entity link (Entity Payments epic). entityName is the joined entity.entity
    // display name; "" when the product has no entity linked.
    entityId: product.entityId ?? "",
    entityName: product.entity?.entity ?? "",
    style: product.style ?? "",
    color: product.color ?? "",
    paletteColor: product.paletteColor,
    coveragePerUnit: product.coveragePerUnit?.toString() ?? "",
    // Product's own coverage unit (UoM epic 1a). "" / null until picked.
    coverageUnitId: product.coverageUnitId ?? "",
    coverageUnit: product.coverageUnit
      ? {
          id: product.coverageUnit.id,
          name: product.coverageUnit.name,
          abbreviation: product.coverageUnit.abbreviation,
        }
      : null,
    productNamingAddon: product.productNamingAddon ?? "",
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    createdBy: product.createdBy ?? null,
    updatedBy: product.updatedBy ?? null,
    category: {
      id: product.category.id,
      name: product.category.name,
    },
  }
}

export function normalizeProductDetail(
  product: ProductDetailPayload,
  neighbors: ProductNeighbors = NO_PRODUCT_NEIGHBORS,
): ProductDetailRecord {
  return {
    ...normalizeProductRow(product),
    previousProduct: neighbors.previousProduct,
    nextProduct: neighbors.nextProduct,
  }
}

/**
 * Resolve the product rows immediately before/after the given numeric sort key
 * in the global product-number order (`productNumberInt`). Powers the
 * record-view shell stepper — deliberately global: the stepper walks the raw
 * number line. Two single-row lookups on the `productNumberInt` index. Both
 * null when the key is null (no generated value yet) or at the sequence's edge.
 */
async function getProductNeighbors(
  productNumberInt: number | null,
  client: ProductsDbClient = db,
): Promise<ProductNeighbors> {
  if (productNumberInt === null) return NO_PRODUCT_NEIGHBORS

  const { previous: previousQuery, next: nextQuery } = numberNeighborQueries(
    "productNumberInt",
    productNumberInt,
  )
  const [previous, next] = await Promise.all([
    client.flooringProduct.findFirst({
      ...previousQuery,
      select: { id: true },
    }),
    client.flooringProduct.findFirst({
      ...nextQuery,
      select: { id: true },
    }),
  ])

  return {
    previousProduct: previous ? { id: previous.id } : null,
    nextProduct: next ? { id: next.id } : null,
  }
}

export function normalizeProductOption(product: ProductOptionPayload): ProductOptionRecord {
  const fallback = [product.style, product.color].filter((value): value is string => Boolean(value)).join(" - ")
  return {
    id: product.id,
    name: product.name || fallback,
    categoryId: product.categoryId,
    unitId: product.unitId ?? "",
    categoryName: product.category?.name ?? "",
    // Unit label + abbrev derive solely from the product's own unit FK (UoM epic
    // 2B); snapshot columns fully de-referenced (Phase-C dropped them). Row
    // pickers seed a row's unit from these.
    unitName: product.unit?.name ?? "",
    unitAbbrev: product.unit?.abbreviation ?? "",
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

/**
 * Read the full product detail. By default it also resolves the adjacent rows
 * for the record-view shell stepper; pass `{ withNeighbors: false }` on paths
 * that only read a snapshot (e.g. the update/delete conflict check) to skip the
 * two extra lookups.
 */
export async function getProductDetailById(
  id: string,
  options: { withNeighbors?: boolean } = {},
  client: ProductsDbClient = db,
): Promise<ProductDetailRecord | null> {
  const row = await client.flooringProduct.findUnique({
    where: { id },
    select: productDetailSelect,
  })
  if (!row) return null

  const neighbors =
    options.withNeighbors === false
      ? NO_PRODUCT_NEIGHBORS
      : await getProductNeighbors(row.productNumberInt, client)

  return normalizeProductDetail(row, neighbors)
}

// Read-only totals for the product record-view "Statistics" section. Kept
// separate from `productRowSelect` so the list view doesn't pay for these
// count subqueries per row.
export async function getProductStats(
  id: string,
  client: ProductsDbClient = db,
): Promise<ProductStats | null> {
  const row = await client.flooringProduct.findUnique({
    where: { id },
    select: {
      _count: {
        select: {
          plannedProducts: true,
          workOrderItems: true,
          inventories: true,
          inventoryAdjustments: true,
        },
      },
    },
  })
  if (!row) return null
  return {
    plannedProductsCount: row._count.plannedProducts,
    workOrderItemsCount: row._count.workOrderItems,
    inventoryCount: row._count.inventories,
    adjustmentsCount: row._count.inventoryAdjustments,
  }
}

export async function listProductOptions(client: ProductsDbClient = db): Promise<ProductOptionRecord[]> {
  const rows = await client.flooringProduct.findMany({
    select: productOptionSelect,
    orderBy: [{ name: "asc" }, { style: "asc" }, { color: "asc" }],
  })
  return rows.map(normalizeProductOption)
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
          plannedProducts: true,
          workOrderItems: true,
        },
      },
    },
  })
}

export async function getProductFormOptions(
  client: ProductsDbClient = db,
): Promise<ProductFormOptions> {
  // Pass-through of the canonical category records — a flat <select> on the
  // products record view. Entity selection uses the async EntityTypePicker.
  const categoryOptions = await listCategories(client)
  return { categoryOptions }
}

// --- List-view read ---

export type ProductListViewOptions = {
  search?: string
  filters?: {
    /**
     * Exact match on the generated `productNumberInt` (btree) — the toolbar's
     * PROD-# bar. Non-digits are stripped, so "5" and "PROD-5" both find PROD-5.
     */
    prodNumber?: string
    /** Substring (case-insensitive) matches on the free-text attribute columns. */
    color?: string
    style?: string
    namingAddon?: string
    categoryId?: ReadonlyArray<string>
  }
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
    clauses.push({ name: { contains: options.search, mode: "insensitive" } })
  }

  // Exact identity search on the generated int — strip non-digits, parse, match.
  // No digits → -1 sentinel so a junk term returns no rows (never all rows).
  const prodNumber = options.filters?.prodNumber?.trim() ?? ""
  if (prodNumber.length > 0) {
    const digits = prodNumber.replace(/\D/g, "")
    const parsed = digits.length > 0 ? Number.parseInt(digits, 10) : Number.NaN
    clauses.push({ productNumberInt: { equals: Number.isInteger(parsed) ? parsed : -1 } })
  }

  // Substring identity searches on the free-text attribute columns (trgm GIN).
  const color = options.filters?.color?.trim() ?? ""
  if (color.length > 0) {
    clauses.push({ color: { contains: color, mode: "insensitive" } })
  }

  const style = options.filters?.style?.trim() ?? ""
  if (style.length > 0) {
    clauses.push({ style: { contains: style, mode: "insensitive" } })
  }

  const namingAddon = options.filters?.namingAddon?.trim() ?? ""
  if (namingAddon.length > 0) {
    clauses.push({ productNamingAddon: { contains: namingAddon, mode: "insensitive" } })
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
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }, { id: "asc" }],
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

export type ProductOptionsSearchArgs = {
  search?: string
  categoryId?: string
  skip?: number
  take: number
}

export type ProductOptionsSearchResult = {
  items: ProductOption[]
  hasMore: boolean
}

export async function searchProductOptions(
  args: ProductOptionsSearchArgs,
  client: ProductsDbClient = db,
): Promise<ProductOptionsSearchResult> {
  const clauses: Prisma.FlooringProductWhereInput[] = []
  if (args.search) {
    clauses.push({ name: { contains: args.search, mode: "insensitive" } })
  }
  if (args.categoryId) {
    clauses.push({ categoryId: args.categoryId })
  }
  const where: Prisma.FlooringProductWhereInput | undefined =
    clauses.length === 0 ? undefined : clauses.length === 1 ? clauses[0] : { AND: clauses }

  // Fetch take+1 to detect a next page without a separate count query.
  const rows = await client.flooringProduct.findMany({
    where,
    orderBy: [{ name: "asc" }, { style: "asc" }, { color: "asc" }, { id: "asc" }],
    skip: args.skip ?? 0,
    take: args.take + 1,
    select: productOptionSelect,
  })

  const hasMore = rows.length > args.take
  const page = hasMore ? rows.slice(0, args.take) : rows
  return { items: page.map(normalizeProductOption), hasMore }
}
