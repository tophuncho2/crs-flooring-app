import type { DataTableColumn } from "@/engines/list-view"
import type { PaymentPurposeListRow } from "@builders/domain"

export const PAYMENT_PURPOSES_LIST_COLUMNS: ReadonlyArray<
  DataTableColumn<PaymentPurposeListRow>
> = [
  { key: "paymentPurposeNumber", label: "ROW #" },
  { key: "name", label: "Name" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
  { key: "createdBy", label: "Created by" },
  { key: "updatedBy", label: "Updated by" },
]
