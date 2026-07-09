import type { SectionDiff } from "../../shared/section-diff.js"
import type { WorkOrderPlannedPaymentForm } from "./types.js"

export type WorkOrderPlannedPaymentDraft = {
  tempId: string
  form: WorkOrderPlannedPaymentForm
}

export type WorkOrderPlannedPaymentUpdate = {
  id: string
  form: WorkOrderPlannedPaymentForm
}

export type WorkOrderPlannedPaymentDelete = {
  id: string
}

export type WorkOrderPlannedPaymentsDiff = SectionDiff<WorkOrderPlannedPaymentForm>
