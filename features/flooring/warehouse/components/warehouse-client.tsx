"use client"

import { Plus } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_INLINE_LARGE_CLASS_NAME } from "@/features/flooring/shared/accent-styles"
import { DASHBOARD_PAGE_SHELL_SHORT_CLASS_NAME, DashboardCardHeader } from "@/features/flooring/shared/dashboard-card-title"
import { FormStatusNotices } from "@/features/flooring/shared/notices"
import { TableActionsSummary, TableSectionMeta } from "@/features/flooring/shared/table-shell"
import { useCanonicalDetailNavigation } from "@/features/flooring/shared/use-canonical-detail-navigation"
import { useWarehouseClientController } from "../use-warehouse-client-controller"
import type { WarehouseRow } from "../types"
import { WarehouseCreateModal } from "./warehouse-create-modal"
import { WarehouseTable } from "./warehouse-table"

export type { WarehouseRow } from "../types"

export default function WarehouseClient({ initialRows }: { initialRows: WarehouseRow[] }) {
  const controller = useWarehouseClientController(initialRows)
  const warehouseNavigation = useCanonicalDetailNavigation("/dashboard/flooring/warehouse")

  return (
    <div className={DASHBOARD_PAGE_SHELL_SHORT_CLASS_NAME}>
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <DashboardCardHeader
          title="Warehouse"
          actions={
            <TableActionsSummary count={controller.rows.length}>
              <button
                onClick={() => controller.setIsCreating(true)}
                type="button"
                className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_LARGE_CLASS_NAME}
              >
                <Plus size={16} />
                Add Warehouse
              </button>
            </TableActionsSummary>
          }
        />

        {!controller.isCreating ? (
          <FormStatusNotices message={controller.message} error={controller.error} className="mt-4" />
        ) : null}

        <TableSectionMeta>
          <span className="text-sm font-semibold uppercase tracking-wide text-[var(--foreground)]/70">Warehouses</span>
        </TableSectionMeta>

        <WarehouseTable
          rows={controller.rows}
          onOpen={(row) => warehouseNavigation.openRecord(row.id)}
        />
      </div>

      {controller.isCreating ? (
        <WarehouseCreateModal
          draft={controller.createDraft}
          error={controller.error}
          onClose={() => {
            if (controller.isSaving) {
              return
            }

            controller.setIsCreating(false)
          }}
          onFieldChange={controller.updateCreateDraft}
          onCreate={async () => {
            const createdWarehouse = await controller.createWarehouse()
            if (createdWarehouse) {
              warehouseNavigation.openRecord(createdWarehouse.id)
            }
          }}
        />
      ) : null}
    </div>
  )
}
