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
import type { InventoryAgeIndicator } from "@builders/domain"
import { useInventoryAgeIndicatorPrimarySection } from "@/modules/inventory-age-indicators/controllers/record/primary/use-inventory-age-indicator-primary-section"
import { InventoryAgeIndicatorPrimaryFieldsSection } from "./primary/inventory-age-indicator-primary-fields-section"

export function InventoryAgeIndicatorRecordPanel({
  page,
  entry,
  previousInventoryAgeIndicatorId,
  nextInventoryAgeIndicatorId,
}: {
  page: RecordDetailClientScaffoldContext
  entry: InventoryAgeIndicator
  previousInventoryAgeIndicatorId: string | null
  nextInventoryAgeIndicatorId: string | null
}) {
  const router = useRouter()
  const controller = useInventoryAgeIndicatorPrimarySection({ page, entry })
  const primary = controller.primarySection
  const record = controller.record

  const sections: RecordPanelSectionConfig[] = [
    {
      key: "primary",
      type: "field",
      order: 10,
      dirtyLabel: "age indicator",
      controller: primary,
      render: () => (
        <RecordPrimarySectionInstance
          title="Age Indicator"
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
          <InventoryAgeIndicatorPrimaryFieldsSection
            draft={primary.localValue}
            editable={!primary.isSaving}
            onDaysChange={(value) =>
              primary.setLocalValue((previous) => ({ ...previous, days: value }))
            }
            onColorChange={(value) =>
              primary.setLocalValue((previous) => ({ ...previous, color: value }))
            }
            createdAt={record.createdAt}
            updatedAt={record.updatedAt}
            createdBy={record.createdBy}
            updatedBy={record.updatedBy}
          />
        </RecordPrimarySectionInstance>
      ),
    },
  ]

  return (
    <>
      {/* Walks the global `days` ASC line (◀ N days ▶) from the top bar. Detail is
          a per-id page, so a step router-navigates to the neighbor's page; the
          portal's dirty guard prompts first when edited. */}
      <RecordStepperPortal
        label={`${entry.days} days`}
        isDirty={page.isDirty}
        discardMessage="This age indicator has unsaved changes. Stepping to another will discard them."
        onPrevious={
          previousInventoryAgeIndicatorId
            ? () =>
                router.push(
                  `/dashboard/inventory-age-indicators/${previousInventoryAgeIndicatorId}`,
                )
            : null
        }
        onNext={
          nextInventoryAgeIndicatorId
            ? () =>
                router.push(`/dashboard/inventory-age-indicators/${nextInventoryAgeIndicatorId}`)
            : null
        }
      />
      <RecordMultiSectionPanel page={page} sections={sections} />
      <RecordEntityFooter
        onClose={page.closePage}
        onDelete={controller.deleteRecord}
        deleteLabel="Delete Age Indicator"
        confirmTitle="Delete age indicator?"
        confirmMessage="This cannot be undone. Inventory rows in this range lose this color."
      />
    </>
  )
}
