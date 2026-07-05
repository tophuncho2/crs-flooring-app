"use client"

import { ArrowLeftRight } from "lucide-react"
import { RecordOptionsMenu } from "@/engines/common"
import type { TemplateListRow } from "@builders/domain"

/**
 * The templates row ⋮ menu — one "Sync to Work Order" item that spins a work order
 * off the row. Shared by the templates list table and the property/entity record-view
 * templates sections so the label/disabled/icon behavior stays in lockstep across all
 * three. `syncingId` is the row currently syncing (disables every row's item in
 * flight); `onSync` runs the sync.
 */
export function TemplateSyncRowOptions({
  row,
  syncingId,
  onSync,
}: {
  row: TemplateListRow
  syncingId: string | null
  onSync: (id: string) => void
}) {
  return (
    <RecordOptionsMenu
      ariaLabel={`Options for template ${row.templateNumber}`}
      heading="Template options"
      items={[
        {
          key: "sync-to-work-order",
          label: syncingId === row.id ? "Syncing…" : "Sync to Work Order",
          icon: <ArrowLeftRight size={14} aria-hidden="true" />,
          onClick: () => onSync(row.id),
          disabled: syncingId !== null,
        },
      ]}
    />
  )
}
