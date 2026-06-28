import type { DataTableColumn } from "@/engines/list-view"
import type { UserListRow } from "@builders/domain"

export const USERS_LIST_COLUMNS: ReadonlyArray<DataTableColumn<UserListRow>> = [
  { key: "email", label: "Email" },
  { key: "rank", label: "Rank" },
  { key: "isActive", label: "Status" },
  { key: "createdAt", label: "Created" },
  { key: "actions", label: "" },
]
