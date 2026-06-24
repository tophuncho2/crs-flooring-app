"use client"

import {
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { ImportPrimaryFieldsSection } from "./primary/import-primary-fields-section"
import { ImportStagedInventorySection } from "./staged-inventory/import-staged-inventory-section"
import { ImportRecordFooter } from "./footer"
import { useImportRecordController } from "@/modules/imports/controllers/record/use-import-record-controller"
import type {
  ImportDetail,
  StagedInventoryFilterRow,
  StagedInventoryRow,
} from "@builders/domain"

export function ImportRecordPanel({
  page,
  entry,
  initialFilterRows,
  initialStagedRows,
}: {
  page: RecordDetailClientScaffoldContext
  entry: ImportDetail
  initialFilterRows: StagedInventoryFilterRow[]
  initialStagedRows: StagedInventoryRow[]
}) {
  const controller = useImportRecordController({
    page,
    entry,
    initialFilterRows,
    initialStagedRows,
  })

  return (
    <>
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
                  warehouseName={controller.record.warehouseName}
                  manufacturerName={controller.record.manufacturerName}
                  createdAt={controller.record.createdAt}
                  updatedAt={controller.record.updatedAt}
                  createdBy={controller.record.createdBy}
                  updatedBy={controller.record.updatedBy}
                  disabled={controller.primarySection.isSaving}
                  onFieldChange={(field, value) => {
                    controller.primarySection.setLocalValue((previous) => ({
                      ...previous,
                      [field]: value,
                    }))
                  }}
                />
              </RecordPrimarySectionInstance>
            ),
          },
          {
            key: "staged-inventory",
            type: "item",
            order: 10,
            dirtyLabel: "staged inventory",
            // Give the engine real visibility into this section's dirty/conflict
            // state (it had none before) so the record-level guards treat it like
            // any other section.
            controller: {
              isDirty: controller.stagedInventory.isDirty,
              isSaving: controller.stagedInventory.isSaving,
              hasConflict: controller.stagedInventory.hasConflict,
            },
            render: () => (
              <ImportStagedInventorySection
                section={controller.stagedInventory}
                filterRows={controller.filterRows}
                stagedRows={controller.stagedRows}
                pollExhausted={controller.pollExhausted}
              />
            ),
          },
        ]}
      />
      <ImportRecordFooter
        onClose={page.closePage}
        onDelete={controller.deleteRecord}
      />
    </>
  )
}
