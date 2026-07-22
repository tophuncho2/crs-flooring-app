"use client"

import { RecordDetailClientScaffold } from "@/engines/record-view"
import type { InventoryAgeIndicator } from "@builders/domain"
import { InventoryAgeIndicatorRecordPanel } from "./inventory-age-indicator-record-panel"

export function InventoryAgeIndicatorDetailClient({
  initialInventoryAgeIndicator,
  backHref,
  previousInventoryAgeIndicatorId,
  nextInventoryAgeIndicatorId,
}: {
  initialInventoryAgeIndicator: InventoryAgeIndicator
  backHref: string
  previousInventoryAgeIndicatorId: string | null
  nextInventoryAgeIndicatorId: string | null
}) {
  return (
    <RecordDetailClientScaffold
      title="Age Indicators Hub"
      backHref={backHref}
      headerVariant="section"
      dirtyMessage="You have unsaved age indicator changes. Leave this page without saving?"
    >
      {(page) => (
        <InventoryAgeIndicatorRecordPanel
          page={page}
          entry={initialInventoryAgeIndicator}
          previousInventoryAgeIndicatorId={previousInventoryAgeIndicatorId}
          nextInventoryAgeIndicatorId={nextInventoryAgeIndicatorId}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
