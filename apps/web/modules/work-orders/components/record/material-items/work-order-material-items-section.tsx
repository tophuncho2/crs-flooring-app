"use client"

import { useCallback, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { EnrichedInventoryAdjustmentRow, WorkOrderDetail } from "@builders/domain"
import {
  ConfirmDialog,
  RecordDeleteDialog,
  RecordItemSection,
  RecordStepper,
  buildDeleteConfirmationMessage,
  useRecordDeleteConfirmation,
  useRecordSwapGuard,
} from "@/engines/record-view"
import { getClientErrorMessage } from "@/transport"
import {
  buildCurrentRecordEntryPath,
  buildInventoryRecordHref,
  buildInventorySplitOffHref,
} from "@/hooks/navigation"
import { WorkOrderAdjustmentCreateModal } from "@/modules/inventory/components/record/adjustments/work-order-adjustment-create-modal"
import { useDeleteAdjustmentMutation } from "@/modules/inventory/controllers/record/adjustments/mutations"
import { useAdjustmentReconcile } from "@/modules/adjustments"
import type { WorkOrderMaterialItemsSectionController } from "@/modules/work-orders/controllers/record/material-items/use-work-order-material-items-section"
import { WorkOrderAdjustmentsGrid } from "./work-order-adjustments-grid"
import { WorkOrderRequestedMaterialGrid } from "./work-order-requested-material-grid"

/** Which grid the single section is showing. Adjustments (outflow) is default. */
type SectionMode = "adjustments" | "requested"

/**
 * An "add adjustment" modal request. `product` optionally pre-filters the
 * inventory picker (still changeable); `source` is the row being duplicated
 * (pre-selects its inventory + seeds the adjustment values). Both null ⇒ a blank
 * section-level add.
 */
type AdjustmentModalRequest = {
  product: { id: string; name: string } | null
  source: EnrichedInventoryAdjustmentRow | null
}

const MODE_LABEL: Record<SectionMode, string> = {
  adjustments: "Adjustments",
  requested: "Requested Material",
}

// Mode accent: amber = outflow (Adjustments), sky = inbound (Requested Material).
const MODE_ACCENT: Record<SectionMode, string> = {
  adjustments: "border-amber-500/60 bg-amber-500/10 text-amber-800",
  requested: "border-sky-500/60 bg-sky-500/10 text-sky-800",
}

// Red instruction shown under the stepper so the two-view nature is discoverable
// (each side serves a distinct purpose; the other view is one stepper click away).
const MODE_TIP: Record<SectionMode, string> = {
  adjustments: "Use this section to Manage Adjustments",
  requested: "Use this section to Plan Adjustments",
}

/**
 * The work order's single materials section, toggled between two grids by an
 * inline stepper:
 *   - Adjustments (default, amber) — the outflow that fulfils this WO, grouped
 *     by product with per-product subtotals. Read-only rows; create via modal.
 *   - Requested Material (sky) — the inbound customer request (material-item
 *     rows), managed save/discard.
 *
 * Adjustments and material items are decoupled — an adjustment links to the work
 * order (any product), never to a material item. Flipping away from a dirty
 * Requested Material grid prompts the shared swap-discard guard.
 */
export function WorkOrderMaterialItemsSection({
  workOrder,
  adjustmentsForWorkOrder,
  section,
}: {
  workOrder: WorkOrderDetail
  adjustmentsForWorkOrder: EnrichedInventoryAdjustmentRow[]
  section: WorkOrderMaterialItemsSectionController
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const returnTo = buildCurrentRecordEntryPath(pathname, searchParams)
  const reconcileAdjustments = useAdjustmentReconcile()

  // Default to Adjustments, but honor `?view=requested` so an external entry
  // (template → work-order sync) can land directly on the Requested Material
  // view. Read once at mount: the section is keyed on the record id upstream, so
  // stepping to a neighbor remounts and re-reads, and a later same-record nav
  // doesn't yank the view out from under an in-progress edit.
  const [mode, setMode] = useState<SectionMode>(
    searchParams.get("view") === "requested" ? "requested" : "adjustments",
  )
  const [modalRequest, setModalRequest] = useState<AdjustmentModalRequest | null>(null)
  const [pendingDelete, setPendingDelete] = useState<EnrichedInventoryAdjustmentRow | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Row ⋮ → "Delete adjustment". Scoped to this work order; the canonical delete
  // mutation reconciles balances + caches via `reconcileAdjustments` on success.
  const deleteMutation = useDeleteAdjustmentMutation({
    scope: { kind: "work-order", workOrderId: workOrder.id },
    onDeleted: () => {
      setPendingDelete(null)
      reconcileAdjustments()
    },
    onError: (err) =>
      setDeleteError(getClientErrorMessage(err, "Failed to delete adjustment")),
  })

  const deleteConfirm = useRecordDeleteConfirmation(async () => {
    if (!pendingDelete) return
    setDeleteError(null)
    try {
      await deleteMutation.mutateAsync({ adjustment: pendingDelete })
    } catch {
      // Surfaced inline via `deleteError` (the mutation's onError).
    }
  })

  const sectionBusy = section.isSaving

  // Flipping away from a dirty Requested Material grid warns first — but the flip
  // KEEPS the edits (they persist until save or leaving the work order), so the
  // copy is switch-flavored, not discard-flavored. The Adjustments grid has no
  // editable state, so flipping off it is always free.
  const { guard, dialogProps } = useRecordSwapGuard({
    isDirty: mode === "requested" && section.isDirty,
    title: "Switch view?",
    discardMessage:
      "Requested Material has unsaved changes. Switch views? Your edits stay until you save or leave the work order.",
    confirmLabel: "Switch & keep editing",
    cancelLabel: "Stay here",
  })

  const flipMode = useCallback(() => {
    guard(() => setMode((prev) => (prev === "adjustments" ? "requested" : "adjustments")))
  }, [guard])

  const handleOpenEdit = useCallback(
    (adjustment: EnrichedInventoryAdjustmentRow) => {
      router.push(
        buildInventoryRecordHref({
          inventoryId: adjustment.inventoryId,
          inventoryLabel: adjustment.inventoryItem,
          warehouseId: adjustment.warehouseId,
          warehouseLabel: adjustment.warehouseName,
          adjustment: adjustment.id,
          returnTo,
        }),
      )
    },
    [router, returnTo],
  )

  // "Add inventory from adjustment" — same destination as the ledger + inventory
  // record view: the split-off create form seeded from this row's inventory.
  const handleSplitOff = useCallback(
    (adjustment: EnrichedInventoryAdjustmentRow) => {
      router.push(
        buildInventorySplitOffHref({
          sourceInventoryId: adjustment.inventoryId,
          quantity: adjustment.quantity,
          returnTo,
        }),
      )
    },
    [router, returnTo],
  )

  const stepper = (
    <div className="flex flex-col items-start gap-1">
      <RecordStepper
        label={MODE_LABEL[mode]}
        onPrevious={flipMode}
        onNext={flipMode}
        previousAriaLabel="Show the other view"
        nextAriaLabel="Show the other view"
        accent={MODE_ACCENT[mode]}
      />
      <p className="px-1 text-xs font-medium text-rose-600">{MODE_TIP[mode]}</p>
    </div>
  )

  const subHeader =
    mode === "requested"
      ? {
          actionsLeading: stepper,
          isDirty: section.isDirty,
          isSaving: section.isSaving,
          hasConflict: section.hasConflict,
          onSave: () => void section.save(),
          onDiscard: () => section.discard(),
          saveLabel: "Save Material Items",
          savingLabel: "Saving Material Items...",
          discardLabel: "Discard",
          error: section.error ? section.error.message : null,
          actions: [
            {
              key: "add-material-item",
              label: "+ Add Material Item",
              kind: "add-row" as const,
              onClick: section.addItem,
              disabled: section.isSaving,
            },
          ],
        }
      : {
          actionsLeading: stepper,
          // Adjustments grid is read-only here — no managed save/discard.
          isDirty: false,
          isSaving: section.isSaving,
          hasConflict: false,
          actions: [
            {
              key: "add-adjustment",
              label: "+ Add Adjustment",
              kind: "add-row" as const,
              onClick: () => setModalRequest({ product: null, source: null }),
              disabled: section.isSaving,
            },
          ],
        }

  return (
    <>
      <RecordItemSection
        title={MODE_LABEL[mode]}
        capabilities={{ editable: true, supportsSaveDiscard: true, supportsAddRow: true }}
        noticeMessage={section.noticeMessage}
        noticeError={section.noticeError}
        subHeader={subHeader}
      >
        {mode === "adjustments" ? (
          <WorkOrderAdjustmentsGrid
            adjustments={adjustmentsForWorkOrder}
            onOpenEdit={handleOpenEdit}
            onCreateWithProduct={(product) => setModalRequest({ product, source: null })}
            onDuplicate={(adjustment) => setModalRequest({ product: null, source: adjustment })}
            onSplitOff={handleSplitOff}
            onDelete={(adjustment) => {
              setDeleteError(null)
              setPendingDelete(adjustment)
              deleteConfirm.requestDelete()
            }}
            isBusy={sectionBusy}
          />
        ) : (
          <WorkOrderRequestedMaterialGrid
            section={section}
            onCreateAdjustment={(item) =>
              setModalRequest({
                product: { id: item.productId, name: item.productName },
                source: null,
              })
            }
          />
        )}
      </RecordItemSection>

      <ConfirmDialog {...dialogProps} />

      <RecordDeleteDialog
        open={deleteConfirm.isOpen}
        isDeleting={deleteConfirm.isDeleting}
        title="Delete adjustment?"
        message={buildDeleteConfirmationMessage("adjustment")}
        onConfirm={deleteConfirm.confirmDelete}
        onCancel={deleteConfirm.cancelDelete}
      />
      {deleteError ? <p className="px-1 text-sm text-rose-400">{deleteError}</p> : null}

      {modalRequest ? (
        <WorkOrderAdjustmentCreateModal
          workOrder={{
            id: workOrder.id,
            workOrderNumber: workOrder.workOrderNumber,
            warehouseId: workOrder.warehouseId,
            warehouseName: workOrder.warehouseName,
          }}
          product={modalRequest.product}
          source={modalRequest.source}
          onClose={() => setModalRequest(null)}
          onCreated={() => {
            // Close immediately, then strong-reconcile: refreshes this WO's
            // Adjustments grid plus the inventory balances + ledger the new row
            // touches, wherever they're mounted.
            setModalRequest(null)
            // Surface the outflow just created — flip to the Adjustments view so
            // the new row is visible (a create launched from a Requested row would
            // otherwise leave the user looking at the Requested grid).
            setMode("adjustments")
            reconcileAdjustments()
          }}
        />
      ) : null}
    </>
  )
}
