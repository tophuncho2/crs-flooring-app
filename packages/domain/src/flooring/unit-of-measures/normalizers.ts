import type { UnitOfMeasureListRow } from "./types.js"

type UnitOfMeasureListRowInput = {
  id: string
  name: string
  abbreviation: string
  createdAt: Date | string
}

export function normalizeUnitOfMeasureListRow(
  unit: UnitOfMeasureListRowInput,
): UnitOfMeasureListRow {
  return {
    id: unit.id,
    name: unit.name,
    abbreviation: unit.abbreviation,
    createdAt: unit.createdAt instanceof Date ? unit.createdAt.toISOString() : unit.createdAt,
  }
}
