export type CategoryMeta = {
  id: string
  slug: string
  name: string
  stockUnitName: string | null
  stockUnitAbbrev: string | null
  sendUnitName: string | null
  sendUnitAbbrev: string | null
}

// Slim option shape consumed by the canonical CategoryPicker (server-side
// search). `slug` is included so the picker can show it as a subtitle line
// without an extra fetch.
export type CategoryOption = {
  id: string
  name: string
  slug: string
}
