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
// `unitId` is the canonical unit FK (UoM epic 2A). The legacy snapshot strings
// (sendUnit/stockUnit × Name/Abbrev) are no longer written on create — the FK is
// authoritative; those columns stay for the existing-row fallback until Phase C.

export type CreateProductInput = {
  name: string
  categoryId: string
  unitId: string
  entityId: string | null
  style: string | null
  color: string | null
  // Mutable reference value (mutable on create AND update). Canonical decimal
  // string off the wire (mirrors inventory `startingStock`); Prisma coerces it
  // to the Decimal column on write.
  coveragePerUnit: string | null
  // The product's own coverage unit FK (UoM epic 1a). Optional — null clears it.
  // Independent of the required main `unitId`; DB FK RESTRICT is the backstop.
  coverageUnitId: string | null
  productNamingAddon: string | null
  // Actor-email snapshots — server-assigned from the authenticated user, not off
  // the wire. Both stamped on create; `updatedBy` flips on every update.
  createdBy: string
  updatedBy: string
}

// `createdBy` is the only immutable field now. `categoryId` and `unitId` are
// MUTABLE post-create (UoM epic 2A retired the immutable unit snapshots).
// `updatedBy` is required on every update (always stamped with the actor email),
// so it's carried explicitly rather than left optional in the `Partial<…>`.
// `paletteColor` is update-only (the non-semantic tag) — never on create
// (`CreateProductInput`), so new rows fall to the DB default SLATE.
export type UpdateProductInput = Partial<
  Omit<CreateProductInput, "createdBy" | "updatedBy">
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
      unitId: input.unitId,
      entityId: input.entityId,
      style: input.style,
      color: input.color,
      coveragePerUnit: input.coveragePerUnit,
      coverageUnitId: input.coverageUnitId,
      productNamingAddon: input.productNamingAddon,
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
  if (input.categoryId !== undefined) data.categoryId = input.categoryId
  if (input.unitId !== undefined) data.unitId = input.unitId
  if (input.entityId !== undefined) data.entityId = input.entityId
  if (input.style !== undefined) data.style = input.style
  if (input.color !== undefined) data.color = input.color
  if (input.coveragePerUnit !== undefined) data.coveragePerUnit = input.coveragePerUnit
  if (input.coverageUnitId !== undefined) data.coverageUnitId = input.coverageUnitId
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
