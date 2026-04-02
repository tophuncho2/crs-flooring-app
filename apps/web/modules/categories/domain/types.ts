export type CategoryRow = {
  id: string
  name: string
  sendUnitId: string
  stockUnitId: string
  coverageAvailableUnitId: string
  itemCoverageUnitId: string
  serviceUnitId: string
  sendUnit: string
  stockUnit: string
  coverageAvailableUnit: string
  itemCoverageUnit: string
  serviceUnit: string
  productCount: number
  createdAt: string
  updatedAt: string
}

export type CategoryForm = {
  name: string
  sendUnitId: string
  stockUnitId: string
  coverageAvailableUnitId: string
  itemCoverageUnitId: string
  serviceUnitId: string
}

export type UnitOfMeasureOption = {
  id: string
  name: string
  createdAt: string
}

export const EMPTY_CATEGORY_FORM: CategoryForm = {
  name: "",
  sendUnitId: "",
  stockUnitId: "",
  coverageAvailableUnitId: "",
  itemCoverageUnitId: "",
  serviceUnitId: "",
}

export function normalizeCategoryName(value: string) {
  return value.trim()
}

export function validateCategoryForm(input: CategoryForm) {
  return normalizeCategoryName(input.name) ? "" : "Category name is required"
}

export function toCategoryForm(category: CategoryRow): CategoryForm {
  return {
    name: category.name,
    sendUnitId: category.sendUnitId,
    stockUnitId: category.stockUnitId,
    coverageAvailableUnitId: category.coverageAvailableUnitId,
    itemCoverageUnitId: category.itemCoverageUnitId,
    serviceUnitId: category.serviceUnitId,
  }
}
