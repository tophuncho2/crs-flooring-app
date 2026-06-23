// Cross-layer config for the warehouses list view. Declared in domain
// because these values are referenced by both server-side use cases / route
// validators (in @builders/application) and the client-side controller / data
// wrapper (in apps/web/modules/warehouse/).

export const LIST_WAREHOUSES_PAGE_SIZE = 50
export const LIST_WAREHOUSES_MAX_PAGE_SIZE = 200

// Slimmer projection of `WarehouseRow` for the list view: drops `fullAddress`
// (a derived display string the table doesn't render). Kept structurally
// assignable from `WarehouseRow` so mutation responses can be stored where a
// list row is expected.
export type WarehouseListRow = {
  id: string
  warehouseNumber: string
  name: string
  streetAddress: string
  city: string
  state: string
  postalCode: string
  phone: string | null
  workOrdersCount: number
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
}
