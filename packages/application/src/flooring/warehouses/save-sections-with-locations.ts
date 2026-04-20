import { randomUUID } from "node:crypto"
import {
  applySectionsWithLocationsDiff,
  getExistingSectionNumbers,
  getWarehouseById,
  listLocationsByWarehouse,
  withDatabaseTransaction,
  type SectionRecord,
} from "@builders/db"
import {
  assignDiffIds,
  computeNextNumber,
  validateDiff,
  type SectionsWithLocationsDiff,
} from "@builders/domain"
import { WarehouseExecutionError } from "./errors.js"
import { toLocationResult, type LocationResult } from "./mappers.js"

export type SaveSectionsWithLocationsResult = {
  sections: SectionRecord[]
  locations: LocationResult[]
  tempIdMap: Record<string, string>
}

export async function saveSectionsWithLocationsUseCase(
  warehouseId: string,
  diff: SectionsWithLocationsDiff,
): Promise<SaveSectionsWithLocationsResult> {
  return withDatabaseTransaction(async (tx) => {
      const warehouse = await getWarehouseById(warehouseId, tx)
      if (!warehouse) {
        throw new WarehouseExecutionError({
          code: "WAREHOUSE_NOT_FOUND",
          message: "Warehouse not found",
          status: 404,
        })
      }

      const existingLocations = await listLocationsByWarehouse(warehouseId, tx)

      const issues = validateDiff(diff, {
        locations: existingLocations.map((l) => ({
          id: l.id,
          warehouseId: l.warehouseId,
          sectionId: l.sectionId,
          rafter: l.rafter,
          level: l.level,
        })),
      })
      if (issues.length > 0) {
        throw new WarehouseExecutionError({
          code: "DIFF_VALIDATION_FAILED",
          message: "Diff validation failed",
          status: 409,
          payload: { issues },
        })
      }

      const sectionsWithIds = assignDiffIds(diff.sections.added, randomUUID)
      const locationsWithIds = assignDiffIds(diff.locations.added, randomUUID)

      const existingSectionNumbers = await getExistingSectionNumbers(warehouseId, tx)
      const assignedNumbers: number[] = []
      const sectionsWithNumbers = sectionsWithIds.map((s) => {
        const number = computeNextNumber([...existingSectionNumbers, ...assignedNumbers])
        assignedNumbers.push(number)
        return { ...s, number }
      })

      const applyInput = {
        warehouseId,
        sections: {
          added: sectionsWithNumbers.map((s) => ({
            id: s.id,
            tempId: s.tempId,
            number: s.number,
          })),
          deleted: diff.sections.deleted.map((s) => ({ id: s.id })),
        },
        locations: {
          added: locationsWithIds.map((l) => ({
            id: l.id,
            tempId: l.tempId,
            sectionRef: l.sectionRef,
            rafter: l.rafter,
            level: l.level,
          })),
          modified: diff.locations.modified.map((l) => ({
            id: l.id,
            sectionId: l.sectionId,
            rafter: l.rafter,
            level: l.level,
          })),
          deleted: diff.locations.deleted.map((l) => ({ id: l.id })),
        },
      }

      const result = await applySectionsWithLocationsDiff(tx, applyInput)

      return {
        sections: result.sections,
        locations: result.locations.map(toLocationResult),
        tempIdMap: result.tempIdMap,
      }
  })
}
