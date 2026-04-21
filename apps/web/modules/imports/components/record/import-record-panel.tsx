"use client"

import { useEffect } from "react"
import {
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { buildDeleteConfirmationMessage } from "@/modules/shared/engines/common/feedback/confirm-delete"
import { ImportInventoryRowsSection } from "./sections/import-inventory-rows-section"
import { ImportPrimaryFieldsSection } from "./sections/import-primary-fields-section"
import { useImportInventoryRowsSection } from "@/modules/imports/controllers/use-import-inventory-rows-section"
import { useImportPrimarySection } from "@/modules/imports/controllers/use-import-primary-section"
import type { ImportDetail as ImportRow } from "@builders/domain"
import type { LocationOption, ProductOption, WarehouseOption } from "@/modules/imports/controllers/drafts"

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

  return (
    <RecordMultiSectionPanel
      page={page}
      sections={[
        {
          key: "primary",
          type: "field",
          slot: "primary",
          order: 0,
          dirtyLabel: "primary",
          controller: controller.primarySection,
          render: () => (
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
          ),
        },
        {
          key: "inventory-rows",
          type: "item",
          order: 10,
          dirtyLabel: "inventory rows",
          controller: inventoryRowsSection,
          render: () => (
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
              onRowImportStatusChange={inventoryRowsSection.setRowImportStatus}
              onRemoveRow={inventoryRowsSection.removeRow}
            />
          ),
        },
      ]}
      footer={{
        deleteLabel: "Delete Import",
        deleteConfirmMessage: buildDeleteConfirmationMessage("import"),
        onDelete: () => void controller.deleteRecord(),
      }}
    />
  )
}
