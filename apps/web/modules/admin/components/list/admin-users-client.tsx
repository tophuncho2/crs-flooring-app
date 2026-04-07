"use client"

import { DashboardCardTitle } from "@/modules/shared/engines/common/display/dashboard-card-title"
import { FormStatusNotices } from "@/modules/shared/engines/common/feedback/notices"
import { DashboardListPageScaffold } from "@/modules/shared/engines/list-view/scaffold/dashboard-list-page-scaffold"
import { TablePaginationControls } from "@/modules/shared/engines/list-view/table/table-shell"
import { DashboardListPageControls } from "@/modules/shared/engines/list-view/controls/dashboard-list-page-controls"
import { useListViewEngine } from "@/modules/shared/engines/list-view/controllers/use-list-view-engine"
import type { TablePreferencePayload } from "@/modules/shared/engines/list-view/controllers/table-preferences"
import { type GroupedRowTree } from "@/modules/shared/engines/list-view/controllers/use-table-controls"
import { useRecordEntryNavigation } from "@/modules/shared/engines/common/record-entry"
import type { ManagedUserRow } from "../../domain/types"
import { useAdminUsersListController } from "../../controllers/use-admin-users-list-controller"
import { AdminUsersTable } from "./admin-users-table"

const USER_FIELDS = [
  { key: "email", label: "Email", getValue: (row: ManagedUserRow) => row.email, groupable: false },
  { key: "role", label: "Role", getValue: (row: ManagedUserRow) => row.role, groupable: true },
  { key: "status", label: "Status", getValue: (row: ManagedUserRow) => row.isVerified ? "Verified" : "Pending", groupable: true },
  { key: "createdAt", label: "Created", getValue: (row: ManagedUserRow) => row.createdAt, groupable: false },
]

export default function AdminUsersClient({
  initialUsers,
  initialTablePreferences,
  tableState = { searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] },
}: {
  initialUsers: ManagedUserRow[]
  initialTablePreferences?: TablePreferencePayload | null
  tableState: {
    searchQuery: string
    isAscendingSort: boolean
    isGroupingEnabled: boolean
    groupByKeys: string[]
  }
}) {
  const controller = useAdminUsersListController(initialUsers)
  const navigation = useRecordEntryNavigation("/dashboard/admin/users")
  const engine = useListViewEngine({
    rows: controller.rows,
    tableKey: "admin-users-main",
    fields: USER_FIELDS,
    sortField: (row) => row.email,
    sortFieldKey: "email",
    initialSearchQuery: tableState.searchQuery,
    defaultAscending: tableState.isAscendingSort,
    defaultGroupKeys: tableState.groupByKeys,
    initialPreferences: initialTablePreferences,
  })

  return (
    <DashboardListPageScaffold
      title={<DashboardCardTitle>Users</DashboardCardTitle>}
      controls={
        <DashboardListPageControls
          engine={engine}
          searchPlaceholder="Search users..."
        />
      }
      notices={<FormStatusNotices message={controller.notices.message} error={controller.notices.error} />}
      table={
        <AdminUsersTable
          rows={engine.processedRows}
          visibleColumns={engine.visibleColumns.map((key) => ({
            key,
            label: USER_FIELDS.find((f) => f.key === key)?.label ?? key,
          }))}
          groupedRows={engine.groupedRowTree as GroupedRowTree<ManagedUserRow>[]}
          isGroupingEnabled={engine.isGroupingEnabled}
          onOpen={(row) => navigation.openRecord(row.id)}
        />
      }
      pagination={
        <TablePaginationControls
          page={engine.page}
          totalPages={engine.totalPages}
          pageSize={engine.pageSize}
          totalItems={engine.processedRows.length}
          hasPreviousPage={engine.hasPreviousPage}
          hasNextPage={engine.hasNextPage}
          onPreviousPage={engine.goToPreviousPage}
          onNextPage={engine.goToNextPage}
        />
      }
    />
  )
}
