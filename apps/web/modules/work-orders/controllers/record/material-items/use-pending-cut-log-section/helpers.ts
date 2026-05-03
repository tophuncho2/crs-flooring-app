import type { CutLogRow } from "@builders/domain"
import type { DraftRow, PendingCutLogForm, SavedRow, SectionRow } from "./types"

export function toSavedRow(row: CutLogRow): SavedRow {
  return { kind: "saved", row, edits: {}, locationFilterCode: "", sectionFilterCode: "" }
}

export function rowId(row: SectionRow): string {
  return row.kind === "draft" ? row.clientId : row.row.id
}

export function isSavedDirty(row: SavedRow): boolean {
  return Object.keys(row.edits).length > 0
}

export function isDraftDirty(row: DraftRow): boolean {
  return (
    row.form.inventoryId !== "" ||
    row.form.cut !== "" ||
    row.form.isWaste !== false ||
    row.form.notes !== ""
  )
}

export function buildSavedForm(row: SavedRow): PendingCutLogForm {
  return {
    inventoryId: row.row.inventoryId,
    locationFilterCode: row.locationFilterCode,
    sectionFilterCode: row.sectionFilterCode,
    cut: row.edits.cut ?? row.row.cut,
    isWaste: row.edits.isWaste ?? row.row.isWaste,
    notes: row.edits.notes ?? row.row.notes,
  }
}
