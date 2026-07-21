"use client"

import {
  buildRowDiff,
  createLocalRecordRowId,
  createRecordSectionError,
  isLocalOnlyRecordRow,
  useRecordScopedSectionController,
} from "@/engines/record-view"
import type {
  EntityOption,
  EntityTypeRef,
  FlooringPaymentDirection,
  PaletteColor,
  PaymentPurposeOption,
  WorkOrderDetail,
  WorkOrderPlannedPaymentForm,
  WorkOrderPlannedPaymentRow,
  WorkOrderPlannedPaymentsDiff,
} from "@builders/domain"
import { validateWorkOrderPlannedPaymentForm } from "@builders/domain"
import { saveWorkOrderPlannedPaymentsSectionRequest } from "@/modules/work-orders/data/mutations"

export type WorkOrderPlannedPaymentLocal = {
  id: string
  // Unsigned money magnitude ("X.XX"); MoneyCell normalizes on blur so local
  // state matches the server round-trip. Required on save.
  amount: string
  // REVENUE | EXPENSE — carries the amount's sign and the cell chip's tone.
  direction: FlooringPaymentDirection
  // Short free-text note; "" = unset (persisted NULL).
  notes: string
  // Optional entity link (null = unlinked) — the only writable/diffed link field.
  entityId: string | null
  // Read-only hydration co-located with entityId so the picker's selectedLabel
  // and the Type chip can never desync from the id (grid label-contract fix).
  // Never sent on save; seeded from the row on load, snapshotted on pick.
  entityName: string | null
  entityType: EntityTypeRef | null
  // Optional payment-purpose link (null = unlinked) — writable/diffed.
  paymentPurposeId: string | null
  // Read-only hydration co-located with paymentPurposeId so the picker chip's
  // label + color never desync from the id. Never sent on save.
  paymentPurposeName: string | null
  paymentPurposeColor: PaletteColor | null
}

type WorkOrderPlannedPaymentsLocalState = {
  items: WorkOrderPlannedPaymentLocal[]
}

function toLocalItem(row: WorkOrderPlannedPaymentRow): WorkOrderPlannedPaymentLocal {
  return {
    id: row.id,
    amount: row.amount,
    direction: row.direction,
    notes: row.notes,
    entityId: row.entityId,
    entityName: row.entityName,
    entityType: row.entityType,
    paymentPurposeId: row.paymentPurposeId,
    paymentPurposeName: row.paymentPurposeName,
    paymentPurposeColor: row.paymentPurposeColor,
  }
}

function createLocalState(rows: WorkOrderPlannedPaymentRow[]): WorkOrderPlannedPaymentsLocalState {
  return { items: rows.map(toLocalItem) }
}

function createItemsRevisionKey(rows: WorkOrderPlannedPaymentRow[]) {
  return JSON.stringify(
    rows.map(
      (row) =>
        `${row.id}:${row.amount}:${row.direction}:${row.notes}:${row.entityId}:${row.paymentPurposeId}`,
    ),
  )
}

function itemsDiffer(local: WorkOrderPlannedPaymentLocal, server: WorkOrderPlannedPaymentRow) {
  return (
    local.amount !== server.amount ||
    local.direction !== server.direction ||
    local.notes !== server.notes ||
    local.entityId !== server.entityId ||
    local.paymentPurposeId !== server.paymentPurposeId
  )
}

function toDiffForm(local: WorkOrderPlannedPaymentLocal): WorkOrderPlannedPaymentForm {
  return {
    amount: local.amount,
    direction: local.direction,
    notes: local.notes,
    // Only the writable links — the *Name/*Types/*Color fields are display
    // hydration and must never enter the diff form.
    entityId: local.entityId,
    paymentPurposeId: local.paymentPurposeId,
  }
}

function buildDiff(
  local: WorkOrderPlannedPaymentsLocalState,
  serverRows: WorkOrderPlannedPaymentRow[],
): WorkOrderPlannedPaymentsDiff {
  // Add appends at the bottom (no reverseAdded), matching the section policy.
  return buildRowDiff({
    locals: local.items,
    serverRows,
    getLocalId: (item) => item.id,
    isLocalOnly: isLocalOnlyRecordRow,
    differs: itemsDiffer,
    toAdded: (item) => ({ tempId: item.id, form: toDiffForm(item) }),
    toModified: (item) => ({ id: item.id, form: toDiffForm(item) }),
  })
}

