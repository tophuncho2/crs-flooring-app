"use client"

import { useEffect } from "react"
import {
  RecordPanelFooter,
  RecordPrimarySectionInstance,
  RecordSectionStack,
  type RecordDetailClientScaffoldContext,
} from "@/features/shared/engines/record-view"
import { buildDeleteConfirmationMessage } from "@/features/flooring/shared/ui/table/confirm-delete"
import { ImportInventoryRowsSection } from "./sections/import-inventory-rows-section"
import { ImportPrimaryFieldsSection } from "./sections/import-primary-fields-section"
import { useImportInventoryRowsSection } from "./controllers/use-import-inventory-rows-section"
import { useImportPrimarySection } from "./controllers/use-import-primary-section"
import type { ImportRow, LocationOption, ProductOption, WarehouseOption } from "../../domain/types"

export function ImportRecordPanel({
  page,
  entry,
  productOptions,
  warehouseOptions,
  locationOptions,
}: {
  page: RecordDetailClientScaffoldContext
  entry: ImportRow
  productOptions: ProductOption[]
  warehouseOptions: WarehouseOption[]
  locationOptions: LocationOption[]
}) {
  const controller = useImportPrimarySection({
    page,
    entry,
  })
  const inventoryRowsSection = useImportInventoryRowsSection({
    record: controller.record,
    locationOptions,
    publishRecord: controller.publishRecord,
  })

  useEffect(() => {
    const dirtySections: string[] = []

    if (controller.primarySection.isDirty) {
      dirtySections.push("primary")
    }

    if (inventoryRowsSection.isDirty) {
      dirtySections.push("inventory rows")
    }

    page.setDirtySections(dirtySections)
  }, [controller.primarySection.isDirty, inventoryRowsSection.isDirty, page])

  return (
    <div className="space-y-4">
      <RecordSectionStack>
        {page.isPrimarySectionOpen ? (
          <RecordPrimarySectionInstance
            title="Import Details"
            error={controller.primarySection.error}
            noticeMessage={controller.primarySection.noticeMessage}
            noticeError={controller.primarySection.noticeError}
            isDirty={controller.primarySection.isDirty}
            isSaving={controller.primarySection.isSaving}
            hasConflict={controller.primarySection.hasConflict}
            onSave={() => void controller.primarySection.save()}
            onDiscard={controller.primarySection.discard}
            saveLabel="Save Import"
            savingLabel="Saving Import..."
            showHeader={false}
          >
            <ImportPrimaryFieldsSection
              entry={controller.record}
              draft={controller.primarySection.localValue}
              warehouseOptions={warehouseOptions}
              disabled={controller.primarySection.isSaving}
              onFieldChange={(field, value) => {
                controller.primarySection.setLocalValue((previous) => ({
                  ...previous,
                  [field]: value,
                }))
                if (field === "warehouseId") {
                  inventoryRowsSection.handleWarehouseChange(value)
                }
              }}
            />
          </RecordPrimarySectionInstance>
        ) : null}

        <ImportInventoryRowsSection
          subHeader={{
            isDirty: inventoryRowsSection.isDirty,
            isSaving: inventoryRowsSection.isSaving,
            hasConflict: inventoryRowsSection.hasConflict,
            error: inventoryRowsSection.error,
            onSave: () => void inventoryRowsSection.save(),
            onDiscard: () => inventoryRowsSection.discard(),
            saveLabel: "Save Rows",
            savingLabel: "Saving Rows...",
            actions: [
              {
                key: "add-row",
                kind: "add-row",
                label: "Add Row",
                onClick: inventoryRowsSection.addRow,
                disabled: inventoryRowsSection.isSaving,
              },
            ],
          }}
          rows={inventoryRowsSection.localValue}
          warehouseId={controller.record.warehouseId}
          productOptions={productOptions}
          warehouseOptions={warehouseOptions}
          locationOptions={locationOptions}
          noticeMessage={inventoryRowsSection.noticeMessage}
          noticeError={inventoryRowsSection.noticeError}
          onRowFieldChange={inventoryRowsSection.setRowField}
          onRemoveRow={inventoryRowsSection.removeRow}
        />
      </RecordSectionStack>

      <RecordPanelFooter
        deleteLabel="Delete Import"
        deleteConfirmMessage={buildDeleteConfirmationMessage("import")}
        onDelete={() => void controller.deleteRecord()}
        onClose={page.closePage}
      />
    </div>
  )
}
