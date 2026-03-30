export function normalizeCategoryNameForUniqueness(value: string) {
  return value.trim().toLowerCase()
}

export function isCategoryNameConflict(exists: boolean) {
  return exists
}

export function isCategoryDeleteBlocked(productCount: number) {
  return productCount > 0
}
