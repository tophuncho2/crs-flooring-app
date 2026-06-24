import type { DataTableColumn } from "@/engines/list-view"
import type { UserLoginActivityListRow } from "@builders/domain"

export const USER_ACTIVITY_LIST_COLUMNS: ReadonlyArray<
  DataTableColumn<UserLoginActivityListRow>
> = [
  { key: "userEmail", label: "User" },
  { key: "loggedInAt", label: "Logged in" },
]
