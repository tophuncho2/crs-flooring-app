export type WarehouseRow = {
  id: string
  number: number
  name: string
  streetAddress: string
  city: string
  state: string
  postalCode: string
  fullAddress: string
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
  streetAddress: string
  city: string
  state: string
  postalCode: string
  phone: string
}

export const EMPTY_WAREHOUSE_FORM: WarehouseForm = {
  name: "",
  streetAddress: "",
  city: "",
  state: "",
  postalCode: "",
  phone: "",
}

// Accepts any structural superset of `WarehouseListRow` (i.e. the list row and
// the full `WarehouseRow` from a mutation response both work).
export function toWarehouseForm(
  row: Pick<WarehouseRow, "name" | "streetAddress" | "city" | "state" | "postalCode" | "phone">,
): WarehouseForm {
  return {
    name: row.name,
    streetAddress: row.streetAddress,
    city: row.city,
    state: row.state,
    postalCode: row.postalCode,
    phone: row.phone ?? "",
  }
}
