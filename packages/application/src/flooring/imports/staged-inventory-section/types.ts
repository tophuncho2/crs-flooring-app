import type {
  StagedInventoryFilterRecord,
  StagedInventoryRecord,
} from "@builders/db"
import type { ImportStagedInventorySectionDiff } from "@builders/domain"

export type SaveImportStagedInventorySectionInput = {
  importEntryId: string
  diff: ImportStagedInventorySectionDiff
}

export type SaveImportStagedInventorySectionResult = {
  filterRows: StagedInventoryFilterRecord[]
  stagedRows: StagedInventoryRecord[]
  filterTempIdMap: Record<string, string>
  rowTempIdMap: Record<string, string>
}
