import type { ImportRecord } from "@builders/db"
import type { PaletteColor } from "@builders/domain"

export type CreateImportInput = {
  purchaseOrderNumber: string
  internalNotes: string
  warehouseId: string
  manufacturerId: string
  entityId: string
}

// `color` is the editable palette tag — added explicitly to the update input
// only (create never accepts it; new rows fall to the DB default SLATE). A
// non-semantic visual tag, carried through to the repo unread (no recompute).
export type UpdateImportInput = Partial<CreateImportInput> & { color?: PaletteColor }

export type ImportResult = ImportRecord
