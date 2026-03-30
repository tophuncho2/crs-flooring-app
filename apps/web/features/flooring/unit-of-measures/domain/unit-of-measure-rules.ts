export function normalizeUnitOfMeasureNameForUniqueness(value: string) {
  return value.trim().toLowerCase()
}

export function isUnitOfMeasureNameConflict(exists: boolean) {
  return exists
}

export function isUnitOfMeasureDeleteBlocked(input: {
  categoryLinks: number
  serviceLinks: number
}) {
  return input.categoryLinks > 0 || input.serviceLinks > 0
}
