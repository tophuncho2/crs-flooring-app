import { db } from "../../client.js"
import {
  listCategories,
  normalizeCategoryRow,
  type CategoryRecord,
} from "../categories/read-repository.js"
import {
  listManufacturers,
  type ManufacturerRecord,
} from "../manufacturers/read-repository.js"
import {
  productOptionSelect,
  productRowSelect,
  type ProductOptionPayload,
  type ProductRowPayload,
  type ProductsDbClient,
} from "./shared.js"

// --- Record types ---

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
  coverageUnit: string
  notes: string
  createdAt: string
  updatedAt: string
  category: CategoryRecord
}

export type ProductDetailRecord = ProductRecord

export type ProductOptionRecord = {
  id: string
  name: string
  categoryId: string
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
    coverageUnit: product.category.itemCoverageUnit?.name ?? "",
    notes: product.notes ?? "",
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    category: normalizeCategoryRow(product.category),
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
