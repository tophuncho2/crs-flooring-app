import {
  calculateRecordSalesRepLineAmount,
  normalizeRecordSalesRep,
  type EditableRecordSalesRep,
  type RecordSalesRepDraft,
  type SalesRepContactOption,
} from "@/modules/shared/engines/record-view/contracts/record-sales-reps"

export type EditableTemplateSalesRep = EditableRecordSalesRep
export type TemplateSalesRepDraft = RecordSalesRepDraft
export type { SalesRepContactOption }

export const normalizeTemplateSalesRep = normalizeRecordSalesRep
export const calculateTemplateSalesRepLineAmount = calculateRecordSalesRepLineAmount
