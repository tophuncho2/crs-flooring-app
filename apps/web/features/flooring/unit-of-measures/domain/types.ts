export type UnitOfMeasureRow = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export type UnitOfMeasureForm = {
  name: string
}

export const EMPTY_UNIT_OF_MEASURE_FORM: UnitOfMeasureForm = {
  name: "",
}

export function normalizeUnitOfMeasureName(value: string) {
  return value.trim()
}

export function validateUnitOfMeasureForm(input: UnitOfMeasureForm) {
  return normalizeUnitOfMeasureName(input.name) ? "" : "Unit of measure is required"
}

export function toUnitOfMeasureForm(unit: UnitOfMeasureRow): UnitOfMeasureForm {
  return { name: unit.name }
}
