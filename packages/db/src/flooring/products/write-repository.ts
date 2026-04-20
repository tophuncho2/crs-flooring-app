import type { Prisma } from "@prisma/client"
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

export type CreateProductInput = {
  name: string
  categoryId: string
  manufacturerId: string | null
  manufacturerName: string | null
  style: string | null
  color: string | null
  width: string | null
  sheetSize: string | null
  thickness: string | null
  unitWeight: string | null
  coveragePerUnit: Prisma.Decimal | null
  notes: string | null
}

export type UpdateProductInput = Partial<CreateProductInput>

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
      width: input.width,
      sheetSize: input.sheetSize,
      thickness: input.thickness,
      unitWeight: input.unitWeight,
      coveragePerUnit: input.coveragePerUnit,
      notes: input.notes,
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
  if (input.categoryId !== undefined) data.categoryId = input.categoryId
  if (input.manufacturerId !== undefined) data.manufacturerId = input.manufacturerId
  if (input.manufacturerName !== undefined) data.manufacturerName = input.manufacturerName
  if (input.style !== undefined) data.style = input.style
  if (input.color !== undefined) data.color = input.color
  if (input.width !== undefined) data.width = input.width
  if (input.sheetSize !== undefined) data.sheetSize = input.sheetSize
  if (input.thickness !== undefined) data.thickness = input.thickness
  if (input.unitWeight !== undefined) data.unitWeight = input.unitWeight
  if (input.coveragePerUnit !== undefined) data.coveragePerUnit = input.coveragePerUnit
  if (input.notes !== undefined) data.notes = input.notes

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
