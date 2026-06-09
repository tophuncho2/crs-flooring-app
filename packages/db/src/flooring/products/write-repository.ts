import type { Prisma } from "../../generated/prisma/client.js"
import { db } from "../../client.js"
import { productRowSelect, type ProductsDbClient } from "./shared.js"
import { normalizeProductRow, type ProductRecord } from "./read-repository.js"

// --- Input types ---
//
// `name` and `manufacturerName` are pre-resolved by the application use case:
// - `name` is computed from `buildStoredFlooringProductName({ categoryName, style, color })`
// - `manufacturerName` is the resolved display name from the selected manufacturer row
// Keeping the data layer free of name-building and FK-lookup logic maintains the
// "persistence only" rule for packages/db.
//
// The unit-of-measure snapshot fields (sendUnit/stockUnit × Name/Abbrev) are
// pre-computed by the application use case via
// `buildProductUnitSnapshotsFromCategory` from `@builders/domain` and passed in
// at create time. They're immutable post-create — `UpdateProductInput` omits
// them.

export type CreateProductInput = {
  name: string
  categoryId: string
  manufacturerId: string | null
  manufacturerName: string | null
  style: string | null
  color: string | null
  note: string | null
  sendUnitName: string | null
  sendUnitAbbrev: string | null
  stockUnitName: string | null
  stockUnitAbbrev: string | null
}

// `categoryId` and the unit-snapshot fields are immutable post-create —
// removed from the update shape at the type level so call sites can't pass
// them. Category drives the unit snapshots (the tightened
// `isProductCategoryChangeBlocked` predicate in @builders/domain catches
// anything that bypasses the type system).
type ImmutableProductFields =
  | "categoryId"
  | "sendUnitName"
  | "sendUnitAbbrev"
  | "stockUnitName"
  | "stockUnitAbbrev"

export type UpdateProductInput = Partial<Omit<CreateProductInput, ImmutableProductFields>>

// --- Writes ---

export async function createProduct(
  input: CreateProductInput,
  client: ProductsDbClient = db,
): Promise<ProductRecord> {
  const row = await client.flooringProduct.create({
    data: {
      name: input.name,
      categoryId: input.categoryId,
      manufacturerId: input.manufacturerId,
      manufacturerName: input.manufacturerName,
      style: input.style,
      color: input.color,
      note: input.note,
      sendUnitName: input.sendUnitName,
      sendUnitAbbrev: input.sendUnitAbbrev,
      stockUnitName: input.stockUnitName,
      stockUnitAbbrev: input.stockUnitAbbrev,
    },
    select: productRowSelect,
  })
  return normalizeProductRow(row)
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
  client: ProductsDbClient = db,
): Promise<ProductRecord> {
  const data: Prisma.FlooringProductUncheckedUpdateInput = {}
  if (input.name !== undefined) data.name = input.name
  if (input.manufacturerId !== undefined) data.manufacturerId = input.manufacturerId
  if (input.manufacturerName !== undefined) data.manufacturerName = input.manufacturerName
  if (input.style !== undefined) data.style = input.style
  if (input.color !== undefined) data.color = input.color
  if (input.note !== undefined) data.note = input.note

  const row = await client.flooringProduct.update({
    where: { id },
    data,
    select: productRowSelect,
  })
  return normalizeProductRow(row)
}

export async function deleteProductById(
  id: string,
  client: ProductsDbClient = db,
): Promise<void> {
  await client.flooringProduct.delete({ where: { id } })
}
