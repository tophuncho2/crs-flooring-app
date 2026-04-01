import {
  calculateRecordSalesRepLineAmount,
  normalizeRecordSalesRep,
  type EditableRecordSalesRep,
  type RecordSalesRepDraft,
  type SalesRepContactOption,
} from "@/modules/shared/engines/record-view/contracts/record-sales-reps"

export type EditableWorkOrderSalesRep = EditableRecordSalesRep
export type WorkOrderSalesRepDraft = RecordSalesRepDraft
export type { SalesRepContactOption }

export const normalizeWorkOrderSalesRep = normalizeRecordSalesRep
export const calculateWorkOrderSalesRepLineAmount = calculateRecordSalesRepLineAmount
