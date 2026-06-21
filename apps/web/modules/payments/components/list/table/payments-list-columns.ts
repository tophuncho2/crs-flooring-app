import type { DataTableColumn } from "@/engines/list-view"
import type { PaymentListRow } from "@builders/domain"

export const PAYMENTS_LIST_COLUMNS: ReadonlyArray<DataTableColumn<PaymentListRow>> = [
  { key: "paymentNumber", label: "Payment #" },
  { key: "amount", label: "Amount", align: "end" },
  { key: "direction", label: "Direction" },
  { key: "paymentType", label: "Type" },
  { key: "paymentMethod", label: "Method" },
  { key: "paymentDate", label: "Date" },
  { key: "memo", label: "Memo" },
  { key: "createdAt", label: "Created" },
]
