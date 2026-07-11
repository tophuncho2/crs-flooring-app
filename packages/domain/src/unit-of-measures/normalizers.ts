import { toIsoTimestamp } from "../shared/date-format.js"
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
    createdAt: toIsoTimestamp(unit.createdAt),
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
    createdAt: toIsoTimestamp(unit.createdAt),
    updatedAt: toIsoTimestamp(unit.updatedAt),
  }
}
