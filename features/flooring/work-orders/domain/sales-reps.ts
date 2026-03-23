import {
  calculateRecordSalesRepLineAmount,
  normalizeRecordSalesRep,
  type EditableRecordSalesRep,
  type RecordSalesRepDraft,
  type SalesRepContactOption,
} from "@/features/flooring/shared/domain/record-sales-reps"

export type EditableWorkOrderSalesRep = EditableRecordSalesRep
export type WorkOrderSalesRepDraft = RecordSalesRepDraft
export type { SalesRepContactOption }

export const normalizeWorkOrderSalesRep = normalizeRecordSalesRep
export const calculateWorkOrderSalesRepLineAmount = calculateRecordSalesRepLineAmount
