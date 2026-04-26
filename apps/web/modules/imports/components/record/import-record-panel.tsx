"use client"

import { useState } from "react"
import {
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { buildDeleteConfirmationMessage } from "@/modules/shared/engines/common/feedback/confirm-delete"
import { ImportStagedInventoryRowsSection } from "./sections/import-staged-inventory-rows-section"
import { ImportPrimaryFieldsSection } from "./sections/import-primary-fields-section"
import { useImportStagedInventoryRowsSection } from "@/modules/imports/controllers/use-import-staged-inventory-rows-section"
import { useImportPrimarySection } from "@/modules/imports/controllers/use-import-primary-section"
import type { ImportDetail, StagedInventoryRow } from "@builders/domain"
import type { CategoryOption, LocationOption, ManufacturerOption, ProductOption, WarehouseOption } from "@/modules/imports/controllers/drafts"

export function ImportRecordPanel({
  page,
  entry,
  initialStagedRows,
  productOptions,
  warehouseOptions,
  manufacturerOptions,
  locationOptions,
  categoryOptions,
}: {
  page: RecordDetailClientScaffoldContext
  entry: ImportDetail
  initialStagedRows: StagedInventoryRow[]
  productOptions: ProductOption[]
  warehouseOptions: WarehouseOption[]
  manufacturerOptions: ManufacturerOption[]
  locationOptions: LocationOption[]
  categoryOptions: CategoryOption[]
}) {
  const controller = useImportPrimarySection({
    page,
    entry,
  })
  // The parent ImportDetail no longer carries inline staged rows — only id
  // pointers. Track the current full row list locally; the staged-rows
  // controller refreshes it via publishStagedRows after each save.
  const [stagedRows, setStagedRows] = useState(initialStagedRows)
  const stagedRowsSection = useImportStagedInventoryRowsSection({
    record: controller.record,
    stagedRows,
    locationOptions,
    publishRecord: controller.publishRecord,
    publishStagedRows: setStagedRows,
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
                draft={controller.primarySection.localValue}
                warehouseOptions={warehouseOptions}
                manufacturerOptions={manufacturerOptions}
                disabled={controller.primarySection.isSaving}
                onFieldChange={(field, value) => {
                  controller.primarySection.setLocalValue((previous) => ({
                    ...previous,
                    [field]: value,
                  }))
                  if (field === "warehouseId") {
                    stagedRowsSection.handleWarehouseChange(value)
                  }
                }}
              />
            </RecordPrimarySectionInstance>
          ),
        },
        {
          key: "staged-inventory-rows",
          type: "item",
          order: 10,
          dirtyLabel: "staged inventory rows",
          controller: stagedRowsSection,
          render: () => (
            <ImportStagedInventoryRowsSection
              drafts={stagedRowsSection.localValue}
              serverRows={stagedRows}
              warehouseId={controller.record.warehouseId}
              productOptions={productOptions}
              warehouseOptions={warehouseOptions}
              locationOptions={locationOptions}
              categoryOptions={categoryOptions}
              isDirty={stagedRowsSection.isDirty}
              isSaving={stagedRowsSection.isSaving}
              hasConflict={stagedRowsSection.hasConflict}
              sectionError={stagedRowsSection.error?.message ?? null}
              noticeMessage={stagedRowsSection.noticeMessage}
              noticeError={stagedRowsSection.noticeError}
              selectedIds={stagedRowsSection.selectedIds}
              eligibleSelectedIds={stagedRowsSection.eligibleSelectedIds}
              isMarking={stagedRowsSection.isMarking}
              markError={stagedRowsSection.markError}
              onSave={() => void stagedRowsSection.save()}
              onDiscard={() => stagedRowsSection.discard()}
              onAddRow={stagedRowsSection.addRow}
              onRowFieldChange={stagedRowsSection.setRowField}
              onRowCategoryFilterChange={stagedRowsSection.setRowCategoryFilter}
              onRemoveRow={stagedRowsSection.removeRow}
              onToggleSelection={stagedRowsSection.toggleSelection}
              onMarkForImport={() => void stagedRowsSection.markForImport()}
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
