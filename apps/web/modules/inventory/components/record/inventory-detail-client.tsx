"use client"

import {
  RecordDetailClientScaffold,
  RecordStepperPortal,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import type { InventoryDetail } from "@builders/domain"
import {
  useInventoryRecordSelection,
  type InventoryRecordSelectionController,
} from "@/modules/inventory/controllers/record/use-inventory-record-selection"
import { InventoryRecordView } from "./inventory-record-view"

/**
 * Client wrapper for the inventory record view. The record is addressed by URL
 * (`?inventoryId=`) — opened from the inventory list, the adjustments ledger, or
 * the top-bar stepper — and loaded client-side. The Warehouse → Inventory picker
 * reference header has been retired (the view is open-by-navigation now); the
 * `?adjustment=<id>` drilldown still lives in the selection controller so
 * switching records atomically discards it. The "Duplicate" action navigates out
 * to the standalone duplicate-create page.
 */
export function InventoryDetailClient({
  backHref,
  initialInventory,
}: {
  backHref: string
  initialInventory?: InventoryDetail | null
}) {
  const selection = useInventoryRecordSelection({ initialInventory })

  // In form mode the surface is dedicated to creating an adjustment — title it
  // so while the create drilldown is open.
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

  // Adjacent rows for the top-bar stepper. Read off the loaded record; both are
  // null while a step's neighbor detail loads, so the arrows disable and the
  // engine primitive holds the last number steady (no flicker).
  const stepPrevious = inventory?.previousInventory ?? null
  const stepNext = inventory?.nextInventory ?? null

  return (
    <div className="flex flex-col gap-4">
      {/* Walks the global inventory-number sequence (◀ INV-# ▶) from the top bar.
          Mounted while a record is *selected* (not only while loaded) so an
          in-flight step doesn't unmount/remount the control — the primitive holds
          the last number while the neighbor loads. */}
      {selection.inventoryId !== null ? (
        <RecordStepperPortal
          label={inventory?.inventoryNumber ?? ""}
          isDirty={page.isDirty}
          discardMessage="This inventory item has unsaved changes. Stepping to another item will discard them."
          onPrevious={stepPrevious ? () => selection.stepToInventory(stepPrevious) : null}
          onNext={stepNext ? () => selection.stepToInventory(stepNext) : null}
        />
      ) : null}

      {selection.inventoryId === null ? (
        <div className={PROMPT_CARD_CLASS}>No inventory item selected.</div>
      ) : selection.inventoryError ? (
        <div className={PROMPT_CARD_CLASS}>{selection.inventoryError}</div>
      ) : selection.isInventoryLoading ? (
        <div className={PROMPT_CARD_CLASS}>Loading inventory…</div>
      ) : inventory ? (
        <InventoryRecordView
          key={inventory.id}
          page={page}
          entry={inventory}
          selectedAdjustmentId={selection.adjustment}
          onSelectAdjustment={(id) => selection.setAdjustment(id)}
        />
      ) : null}
    </div>
  )
}
