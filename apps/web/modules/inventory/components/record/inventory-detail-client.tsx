"use client"

import { parseAsBoolean, useQueryState } from "nuqs"
import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import type { InventoryDetail } from "@builders/domain"
import { InventoryRecordView } from "./inventory-record-view"

/**
 * Client wrapper for the inventory record page. Owns the drilldown selection
 * (`?adjustment=<id>`, sentinel `"new"`) and the duplicate-create toggle
 * (`?duplicate`) as URL state so the browser back button + deep links work,
 * then wraps the shared `RecordDetailClientScaffold`. Mirrors
 * `ManagementCompanyDetailClient`.
 */
export function InventoryDetailClient({
  inventory,
  backHref,
}: {
  inventory: InventoryDetail
  backHref: string
}) {
  const [selectedAdjustmentId, setSelectedAdjustmentId] = useQueryState("adjustment")
  const [duplicateOpen, setDuplicateOpen] = useQueryState(
    "duplicate",
    parseAsBoolean.withDefault(false),
  )

  return (
    <RecordDetailClientScaffold
      title={inventory.inventoryItem}
      backHref={backHref}
      dirtyMessage="You have unsaved inventory changes. Leave without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <InventoryRecordView
          page={page}
          entry={inventory}
          selectedAdjustmentId={selectedAdjustmentId}
          onSelectAdjustment={(id) => void setSelectedAdjustmentId(id)}
          duplicateOpen={duplicateOpen}
          onToggleDuplicate={(open) => void setDuplicateOpen(open)}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
