import type { UnitOfMeasure, UnitOfMeasureListRow } from "./types.js"

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

type UnitOfMeasureDetailInput = {
  id: string
  name: string
  abbreviation: string
  createdAt: Date | string
  updatedAt: Date | string
}

export function normalizeUnitOfMeasureDetail(unit: UnitOfMeasureDetailInput): UnitOfMeasure {
  return {
    id: unit.id,
    name: unit.name,
    abbreviation: unit.abbreviation,
    createdAt: unit.createdAt instanceof Date ? unit.createdAt.toISOString() : unit.createdAt,
    updatedAt: unit.updatedAt instanceof Date ? unit.updatedAt.toISOString() : unit.updatedAt,
  }
}