/**
 * Work-order planned-payments rows slice. Owns the engine's section-controller
 * wrap + the save flow. Follows the WO sibling-prop pattern (material-items): the
 * rows are loaded separately + threaded as a prop, so `serverValue` is the rows
 * array (NOT the WorkOrderDetail), and the save reconciles both the WO record and
 * the rows back into the panel.
 */
export function useWorkOrderPlannedPaymentsSection({
  workOrder,
  plannedPayments,
  publishPlannedPayments,
  publishWorkOrder,
}: {
  workOrder: WorkOrderDetail
  plannedPayments: WorkOrderPlannedPaymentRow[]
  publishPlannedPayments: (rows: WorkOrderPlannedPaymentRow[]) => void
  publishWorkOrder: (record: WorkOrderDetail) => void
}) {
  const section = useRecordScopedSectionController<
    WorkOrderPlannedPaymentRow[],
    WorkOrderPlannedPaymentsLocalState
  >({
    recordId: workOrder.id,
    sectionKey: "planned-payments",
    serverValue: plannedPayments,
    serverRevisionKey: createItemsRevisionKey(plannedPayments),
    createLocalValue: createLocalState,
    persistDraft: false,
    policy: {
      addRowPlacement: "bottom",
      childRows: "inline",
    },
    onSave: async (localValue, currentRows) => {
      for (const item of localValue.items) {
        const validationError = validateWorkOrderPlannedPaymentForm(toDiffForm(item))
        if (validationError) {
          throw createRecordSectionError({
            kind: "validation",
            message: validationError,
            retryable: true,
          })
        }
      }

      const diff = buildDiff(localValue, currentRows)
      const { workOrder: nextWorkOrder, plannedPayments: nextRows } =
        await saveWorkOrderPlannedPaymentsSectionRequest(workOrder.id, diff, workOrder.updatedAt)

      publishWorkOrder(nextWorkOrder)
      publishPlannedPayments(nextRows)

      return {
        serverValue: nextRows,
        serverRevisionKey: createItemsRevisionKey(nextRows),
        noticeMessage: "Planned payments saved",
      }
    },
  })

  function addItem() {
    section.setLocalValue((previous) => ({
      items: [
        ...previous.items,
        {
          id: createLocalRecordRowId("work-order-planned-payment"),
          amount: "",
          direction: "EXPENSE",
          notes: "",
          entityId: null,
          entityName: null,
          entityType: null,
          paymentPurposeId: null,
          paymentPurposeName: null,
          paymentPurposeColor: null,
        },
      ],
    }))
    section.setError(null)
  }

  function removeItem(itemId: string) {
    section.setLocalValue((previous) => ({
      items: previous.items.filter((row) => row.id !== itemId),
    }))
    section.setError(null)
  }

  function changeField(
    itemId: string,
    field: keyof WorkOrderPlannedPaymentLocal,
    value: string,
  ) {
    section.setLocalValue((previous) => ({
      items: previous.items.map((row) =>
        row.id === itemId ? { ...row, [field]: value } : row,
      ),
    }))
    if (section.error) section.setError(null)
  }

  // Snapshot the picked entity's id + name + type chip into the row atomically,
  // so selectedLabel and the read-only Type column populate instantly with no
  // server round-trip and never desync from entityId. Null clears the link.
  function selectEntity(itemId: string, option: EntityOption | null) {
    section.setLocalValue((previous) => ({
      items: previous.items.map((row) =>
        row.id === itemId
          ? {
              ...row,
              entityId: option?.id ?? null,
              entityName: option?.entity ?? null,
              entityType: option?.type ?? null,
            }
          : row,
      ),
    }))
    if (section.error) section.setError(null)
  }

  // Snapshot the picked purpose's id + name + color into the row atomically, so
  // the picker chip's label + color populate instantly with no server round-trip
  // and never desync from paymentPurposeId. Null clears the link.
  function selectPaymentPurpose(itemId: string, option: PaymentPurposeOption | null) {
    section.setLocalValue((previous) => ({
      items: previous.items.map((row) =>
        row.id === itemId
          ? {
              ...row,
              paymentPurposeId: option?.id ?? null,
              paymentPurposeName: option?.name ?? null,
              paymentPurposeColor: option?.color ?? null,
            }
          : row,
      ),
    }))
    if (section.error) section.setError(null)
  }

  return {
    ...section,
    items: section.localValue.items,
    addItem,
    removeItem,
    changeField,
    selectEntity,
    selectPaymentPurpose,
  }
}
