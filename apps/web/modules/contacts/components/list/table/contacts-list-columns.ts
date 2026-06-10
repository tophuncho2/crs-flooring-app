import type { DataTableColumn } from "@/engines/list-view"
import type { ContactListRow } from "@builders/domain"

export const CONTACTS_LIST_COLUMNS: ReadonlyArray<
  DataTableColumn<ContactListRow>
> = [
  { key: "name", label: "Contactname" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
]
