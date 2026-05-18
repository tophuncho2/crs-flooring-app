import type { WarehouseRecord } from "@builders/db"

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

export type WarehouseResult = WarehouseRecord
