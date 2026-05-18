"use client"

import { useCallback, useState } from "react"
import {
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { ImportPrimaryFieldsSection } from "./primary/import-primary-fields-section"
import { ImportStagedInventorySection } from "./staged-inventory/import-staged-inventory-section"
import { ImportRecordFooter } from "./footer"
import { useImportPrimarySection } from "@/modules/imports/controllers/record/primary/use-import-primary-section"
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
  const controller = useImportPrimarySection({ page, entry })

  // Filter rows + staged rows live here so per-row mutations from the side
  // panel can refresh both arrays in place without a list refetch.
  const [filterRows, setFilterRows] = useState(initialFilterRows)
  const [stagedRows, setStagedRows] = useState(initialStagedRows)

  // Optimistic flip from mark-for-import: the worker accepted these ids,
  // so flip them DRAFT → QUEUED in-place.
  const handleMarkedForImport = useCallback((markedIds: string[]) => {
    const set = new Set(markedIds)
    setStagedRows((previous) =>
      previous.map((row) => (set.has(row.id) ? { ...row, status: "QUEUED" as const } : row)),
    )
  }, [])

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
            render: () => (
              <ImportStagedInventorySection
                record={controller.record}
                filterRows={filterRows}
                stagedRows={stagedRows}
                publishFilterRows={setFilterRows}
                publishStagedRows={setStagedRows}
                publishMarkedForImport={handleMarkedForImport}
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
