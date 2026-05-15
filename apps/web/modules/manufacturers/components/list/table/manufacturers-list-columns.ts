import type { DataTableColumn } from "@/components/data-table"
import type { ManufacturerListRow } from "@builders/domain"

export const MANUFACTURERS_LIST_COLUMNS: ReadonlyArray<DataTableColumn<ManufacturerListRow>> = [
  { key: "companyName", label: "Company" },
  { key: "agentName", label: "Agent" },
  { key: "website", label: "Website" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "productsCount", label: "Products", align: "end" },
]
