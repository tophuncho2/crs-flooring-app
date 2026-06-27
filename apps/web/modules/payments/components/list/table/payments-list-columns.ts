import type { DataTableColumn } from "@/engines/list-view"
import type { PaymentListRow } from "@builders/domain"

export const PAYMENTS_LIST_COLUMNS: ReadonlyArray<DataTableColumn<PaymentListRow>> = [
  { key: "paymentNumber", label: "Payment #" },
  { key: "amount", label: "Amount", align: "end" },
  { key: "entity", label: "Entity" },
  { key: "types", label: "Type(s)" },
  { key: "workOrder", label: "WO #" },
  { key: "paymentDate", label: "Date" },
  { key: "direction", label: "Direction" },
  { key: "updatedAt", label: "Updated" },
  { key: "createdAt", label: "Created" },
  { key: "createdBy", label: "Created by" },
  { key: "updatedBy", label: "Updated by" },
]
