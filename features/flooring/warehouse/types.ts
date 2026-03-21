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
