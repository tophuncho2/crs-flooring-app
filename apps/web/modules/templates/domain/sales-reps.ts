import {
  calculateRecordSalesRepLineAmount,
  normalizeRecordSalesRep,
  type EditableRecordSalesRep,
  type RecordSalesRepDraft,
  type SalesRepContactOption,
} from "@/modules/shared/domain/record-sales-reps"

export type EditableTemplateSalesRep = EditableRecordSalesRep
export type TemplateSalesRepDraft = RecordSalesRepDraft
export type { SalesRepContactOption }

export const normalizeTemplateSalesRep = normalizeRecordSalesRep
export const calculateTemplateSalesRepLineAmount = calculateRecordSalesRepLineAmount
