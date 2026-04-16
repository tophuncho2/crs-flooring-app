export type WarehouseRow = {
  id: string
  slug: string
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
  slug: string
  name: string
  locationsCount: number
  createdAt: string
  updatedAt: string
}

export type LocationRow = {
  id: string
  warehouseId: string
  sectionId: string
  locationCode: string
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

export type SectionForm = {
  name: string
}

export type LocationForm = {
  sectionId: string
  locationCode: string
}

export const EMPTY_WAREHOUSE_FORM: WarehouseForm = {
  name: "",
  address: "",
  phone: "",
}

export const EMPTY_SECTION_FORM: SectionForm = {
  name: "",
}

export const EMPTY_LOCATION_FORM: LocationForm = {
  sectionId: "",
  locationCode: "",
}

export function toWarehouseForm(row: WarehouseRow): WarehouseForm {
  return {
    name: row.name,
    address: row.address ?? "",
    phone: row.phone ?? "",
  }
}

export function toSectionForm(row: SectionRow): SectionForm {
  return {
    name: row.name,
  }
}

export function toLocationForm(row: LocationRow): LocationForm {
  return {
    sectionId: row.sectionId,
    locationCode: row.locationCode,
  }
}
