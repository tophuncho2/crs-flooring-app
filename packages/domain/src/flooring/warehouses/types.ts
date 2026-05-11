export type WarehouseRow = {
  id: string
  number: number
  name: string
  address: string | null
  phone: string | null
  workOrdersCount: number
  createdAt: string
  updatedAt: string
}

// Slim option shape consumed by the canonical WarehousePicker (server-side
// search). Mirrors the existing `ManagementCompanyOption` / `CategoryOption`
// pattern.
export type WarehouseOption = {
  id: string
  name: string
}

export type WarehouseForm = {
  name: string
  address: string
  phone: string
}

export const EMPTY_WAREHOUSE_FORM: WarehouseForm = {
  name: "",
  address: "",
  phone: "",
}

export function toWarehouseForm(row: WarehouseRow): WarehouseForm {
  return {
    name: row.name,
    address: row.address ?? "",
    phone: row.phone ?? "",
  }
}
