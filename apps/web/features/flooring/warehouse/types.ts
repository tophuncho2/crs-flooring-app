export type WarehouseDraft = {
  name: string
  address: string
  phone: string
}

export type SectionRow = {
  id: string
  name: string
  locationsCount: number
}

export type LocationDraft = {
  locationCode: string
  sectionId: string
}

export type LocationRow = {
  id: string
  locationCode: string
  sectionId: string
  sectionName: string | null
}

export type WarehouseRow = {
  id: string
  name: string
  address: string | null
  phone: string | null
  sectionsCount: number
  locationsCount: number
  workOrdersCount: number
  createdAt: string
  updatedAt: string
}

export type WarehouseDetail = WarehouseRow & {
  sections: SectionRow[]
  locations: LocationRow[]
}

export type WarehouseSectionDraft = {
  id: string
  name: string
  locationsCount: number
}

export type WarehouseLocationDraft = {
  id: string
  locationCode: string
  sectionId: string
  sectionName: string | null
}

export function toWarehouseDraft(warehouse: Pick<WarehouseRow, "name" | "address" | "phone">): WarehouseDraft {
  return {
    name: warehouse.name,
    address: warehouse.address ?? "",
    phone: warehouse.phone ?? "",
  }
}

export function createWarehouseDetail(
  warehouse: WarehouseRow,
  sections: SectionRow[],
  locations: LocationRow[],
): WarehouseDetail {
  return {
    ...warehouse,
    sections,
    locations,
  }
}

export function toWarehouseSectionDrafts(record: Pick<WarehouseDetail, "sections">): WarehouseSectionDraft[] {
  return record.sections.map((section) => ({
    id: section.id,
    name: section.name,
    locationsCount: section.locationsCount,
  }))
}

export function toWarehouseLocationDrafts(record: Pick<WarehouseDetail, "locations">): WarehouseLocationDraft[] {
  return record.locations.map((location) => ({
    id: location.id,
    locationCode: location.locationCode,
    sectionId: location.sectionId,
    sectionName: location.sectionName,
  }))
}
