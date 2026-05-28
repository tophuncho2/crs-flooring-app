import type { StagedInventoryFiltersDiff } from "../staged-inventory-filter-rows/diff/types.js"
import type { StagedInventoryRowsDiff } from "../staged-inventory-rows/diff/types.js"

export type ImportStagedInventorySectionDiff = {
  filters: StagedInventoryFiltersDiff
  rows: StagedInventoryRowsDiff
}

export const EMPTY_IMPORT_STAGED_INVENTORY_SECTION_DIFF: ImportStagedInventorySectionDiff =
  {
    filters: { added: [], modified: [], deleted: [] },
    rows: { added: [], modified: [], deleted: [] },
  }

export function importStagedInventorySectionDiffIsEmpty(
  diff: ImportStagedInventorySectionDiff,
): boolean {
  return (
    diff.filters.added.length === 0 &&
    diff.filters.modified.length === 0 &&
    diff.filters.deleted.length === 0 &&
    diff.rows.added.length === 0 &&
    diff.rows.modified.length === 0 &&
    diff.rows.deleted.length === 0
  )
}
