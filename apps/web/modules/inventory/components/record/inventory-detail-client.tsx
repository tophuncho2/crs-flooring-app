"use client"

import { useState } from "react"
import {
  RecordDetailClientScaffold,
  RecordReferenceHeader,
  ReferenceHeaderClearButton,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
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
 * adjustment drilldown (`?adjustment=<id>`, sentinel `"new"`), which lives in the
 * selection controller so switching inventory atomically discards it. Selecting
 * an inventory item loads its record below; the work-order hand-off opens here
 * with the WO's warehouse pre-seeded and the WO link carried in `woSeed`. The
 * "Duplicate" action navigates out to the standalone duplicate-create page.
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
  const inventory = selection.inventory
  const hasSelection = selection.warehouseId !== null || selection.inventoryId !== null

  // The picker grid shows while browsing; once an item is selected it collapses
  // to a summary so the record sections own the space. With nothing selected the
  // grid stays open so there's always a way to pick. `isPicking` is the explicit
  // "re-open to change" toggle.
  const [isPicking, setIsPicking] = useState(false)
  const expanded = isPicking || selection.inventoryId === null

  // The reference-header primitive owns the discard-guard: selecting a different
  // inventory item (or clearing the header) while the record is dirty prompts a
  // confirm before swapping. The swap isn't a router navigation, so this is
  // separate from the scaffold's leave-guard.
  return (
    <div className="flex flex-col gap-4">
      <RecordReferenceHeader
        page={page}
        label="Inventory item"
        discardMessage="This inventory item has unsaved changes. Switching items will discard them."
        actions={({ guard }) => (
          <>
            {!expanded ? (
              <button
                type="button"
                onClick={() => setIsPicking(true)}
                className="shrink-0 rounded-md border border-[var(--panel-border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]/80 transition hover:border-sky-500/45 hover:text-[var(--foreground)]"
              >
                Change
              </button>
            ) : null}
            <ReferenceHeaderClearButton
              disabled={!hasSelection}
              onClick={() =>
                guard(() => {
                  selection.clear()
                  setIsPicking(false)
                })
              }
            />
          </>
        )}
      >
        {({ guard }) => (
          <InventoryRecordHeader
            selection={selection}
            expanded={expanded}
            onSelectWarehouse={(option) => guard(() => selection.selectWarehouse(option))}
            onSelectInventory={(option) =>
              guard(() => {
                selection.selectInventory(option)
                setIsPicking(false)
              })
            }
          />
        )}
      </RecordReferenceHeader>

      <div className={expanded ? "hidden" : undefined}>
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
            selectedAdjustmentId={selection.adjustment}
            onSelectAdjustment={(id) => selection.setAdjustment(id)}
          />
        ) : null}
      </div>
    </div>
  )
}
