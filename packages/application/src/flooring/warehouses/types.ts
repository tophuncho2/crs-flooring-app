import type { WarehouseRecord } from "@builders/db"

export type CreateWarehouseInput = {
  name: string
  address: string | null
  phone: string | null
}

export type UpdateWarehouseInput = {
  name?: string
  address?: string | null
  phone?: string | null
}

export type WarehouseResult = WarehouseRecord
