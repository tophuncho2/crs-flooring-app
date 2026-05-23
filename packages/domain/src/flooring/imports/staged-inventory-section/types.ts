// Combined diff shape for the imports record-view "staged inventory"
// section. The section bundles two slices into a single atomic save:
//
//   - filters: filter-row CRUD (parent rows)
//   - rows:    staged-inventory-row CRUD (expandable child rows under
//              a saved filter row — unsaved-parent rule preserved)
//
// The combined use case applies the filter slice first (so any new
// filter rows materialize before staged-row creation runs), then the
// rows slice. Section-level conflict detection rides on the parent
// import's revisionKey — same envelope as the filter-rows-only diff
// it supersedes.

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
