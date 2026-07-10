"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { WorkOrderListRow } from "@builders/domain"
import { DataTable } from "@/engines/list-view"
import { RecordItemSection } from "@/engines/record-view"
import { buildCurrentRecordEntryPath, buildWorkOrderRecordHref } from "@/hooks/navigation/routes"
import {
  WORK_ORDERS_LIST_COLUMNS,
  renderWorkOrderRowActions,
  renderWorkOrderRowCell,
} from "@/modules/work-orders"
import { useWorkOrdersSectionTable } from "@/modules/work-orders/controllers/record/use-work-orders-section-table"

/**
 * The Entity record view's read-only Work Orders section, on the canonical
 * `RecordItemSection` chrome (persistent blue header). The body is a paginated
 * list-view `DataTable` over the shared work-orders columns, scoped to this
 * entity — the backend resolves the entity filter through `property.entityId`,
 * so it lists every work order across the entity's properties. Clicking a row
 * opens that work order's record (its Back returns here); the row ⋮ opens the
 * shared Export/print menu. Read-only — no create affordance.
 *
 * Shares its table controller (`useWorkOrdersSectionTable`) with the property
 * record view's work-orders section.
 */
export function EntityWorkOrdersSection({
  entity,
}: {
  entity: { id: string }
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const grid = useWorkOrdersSectionTable({
    entityId: entity.id,
    propertyId: null,
    enabled: true,
  })

  const returnTo = buildCurrentRecordEntryPath(pathname, searchParams)

  const openWorkOrder = (row: WorkOrderListRow) => {
    router.push(buildWorkOrderRecordHref(row.id, { returnTo }))
  }

  return (
    <RecordItemSection
      title="Work Orders"
      subHeader={{
        canManage: false,
        showStatus: false,
        isDirty: false,
        isSaving: false,
        hasConflict: false,
        summary: `${grid.total} work order${grid.total === 1 ? "" : "s"}`,
      }}
    >
      <DataTable<WorkOrderListRow>
        rows={grid.rows}
        columns={WORK_ORDERS_LIST_COLUMNS}
        renderCell={renderWorkOrderRowCell}
        onOpenRow={(row) => openWorkOrder(row)}
        rowActions={(row) => renderWorkOrderRowActions(row)}
        getRowAriaLabel={(row) => `Open work order ${row.workOrderNumber}`}
        empty={grid.isLoading ? "Searching…" : grid.error ?? "No work orders for this entity yet."}
        pagination={grid.pagination}
      />
    </RecordItemSection>
  )
}
