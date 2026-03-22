export type UnitOfMeasureRow = {
  id: string
  name: string
  createdAt: string
}

export type UnitOfMeasureForm = {
  name: string
}

export const EMPTY_UNIT_OF_MEASURE_FORM: UnitOfMeasureForm = {
  name: "",
}

export function validateUnitOfMeasureForm(input: UnitOfMeasureForm) {
  return input.name.trim() ? "" : "Unit of measure is required"
}

export function toUnitOfMeasureForm(unit: UnitOfMeasureRow): UnitOfMeasureForm {
  return { name: unit.name }
}
