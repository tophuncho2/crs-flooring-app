"use client"

import { useState } from "react"
import {
  RecordDetailClientScaffold,
  RecordReferenceHeader,
  ReferenceHeaderClearButton,
  ReferenceHeaderDiscardButton,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import type { InventoryDetail } from "@builders/domain"
import {
  useInventoryRecordSelection,
  type InventoryRecordSelectionController,
  type InventoryRecordWoSeed,
  type InventorySelectionSnapshot,
} from "@/modules/inventory/controllers/record/use-inventory-record-selection"
import { useInventoryOptionsGrid } from "@/modules/inventory/controllers/record/header/use-inventory-options-grid"
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

  // In form mode the surface is dedicated to creating an adjustment — title it
  // so before an inventory item is even selected.
  const title = selection.isAdjustmentFormMode ? "Add adjustment" : "Inventory Hub"

  return (
    <RecordDetailClientScaffold
      title={title}
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

  // The picker grid shows while browsing; once an item is selected it collapses
  // to a summary so the record sections own the space. With nothing selected the
  // grid stays open so there's always a way to pick. `isPicking` is the explicit
  // "re-open to re-select" toggle (driven by the Re-select button or clicking the
  // collapsed row).
  const [isPicking, setIsPicking] = useState(false)
  const expanded = isPicking || selection.inventoryId === null

  // The picker grid controller is owned here (not inside the grid component) so
  // the reference header's Clear can both read whether the search bars hold a
  // value and reset them. It only fetches while the picker is open (`enabled`).
  const grid = useInventoryOptionsGrid({
    warehouseId: selection.warehouseId,
    productFilterId: selection.productId,
    enabled: expanded,
  })

  // Clear is the full reset: enabled whenever any header tool is in use —
  // warehouse, product, a selected item, or any of the four search bars.
  const hasSelection =
    selection.warehouseId !== null ||
    selection.productId !== null ||
    selection.inventoryId !== null ||
    grid.hasSearch

  // Snapshot of the selection captured when re-picking begins, so "Discard" can
  // restore the item the operator started from (changing warehouse/product mid-
  // pick cascade-clears the inventory id, so we can't recover it from the URL).
  const [reselectSnapshot, setReselectSnapshot] = useState<InventorySelectionSnapshot | null>(
    null,
  )
  const beginReselect = () => {
    setReselectSnapshot({
      warehouseId: selection.warehouseId,
      warehouseLabel: selection.warehouseLabel,
      productId: selection.productId,
      productLabel: selection.productLabel,
      inventoryId: selection.inventoryId,
      inventoryLabel: selection.inventoryLabel,
      adjustment: selection.adjustment,
    })
    setIsPicking(true)
  }

  // Form mode before an item is picked: make the grid's purpose obvious — the
  // operator is here to add an adjustment and just needs to choose which item.
  const woSeed = selection.woSeed
  const showFormModeHint = selection.isAdjustmentFormMode && selection.inventoryId === null
  const formModeContext = woSeed
    ? [woSeed.workOrderLabel, woSeed.materialItemLabel].filter(Boolean).join(" · ")
    : null

  // The reference-header primitive owns the discard-guard: selecting a different
  // inventory item (or clearing the header) while the record is dirty prompts a
  // confirm before swapping. The swap isn't a router navigation, so this is
  // separate from the scaffold's leave-guard.
  return (
    <div className="flex flex-col gap-4">
      {showFormModeHint ? (
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 px-4 py-3 text-sm text-[var(--foreground)]/80">
          <span className="font-medium text-[var(--foreground)]">Adding an adjustment</span> —
          choose the inventory item to adjust.
          {formModeContext ? (
            <span className="text-[var(--foreground)]/55"> {formModeContext}</span>
          ) : null}
        </div>
      ) : null}
      <RecordReferenceHeader
        page={page}
        label="Inventory item"
        discardMessage="This inventory item has unsaved changes. Switching items will discard them."
        actions={({ guard }) => (
          <>
            {!expanded ? (
              <button
                type="button"
                onClick={beginReselect}
                className="shrink-0 rounded-md border border-[var(--panel-border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]/80 transition hover:border-sky-500/45 hover:text-[var(--foreground)]"
              >
                Re-select
              </button>
            ) : null}
            {/* Discard cancels an in-progress re-pick, restoring the item the
                operator started from. Not guarded: committing a different item
                already collapses the picker, so this only ever restores the
                snapshot's own (possibly dirty, preserved) record. */}
            {expanded && reselectSnapshot ? (
              <ReferenceHeaderDiscardButton
                disabled={false}
                onClick={() => {
                  selection.restore(reselectSnapshot)
                  setReselectSnapshot(null)
                  setIsPicking(false)
                }}
              />
            ) : null}
            <ReferenceHeaderClearButton
              disabled={!hasSelection}
              onClick={() =>
                guard(() => {
                  selection.clear()
                  grid.reset()
                  setReselectSnapshot(null)
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
            grid={grid}
            expanded={expanded}
            onReselect={beginReselect}
            onSelectWarehouse={(option) => guard(() => selection.selectWarehouse(option))}
            onSelectProduct={(option) => guard(() => selection.selectProduct(option))}
            onSelectInventory={(option) =>
              guard(() => {
                selection.selectInventory(option)
                setReselectSnapshot(null)
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
