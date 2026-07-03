import type { SectionDiff } from "../../../../shared/section-diff.js"
import type { StagedInventoryFilterForm } from "../types.js"

export type StagedInventoryFilterRowDraft = {
  tempId: string
  form: StagedInventoryFilterForm
}

export type StagedInventoryFilterRowUpdate = {
  id: string
  form: StagedInventoryFilterForm
}

export type StagedInventoryFilterRowDelete = {
  id: string
}

export type StagedInventoryFiltersDiff = SectionDiff<StagedInventoryFilterForm>
