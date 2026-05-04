"use client"

import { useCallback, useMemo, useState } from "react"
import {
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { buildDeleteConfirmationMessage } from "@/modules/shared/engines/common/feedback/confirm-delete"
import { ImportStagedInventoryRowsSection } from "./sections/import-staged-inventory-rows-section"
import { ImportImportedRowsSection } from "./imported-rows/import-imported-rows-section"
import { ImportPrimaryFieldsSection } from "./sections/import-primary-fields-section"
import { useImportStagedInventoryRowsSection } from "@/modules/imports/controllers/use-import-staged-inventory-rows-section"
import { useImportPrimarySection } from "@/modules/imports/controllers/use-import-primary-section"
import type { ImportDetail, ProductPickerOption, StagedInventoryRow } from "@builders/domain"
import type { LocationOption, ManufacturerOption, WarehouseOption } from "@/modules/imports/controllers/drafts"

export function ImportRecordPanel({
  page,
  entry,
  initialStagedRows,
  initialProductPickerOptionsByItemId,
  warehouseOptions,
  manufacturerOptions,
  locationOptions,
}: {
  page: RecordDetailClientScaffoldContext
  entry: ImportDetail
  initialStagedRows: StagedInventoryRow[]
  initialProductPickerOptionsByItemId: Record<string, ProductPickerOption>
  warehouseOptions: WarehouseOption[]
  manufacturerOptions: ManufacturerOption[]
  locationOptions: LocationOption[]
}) {
  const controller = useImportPrimarySection({
    page,
    entry,
  })
  // The parent ImportDetail no longer carries inline staged rows — only id
  // pointers. Track the current full row list locally; the staged-rows
  // controller refreshes it via publishStagedRows after each save.
  const [stagedRows, setStagedRows] = useState(initialStagedRows)
  // Pending section sees DRAFT + QUEUED only; IMPORTED rows live in the
  // dedicated read-only "Imported Rows" section below.
  const pendingRows = useMemo(
    () => stagedRows.filter((row) => row.status !== "IMPORTED"),
    [stagedRows],
  )
  const importedRows = useMemo(
    () => stagedRows.filter((row) => row.status === "IMPORTED"),
    [stagedRows],
  )
  // Mark-for-import optimistic flip: the pending controller doesn't know
  // about IMPORTED rows. The parent owns the merge by flipping status on
  // the marked ids in-place against the full list.
  const handleMarkedForImport = useCallback((markedIds: string[]) => {
    const set = new Set(markedIds)
    setStagedRows((previous) =>
      previous.map((row) => (set.has(row.id) ? { ...row, status: "QUEUED" as const } : row)),
    )
  }, [])
  const stagedRowsSection = useImportStagedInventoryRowsSection({
    record: controller.record,
    stagedRows: pendingRows,
    locationOptions,
    productPickerOptionsByItemId: initialProductPickerOptionsByItemId,
    publishRecord: controller.publishRecord,
    publishStagedRows: setStagedRows,
    publishMarkedForImport: handleMarkedForImport,
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
              serverRows={pendingRows}
              warehouseId={controller.record.warehouseId}
              warehouseOptions={warehouseOptions}
              locationOptions={locationOptions}
              selectedProductOptionByRowId={stagedRowsSection.selectedProductOptionByRowId}
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
              isSelectionActive={stagedRowsSection.isSelectionActive}
              canToggleSelection={stagedRowsSection.canToggleSelection}
              eligibleCount={stagedRowsSection.eligibleCount}
              onSave={() => void stagedRowsSection.save()}
              onDiscard={() => stagedRowsSection.discard()}
              onAddRow={stagedRowsSection.addRow}
              onDuplicateRow={stagedRowsSection.duplicateRow}
              onRowFieldChange={stagedRowsSection.setRowField}
              onRowCategoryFilterChange={stagedRowsSection.setRowCategoryFilter}
              onRowProductSelect={stagedRowsSection.setSelectedProductOption}
              onRemoveRow={stagedRowsSection.removeRow}
              onToggleSelection={stagedRowsSection.toggleSelection}
              onToggleAllEligible={stagedRowsSection.toggleAllEligible}
              onMarkForImport={() => void stagedRowsSection.markForImport()}
            />
          ),
        },
        {
          key: "imported-rows",
          type: "item",
          order: 20,
          render: () => <ImportImportedRowsSection rows={importedRows} />,
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
