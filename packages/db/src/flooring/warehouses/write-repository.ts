import { normalizeAddressState, normalizePhoneNumber } from "@builders/domain"
import type { Prisma } from "../../generated/prisma/client.js"
import { db } from "../../client.js"
import { warehouseRowSelect, type WarehousesDbClient } from "./shared.js"
import { normalizeWarehouseRow, type WarehouseRecord } from "./read-repository.js"

function prepareState(value: string | null): string | null {
  if (value == null) return null
  return normalizeAddressState(value)
}

// Phone standard: persist the canonical digits-only form (defensive guard — the
// API validator already normalized, but the data layer is the last gate).
// `undefined` is preserved so a partial update never clears the column.
function normalizeNullablePhone(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  return normalizePhoneNumber(value) || null
}

// --- Input types ---

export type CreateWarehouseInput = {
  name: string
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  phone: string | null
}

export type UpdateWarehouseInput = {
  name?: string
  streetAddress?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  phone?: string | null
}

// --- Warehouse writes (single-entity) ---

export async function createWarehouse(
  input: CreateWarehouseInput,
  client: WarehousesDbClient = db,
): Promise<WarehouseRecord> {
  const row = await client.flooringWarehouse.create({
    data: {
      name: input.name,
      streetAddress: input.streetAddress,
      city: input.city,
      state: prepareState(input.state),
      postalCode: input.postalCode,
      phone: normalizeNullablePhone(input.phone),
    },
    select: warehouseRowSelect,
  })
  return normalizeWarehouseRow(row)
}

export async function updateWarehouse(
  id: string,
  input: UpdateWarehouseInput,
  client: WarehousesDbClient = db,
): Promise<WarehouseRecord> {
  const data: Prisma.FlooringWarehouseUpdateInput = {}
  if (input.name !== undefined) data.name = input.name
  if (input.streetAddress !== undefined) data.streetAddress = input.streetAddress
  if (input.city !== undefined) data.city = input.city
  if (input.state !== undefined) data.state = prepareState(input.state)
  if (input.postalCode !== undefined) data.postalCode = input.postalCode
  if (input.phone !== undefined) data.phone = normalizeNullablePhone(input.phone)

  const row = await client.flooringWarehouse.update({
    where: { id },
    data,
    select: warehouseRowSelect,
  })
  return normalizeWarehouseRow(row)
}

export async function deleteWarehouseById(
  id: string,
  client: WarehousesDbClient = db,
): Promise<void> {
  await client.flooringWarehouse.delete({ where: { id } })
}
