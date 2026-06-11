import type { DataTableColumn } from "@/engines/list-view"
import type { LaborPaymentListRow } from "@builders/domain"

export const LABOR_PAYMENTS_LIST_COLUMNS: ReadonlyArray<
  DataTableColumn<LaborPaymentListRow>
> = [
  { key: "contactName", label: "Contactname" },
  { key: "workOrderNumber", label: "Work Order" },
  { key: "unit", label: "Unit" },
  { key: "description", label: "Description" },
  { key: "cost", label: "Cost", align: "end" },
  { key: "createdAt", label: "Created" },
]
