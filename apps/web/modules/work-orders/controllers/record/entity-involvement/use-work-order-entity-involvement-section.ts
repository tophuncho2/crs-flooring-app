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
  WorkOrderDetail,
  WorkOrderEntityInvolvementForm,
  WorkOrderEntityInvolvementRow,
  WorkOrderEntityInvolvementsDiff,
} from "@builders/domain"
import { validateWorkOrderEntityInvolvementForm } from "@builders/domain"
import { saveWorkOrderEntityInvolvementsSectionRequest } from "@/modules/work-orders/data/mutations"

export type WorkOrderEntityInvolvementLocal = {
  id: string
  // Optional entity link (null = unlinked) — the only writable/diffed link field.
  entityId: string | null
  // Read-only hydration co-located with entityId so the picker's selectedLabel
  // and the Type chip can never desync from the id (grid label-contract fix).
  // Never sent on save; seeded from the row on load, snapshotted on pick.
  entityName: string | null
  entityType: EntityTypeRef | null
  // Free-text reason the entity is involved; "" = unset (persisted NULL).
  involvementType: string
}

type WorkOrderEntityInvolvementsLocalState = {
  items: WorkOrderEntityInvolvementLocal[]
}

function toLocalItem(row: WorkOrderEntityInvolvementRow): WorkOrderEntityInvolvementLocal {
  return {
    id: row.id,
    entityId: row.entityId,
    entityName: row.entityName,
    entityType: row.entityType,
    involvementType: row.involvementType,
  }
}

function createLocalState(
  rows: WorkOrderEntityInvolvementRow[],
): WorkOrderEntityInvolvementsLocalState {
  return { items: rows.map(toLocalItem) }
}

function createItemsRevisionKey(rows: WorkOrderEntityInvolvementRow[]) {
  return JSON.stringify(rows.map((row) => `${row.id}:${row.entityId}:${row.involvementType}`))
}

function itemsDiffer(
  local: WorkOrderEntityInvolvementLocal,
  server: WorkOrderEntityInvolvementRow,
) {
  return local.entityId !== server.entityId || local.involvementType !== server.involvementType
}

function toDiffForm(local: WorkOrderEntityInvolvementLocal): WorkOrderEntityInvolvementForm {
  return {
    // Only the writable link — the entityName/entityType fields are display
    // hydration and must never enter the diff form.
    entityId: local.entityId,
    involvementType: local.involvementType,
  }
}

function buildDiff(
  local: WorkOrderEntityInvolvementsLocalState,
  serverRows: WorkOrderEntityInvolvementRow[],
): WorkOrderEntityInvolvementsDiff {
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
 * Work-order entity-involvement rows slice. Owns the engine's section-controller
 * wrap + the save flow. Follows the WO sibling-prop pattern (planned-payments):
 * the rows are loaded separately + threaded as a prop, so `serverValue` is the
 * rows array (NOT the WorkOrderDetail), and the save reconciles both the WO record
 * and the rows back into the panel.
 */
export function useWorkOrderEntityInvolvementSection({
  workOrder,
  entityInvolvements,
  publishEntityInvolvements,
  publishWorkOrder,
}: {
  workOrder: WorkOrderDetail
  entityInvolvements: WorkOrderEntityInvolvementRow[]
  publishEntityInvolvements: (rows: WorkOrderEntityInvolvementRow[]) => void
  publishWorkOrder: (record: WorkOrderDetail) => void
}) {
  const section = useRecordScopedSectionController<
    WorkOrderEntityInvolvementRow[],
    WorkOrderEntityInvolvementsLocalState
  >({
    recordId: workOrder.id,
    sectionKey: "entity-involvement",
    serverValue: entityInvolvements,
    serverRevisionKey: createItemsRevisionKey(entityInvolvements),
    createLocalValue: createLocalState,
    persistDraft: false,
    policy: {
      addRowPlacement: "bottom",
      childRows: "inline",
    },
    onSave: async (localValue, currentRows) => {
      for (const item of localValue.items) {
        const validationError = validateWorkOrderEntityInvolvementForm(toDiffForm(item))
        if (validationError) {
          throw createRecordSectionError({
            kind: "validation",
            message: validationError,
            retryable: true,
          })
        }
      }

      const diff = buildDiff(localValue, currentRows)
      const { workOrder: nextWorkOrder, entityInvolvements: nextRows } =
        await saveWorkOrderEntityInvolvementsSectionRequest(workOrder.id, diff, workOrder.updatedAt)

      publishWorkOrder(nextWorkOrder)
      publishEntityInvolvements(nextRows)

      return {
        serverValue: nextRows,
        serverRevisionKey: createItemsRevisionKey(nextRows),
        noticeMessage: "Entity involvement saved",
      }
    },
  })

  function addItem() {
    section.setLocalValue((previous) => ({
      items: [
        ...previous.items,
        {
          id: createLocalRecordRowId("work-order-entity-involvement"),
          entityId: null,
          entityName: null,
          entityType: null,
          involvementType: "",
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
    field: keyof WorkOrderEntityInvolvementLocal,
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

  return {
    ...section,
    items: section.localValue.items,
    addItem,
    removeItem,
    changeField,
    selectEntity,
  }
}
