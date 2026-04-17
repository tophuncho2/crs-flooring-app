export type WarehouseRow = {
  id: string
  number: number
  name: string
  address: string | null
  phone: string | null
  sectionsCount: number
  locationsCount: number
  workOrdersCount: number
  createdAt: string
  updatedAt: string
}

export type SectionRow = {
  id: string
  warehouseId: string
  number: number
  locationsCount: number
  createdAt: string
  updatedAt: string
}

export type LocationRow = {
  id: string
  warehouseId: string
  sectionId: string
  rafter: number
  level: number
  label: string
  inventoriesCount: number
  createdAt: string
  updatedAt: string
}

export type WarehouseDetail = WarehouseRow & {
  sections: SectionRow[]
  locations: LocationRow[]
}

export type WarehouseForm = {
  name: string
  address: string
  phone: string
}

export type LocationForm = {
  sectionId: string
  rafter: number
  level: number
}

export const EMPTY_WAREHOUSE_FORM: WarehouseForm = {
  name: "",
  address: "",
  phone: "",
}

export const EMPTY_LOCATION_FORM: LocationForm = {
  sectionId: "",
  rafter: 0,
  level: 0,
}

export function toWarehouseForm(row: WarehouseRow): WarehouseForm {
  return {
    name: row.name,
    address: row.address ?? "",
    phone: row.phone ?? "",
  }
}

export function toLocationForm(row: LocationRow): LocationForm {
  return {
    sectionId: row.sectionId,
    rafter: row.rafter,
    level: row.level,
  }
}
