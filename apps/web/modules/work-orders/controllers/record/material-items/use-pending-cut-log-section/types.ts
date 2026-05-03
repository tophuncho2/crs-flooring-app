import type { CutLogRow, FlooringCutLogStatus } from "@builders/domain"

/**
 * Editable form values driving the per-row UI. `locationFilterCode` and
 * `sectionFilterCode` are UI-only — never sent to the server, mutually
 * exclusive (setting one clears the other). `inventoryId` is editable on
 * drafts only; saved rows treat it as immutable.
 */
export type PendingCutLogForm = {
  inventoryId: string
  locationFilterCode: string
  sectionFilterCode: string
  cut: string
  isWaste: boolean
  notes: string
}

/**
 * Per-row controller surface returned by `usePendingCutLogSection.getRowController`.
 * Each cut-log row consumes this to render itself: the editable form values,
 * the commit-button state, the destructive-action availability, and the
 * action-firing callbacks. The section owns all the underlying state — this
 * shape is just a thin per-row projection.
 */
export type PendingCutLogRowController = {
  rowId: string
  kind: "draft" | "saved"
  row: CutLogRow | null
  form: PendingCutLogForm
  isEditing: boolean
  isDirty: boolean
  commitState: "pristine" | "dirty" | "pending" | "success"
  error: string | null
  destructiveEnabled: boolean
  destructiveStatus: FlooringCutLogStatus | "DRAFT"
  setLocationFilterCode: (next: string) => void
  setSectionFilterCode: (next: string) => void
  clearLocationAndSectionFilters: () => void
  setInventoryId: (next: string) => void
  setCut: (next: string) => void
  setIsWaste: (next: boolean) => void
  setNotes: (next: string) => void
  commit: () => void
  fireDestructive: () => void
  discardDraft: () => void
}

export type DraftRow = {
  kind: "draft"
  clientId: string
  form: PendingCutLogForm
}

export type SavedRow = {
  kind: "saved"
  row: CutLogRow
  edits: Partial<Pick<PendingCutLogForm, "cut" | "isWaste" | "notes">>
  locationFilterCode: string
  sectionFilterCode: string
}

export type SectionRow = DraftRow | SavedRow

export const EMPTY_FORM: PendingCutLogForm = {
  inventoryId: "",
  locationFilterCode: "",
  sectionFilterCode: "",
  cut: "",
  isWaste: false,
  notes: "",
}
