import type { DataTableColumn } from "@/engines/list-view"
import type { InviteListRow } from "@builders/domain"

export const INVITES_LIST_COLUMNS: ReadonlyArray<DataTableColumn<InviteListRow>> = [
  { key: "email", label: "Email" },
  { key: "rank", label: "Rank" },
  { key: "invitedBy", label: "Invited by" },
  { key: "expiresAt", label: "Expires" },
  { key: "actions", label: "" },
]
