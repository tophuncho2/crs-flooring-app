export type CategoryUnitRule = {
  hasCoverageUnit: boolean
}

export type CategoryMeta = {
  id: string
  slug: string
  name: string
  stockUnitName: string | null
  stockUnitAbbrev: string | null
  sendUnitName: string | null
  sendUnitAbbrev: string | null
  coverageAvailableUnitName: string | null
  coverageAvailableUnitAbbrev: string | null
  itemCoverageUnitName: string | null
  itemCoverageUnitAbbrev: string | null
}
