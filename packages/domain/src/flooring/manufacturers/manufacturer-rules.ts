export function normalizeManufacturerCompanyNameForUniqueness(value: string) {
  return value.trim().toLowerCase()
}

export function isManufacturerCompanyNameConflict(exists: boolean) {
  return exists
}
