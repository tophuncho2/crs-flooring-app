"use client"

import { useRouter } from "next/navigation"
import {
  RecordEntityFooter,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  RecordStepperPortal,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import type { WarehouseRow, WarehouseStats } from "@builders/domain"
import { useWarehousePrimarySection } from "@/modules/warehouse/controllers/record/primary/use-warehouse-primary-section"
import { WarehousePrimaryFieldsSection } from "./primary/warehouse-primary-fields-section"
import { WarehouseStatisticsSection } from "./statistics/warehouse-statistics-section"

export function WarehouseRecordPanel({
  page,
  entry,
  stats,
  previousWarehouseId,
  nextWarehouseId,
}: {
  page: RecordDetailClientScaffoldContext
  entry: WarehouseRow
  stats: WarehouseStats
  previousWarehouseId: string | null
  nextWarehouseId: string | null
}) {
  const router = useRouter()
  const controller = useWarehousePrimarySection({ page, entry })
  const primary = controller.primarySection
  const record = controller.record

  const sections: RecordPanelSectionConfig[] = [
    {
      key: "primary",
      type: "field",
      order: 10,
      dirtyLabel: "warehouse",
      controller: primary,
      render: () => (
        <RecordPrimarySectionInstance
          title="Warehouse"
          showHeader={false}
          error={primary.error}
          noticeMessage={primary.noticeMessage}
          noticeError={primary.noticeError}
          isDirty={primary.isDirty}
          isSaving={primary.isSaving}
          hasConflict={primary.hasConflict}
          onSave={() => void primary.save()}
          onDiscard={primary.discard}
        >
          <WarehousePrimaryFieldsSection
            draft={primary.localValue}
            editable={!primary.isSaving}
            onFieldChange={(field, value) =>
              primary.setLocalValue((previous) => ({ ...previous, [field]: value }))
            }
            warehouseNumber={record.warehouseNumber}
            createdAt={record.createdAt}
            updatedAt={record.updatedAt}
            createdBy={record.createdBy}
            updatedBy={record.updatedBy}
          />
        </RecordPrimarySectionInstance>
      ),
    },
    {
      key: "statistics",
      type: "item",
      order: 20,
      render: () => <WarehouseStatisticsSection stats={stats} />,
    },
  ]

  return (
    <>
      {/* Walks the global STORE-number line (◀ STORE-n ▶) from the top bar.
          Warehouse detail is a per-id page, so a step router-navigates to the
          neighbor's page; the portal's dirty guard prompts first when edited. */}
      <RecordStepperPortal
        label={entry.warehouseNumber}
        isDirty={page.isDirty}
        discardMessage="This warehouse has unsaved changes. Stepping to another warehouse will discard them."
        onPrevious={
          previousWarehouseId
            ? () => router.push(`/dashboard/warehouse/${previousWarehouseId}`)
            : null
        }
        onNext={
          nextWarehouseId
            ? () => router.push(`/dashboard/warehouse/${nextWarehouseId}`)
            : null
        }
      />
      <RecordMultiSectionPanel page={page} sections={sections} />
      <RecordEntityFooter
        onClose={page.closePage}
        onDelete={controller.deleteRecord}
        deleteLabel="Delete Warehouse"
        confirmTitle="Delete warehouse?"
        confirmMessage="This cannot be undone."
      />
    </>
  )
}
