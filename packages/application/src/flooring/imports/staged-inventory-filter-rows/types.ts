import type { StagedInventoryFilterRecord } from "@builders/db"
import type { StagedInventoryFiltersDiff } from "@builders/domain"

export type SaveStagedInventoryFiltersInput = {
  importEntryId: string
  diff: StagedInventoryFiltersDiff
}

export type SaveStagedInventoryFiltersResult = {
  rows: StagedInventoryFilterRecord[]
  tempIdMap: Record<string, string>
}
