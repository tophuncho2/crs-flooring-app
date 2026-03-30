"use client"

import {
  RecordFormNotices,
  RecordPanelFooter,
  RecordPrimarySectionInstance,
  RecordSectionStack,
  type RecordDetailClientScaffoldContext,
} from "@/features/shared/engines/record-view"
import { buildDeleteConfirmationMessage } from "@/features/flooring/shared/ui/table/confirm-delete"
import { InventoryCutLogsSection } from "./sections/inventory-cut-logs-section"
import { InventoryPrimaryFieldsSection } from "./sections/inventory-primary-fields-section"
import { useInventoryPrimarySection } from "./controllers/use-inventory-primary-section"
import type { InventoryPrimaryForm, InventoryRow, LocationOption } from "../../domain/types"

export function InventoryRecordPanel({
  page,
  inventory,
  locationOptions,
}: {
  page: RecordDetailClientScaffoldContext
  inventory: InventoryRow
  locationOptions: LocationOption[]
}) {
  const controller = useInventoryPrimarySection({
    page,
    inventory,
    locationOptions,
  })
  const primarySummary = (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {controller.primaryMetrics.map((metric) => (
        <div key={metric.label} className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--foreground)]/45">
            {metric.label}
          </div>
          <div className="mt-1 text-sm font-medium text-[var(--foreground)]/80">{metric.value}</div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      <RecordFormNotices message={page.notices.message} error={page.notices.error} />

      <RecordSectionStack>
        {page.isPrimarySectionOpen ? (
          <RecordPrimarySectionInstance
            title="Inventory Details"
            error={controller.primarySection.error}
            isDirty={controller.primarySection.isDirty}
            isSaving={controller.primarySection.isSaving}
            hasConflict={controller.primarySection.hasConflict}
            onSave={() => void controller.primarySection.save()}
            onDiscard={controller.primarySection.discard}
            saveLabel="Save Inventory"
            savingLabel="Saving Inventory..."
            summary={primarySummary}
            showHeader={false}
          >
            <InventoryPrimaryFieldsSection
              inventory={controller.record}
              draft={controller.primarySection.localValue}
              locationOptions={controller.availableLocationOptions}
              warehouseName={controller.activeWarehouseName}
              disabled={controller.primarySection.isSaving}
              onFieldChange={(field, value) => {
                page.notices.clearNotices()
                controller.primarySection.setLocalValue((previous: InventoryPrimaryForm) => ({
                  ...previous,
                  [field]: value,
                }))
              }}
            />
          </RecordPrimarySectionInstance>
        ) : null}

        <InventoryCutLogsSection
          cutLogs={controller.record.cutLogs}
          stockUnit={controller.record.stockUnit}
          cutTotal={controller.record.cutTotal}
        />
      </RecordSectionStack>

      <RecordPanelFooter
        deleteLabel="Delete Inventory"
        deleteConfirmMessage={buildDeleteConfirmationMessage("inventory row")}
        onDelete={() => void controller.deleteRecord()}
        onClose={page.closePage}
      />
    </div>
  )
}
