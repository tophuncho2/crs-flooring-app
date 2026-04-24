/**
 * Staged rows are immutable once the worker has copied them into a live
 * inventory row (`isImported = true`). The UI greys out such rows; the diff
 * validator + per-row-update use case reject any edit or delete that targets
 * a locked row.
 */
export function isStagedRowLocked(row: { isImported: boolean }): boolean {
  return row.isImported === true
}

/**
 * Inverse of `isStagedRowLocked` — returns true when the worker can still
 * pick this row up for import.
 */
export function canImportStagedRow(row: { isImported: boolean }): boolean {
  return row.isImported === false
}
