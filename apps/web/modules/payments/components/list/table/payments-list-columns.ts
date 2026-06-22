import type { DataTableColumn } from "@/engines/list-view"
import type { PaymentListRow } from "@builders/domain"

export const PAYMENTS_LIST_COLUMNS: ReadonlyArray<DataTableColumn<PaymentListRow>> = [
  { key: "paymentNumber", label: "Payment #" },
  { key: "amount", label: "Amount", align: "end" },
  { key: "direction", label: "Direction" },
  { key: "paymentDate", label: "Date" },
  { key: "createdAt", label: "Created" },
]
