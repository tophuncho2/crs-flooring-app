import type { PaletteColor } from "@builders/domain"
import type { Prisma } from "../../generated/prisma/client.js"
import { db } from "../../client.js"
import { productRowSelect, type ProductsDbClient } from "./shared.js"
import { normalizeProductRow, type ProductRecord } from "./read-repository.js"

// --- Input types ---
//
// `name` is pre-resolved by the application use case from
// `buildStoredFlooringProductName({ categoryName, style, color })`. Keeping the
// data layer free of name-building logic maintains the "persistence only" rule
// for packages/db.
//
// The unit-of-measure snapshot fields (sendUnit/stockUnit × Name/Abbrev) are
// pre-computed by the application use case via
// `buildProductUnitSnapshotsFromCategory` from `@builders/domain` and passed in
// at create time. They're immutable post-create — `UpdateProductInput` omits
// them.

export type CreateProductInput = {
  name: string
  categoryId: string
  entityId: string | null
  style: string | null
  color: string | null
  // Mutable reference value (mutable on create AND update). Canonical decimal
  // string off the wire (mirrors inventory `startingStock`); Prisma coerces it
  // to the Decimal column on write.
  coveragePerUnit: string | null
  productNamingAddon: string | null
  sendUnitName: string | null
  sendUnitAbbrev: string | null
  stockUnitName: string | null
  stockUnitAbbrev: string | null
  // Actor-email snapshots — server-assigned from the authenticated user, not off
  // the wire. Both stamped on create; `updatedBy` flips on every update.
  createdBy: string
  updatedBy: string
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
  | "createdBy"

// `updatedBy` is required on every update (always stamped with the actor email),
// so it's carried explicitly rather than left optional in the `Partial<…>`.
// `paletteColor` is update-only (the non-semantic tag) — never on create
// (`CreateProductInput`), so new rows fall to the DB default SLATE.
export type UpdateProductInput = Partial<
  Omit<CreateProductInput, ImmutableProductFields | "updatedBy">
> & { updatedBy: string; paletteColor?: PaletteColor }

// --- Writes ---

export async function createProduct(
  input: CreateProductInput,
  client: ProductsDbClient = db,
): Promise<ProductRecord> {
  const row = await client.flooringProduct.create({
    data: {
      name: input.name,
      categoryId: input.categoryId,
      entityId: input.entityId,
      style: input.style,
      color: input.color,
      coveragePerUnit: input.coveragePerUnit,
      productNamingAddon: input.productNamingAddon,
      sendUnitName: input.sendUnitName,
      sendUnitAbbrev: input.sendUnitAbbrev,
      stockUnitName: input.stockUnitName,
      stockUnitAbbrev: input.stockUnitAbbrev,
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
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
  const data: Prisma.FlooringProductUncheckedUpdateInput = { updatedBy: input.updatedBy }
  if (input.name !== undefined) data.name = input.name
  if (input.entityId !== undefined) data.entityId = input.entityId
  if (input.style !== undefined) data.style = input.style
  if (input.color !== undefined) data.color = input.color
  if (input.coveragePerUnit !== undefined) data.coveragePerUnit = input.coveragePerUnit
  if (input.productNamingAddon !== undefined) data.productNamingAddon = input.productNamingAddon
  if (input.paletteColor !== undefined) data.paletteColor = input.paletteColor

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
