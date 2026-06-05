"use client"

import { useCallback, useState } from "react"
import { parseAsBoolean, useQueryState } from "nuqs"
import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog"
import type { InventoryDetail } from "@builders/domain"
import {
  useInventoryRecordSelection,
  type InventoryRecordSelectionController,
  type InventoryRecordWoSeed,
} from "@/modules/inventory/controllers/record/use-inventory-record-selection"
import { InventoryRecordHeader } from "./header/inventory-record-header"
import { InventoryRecordView } from "./inventory-record-view"

/**
 * Client wrapper for the inventory record view. Owns the Warehouse → Inventory
 * header selection (URL query state, via `useInventoryRecordSelection`) plus the
 * adjustment drilldown (`?adjustment=<id>`, sentinel `"new"`) and the
 * duplicate-create toggle (`?duplicate`). Selecting an inventory item loads its
 * record below; the work-order hand-off opens here with the WO's warehouse
 * pre-seeded and the WO link carried in `woSeed`.
 */
export function InventoryDetailClient({
  backHref,
  initialInventory,
  woSeed,
}: {
  backHref: string
  initialInventory?: InventoryDetail | null
  woSeed?: InventoryRecordWoSeed | null
}) {
  const selection = useInventoryRecordSelection({ initialInventory, woSeed })

  return (
    <RecordDetailClientScaffold
      title={selection.inventory?.inventoryItem ?? "Inventory"}
      backHref={backHref}
      dirtyMessage="You have unsaved inventory changes. Leave without saving?"
      headerVariant="section"
    >
      {(page) => <InventoryRecordSurface page={page} selection={selection} />}
    </RecordDetailClientScaffold>
  )
}

const PROMPT_CARD_CLASS =
  "rounded-xl border border-dashed border-[var(--panel-border)] bg-[var(--subpanel-background)] px-5 py-10 text-center text-sm text-[var(--foreground)]/65"

function InventoryRecordSurface({
  page,
  selection,
}: {
  page: RecordDetailClientScaffoldContext
  selection: InventoryRecordSelectionController
}) {
  const [selectedAdjustmentId, setSelectedAdjustmentId] = useQueryState("adjustment")
  const [duplicateOpen, setDuplicateOpen] = useQueryState(
    "duplicate",
    parseAsBoolean.withDefault(false),
  )

  // Selecting a different inventory item (or clearing the header) discards the
  // loaded record. The in-place swap isn't a router navigation, so the
  // scaffold's leave-guard doesn't fire — gate it here when the record is dirty.
  const isRecordDirty = page.isDirty
  const [pendingAction, setPendingAction] = useState<{ run: () => void } | null>(null)

  const guard = useCallback(
    (action: () => void) => {
      if (isRecordDirty) {
        setPendingAction({ run: action })
      } else {
        action()
      }
    },
    [isRecordDirty],
  )

  const inventory = selection.inventory

  return (
    <div className="flex flex-col gap-4">
      <InventoryRecordHeader
        selection={selection}
        onSelectWarehouse={(option) => guard(() => selection.selectWarehouse(option))}
        onSelectInventory={(option) => guard(() => selection.selectInventory(option))}
        onClear={() => guard(() => selection.clear())}
      />

      {selection.inventoryError ? (
        <div className={PROMPT_CARD_CLASS}>{selection.inventoryError}</div>
      ) : selection.isInventoryLoading ? (
        <div className={PROMPT_CARD_CLASS}>Loading inventory…</div>
      ) : inventory ? (
        <InventoryRecordView
          key={inventory.id}
          page={page}
          entry={inventory}
          woSeed={selection.woSeed}
          selectedAdjustmentId={selectedAdjustmentId}
          onSelectAdjustment={(id) => void setSelectedAdjustmentId(id)}
          duplicateOpen={duplicateOpen}
          onToggleDuplicate={(open) => void setDuplicateOpen(open)}
        />
      ) : (
        <div className={PROMPT_CARD_CLASS}>Select an inventory item to view its details.</div>
      )}

      <ConfirmDialog
        open={pendingAction !== null}
        title="Discard unsaved changes?"
        message="This inventory item has unsaved changes. Switching items will discard them."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        tone="warning"
        onConfirm={() => {
          pendingAction?.run()
          setPendingAction(null)
        }}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  )
}
