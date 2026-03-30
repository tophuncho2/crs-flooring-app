"use client"

import { useEffect } from "react"
import {
  RecordPanelFooter,
  RecordPrimarySectionInstance,
  RecordSectionSubHeader,
  RecordSectionStack,
  type RecordDetailClientScaffoldContext,
} from "@/features/shared/engines/record-view"
import { buildDeleteConfirmationMessage } from "@/features/flooring/shared/ui/table/confirm-delete"
import { InventoryCutLogsSection } from "./sections/inventory-cut-logs-section"
import { InventoryPrimaryFieldsSection } from "./sections/inventory-primary-fields-section"
import { useInventoryCutLogsSection } from "./controllers/use-inventory-cut-logs-section"
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
  const cutLogsSection = useInventoryCutLogsSection({
    record: controller.record,
    publishRecord: controller.publishRecord,
  })

  useEffect(() => {
    const dirtySections: string[] = []

    if (controller.primarySection.isDirty) {
      dirtySections.push("primary")
    }

    if (cutLogsSection.isDirty) {
      dirtySections.push("cut logs")
    }

    page.setDirtySections(dirtySections)
  }, [controller.primarySection.isDirty, cutLogsSection.isDirty, page])

  return (
    <div className="space-y-4">
      <RecordSectionStack>
        {page.isPrimarySectionOpen ? (
          <RecordPrimarySectionInstance
            title="Inventory Details"
            error={controller.primarySection.error}
            noticeMessage={controller.primarySection.noticeMessage}
            noticeError={controller.primarySection.noticeError}
            isDirty={controller.primarySection.isDirty}
            isSaving={controller.primarySection.isSaving}
            hasConflict={controller.primarySection.hasConflict}
            onSave={() => void controller.primarySection.save()}
            onDiscard={controller.primarySection.discard}
            saveLabel="Save Inventory"
            savingLabel="Saving Inventory..."
            showHeader={false}
          >
            <InventoryPrimaryFieldsSection
              inventory={controller.record}
              draft={controller.primarySection.localValue}
              locationOptions={controller.availableLocationOptions}
              warehouseName={controller.activeWarehouseName}
              sectionName={controller.activeSectionName}
              disabled={controller.primarySection.isSaving}
              onFieldChange={(field, value) => {
                controller.primarySection.setLocalValue((previous: InventoryPrimaryForm) => ({
                  ...previous,
                  [field]: value,
                }))
              }}
            />
          </RecordPrimarySectionInstance>
        ) : null}

        <InventoryCutLogsSection
          actionPanel={
            <RecordSectionSubHeader
              summary={cutLogsSection.blockedSummary || undefined}
              isDirty={cutLogsSection.isDirty}
              isSaving={cutLogsSection.isSaving}
              hasConflict={cutLogsSection.hasConflict}
              error={cutLogsSection.error}
              onSave={() => void cutLogsSection.save()}
              onDiscard={() => cutLogsSection.discard()}
              saveLabel="Save Cut Log"
              savingLabel="Saving Cut Log..."
              actions={[
                {
                  key: "add-cut-log",
                  label: "Add Cut Log",
                  onClick: cutLogsSection.addDraft,
                  disabled: !cutLogsSection.canAddDraft,
                },
              ]}
            />
          }
          cutLogs={controller.record.cutLogs}
          stockUnit={controller.record.stockUnit}
          cutTotal={controller.record.cutTotal}
          draft={cutLogsSection.localValue}
          draftBefore={cutLogsSection.draftBefore}
          draftAfter={cutLogsSection.draftAfter}
          noticeMessage={cutLogsSection.noticeMessage}
          noticeError={cutLogsSection.noticeError}
          onDraftChange={cutLogsSection.setDraftField}
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
