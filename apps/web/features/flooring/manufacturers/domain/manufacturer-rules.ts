export function normalizeManufacturerCompanyNameForUniqueness(value: string) {
  return value.trim().toLowerCase()
}

export function isManufacturerCompanyNameConflict(exists: boolean) {
  return exists
}

export function isManufacturerDeleteBlocked(productCount: number) {
  return productCount > 0
}
