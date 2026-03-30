"use client"

import { useMemo } from "react"
import {
  createLocalRecordRowId,
  createRecordSectionError,
  useRecordSectionController,
} from "@/features/shared/engines/record-view"
import { requestJson } from "@/features/flooring/shared/transport/http"
import {
  parseInventoryDecimal,
  toInventoryFixedString,
} from "../../../domain/formatters"
import type { InventoryRow } from "../../../domain/types"

export type InventoryCutLogDraft = {
  id: string
  quantityTaken: string
  notes: string
}

function createEmptyCutLogDraft(): InventoryCutLogDraft {
  return {
    id: createLocalRecordRowId("inventory-cut-log"),
    quantityTaken: "",
    notes: "",
  }
}

function createCutLogsRevisionKey(record: InventoryRow) {
  return `${record.updatedAt}:${record.cutLogs.length}:${record.cutTotal}:${record.runningBalance}`
}

export function useInventoryCutLogsSection({
  record,
  publishRecord,
}: {
  record: InventoryRow
  publishRecord: (record: InventoryRow) => void
}) {
  const section = useRecordSectionController<InventoryRow, InventoryCutLogDraft | null>({
    serverValue: record,
    serverRevisionKey: createCutLogsRevisionKey(record),
    createLocalValue: () => null,
    onSave: async (draft, currentRecord) => {
      if (!draft) {
        throw createRecordSectionError({
          kind: "validation",
          message: "Add a cut log row before saving.",
          retryable: true,
        })
      }

      const quantity = draft.quantityTaken.trim()
      if (!quantity) {
        throw createRecordSectionError({
          kind: "validation",
          message: "Cut quantity is required.",
          retryable: true,
        })
      }

      const parsedQuantity = parseInventoryDecimal(quantity)
      const runningBalance = parseInventoryDecimal(currentRecord.runningBalance)

      if (parsedQuantity === 0) {
        throw createRecordSectionError({
          kind: "validation",
          message: "Cut quantity must be greater than 0.",
          retryable: true,
        })
      }

      if (parsedQuantity > 0 && runningBalance <= 0) {
        throw createRecordSectionError({
          kind: "validation",
          message: "Running balance is 0. Positive cuts cannot be added until stock is restored.",
          retryable: true,
        })
      }

      if (parsedQuantity > runningBalance) {
        throw createRecordSectionError({
          kind: "validation",
          message: "Quantity taken cannot exceed the current running balance.",
          retryable: true,
        })
      }

      await requestJson<{ cutLog: InventoryRow["cutLogs"][number] }>("/api/flooring/cut-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId: currentRecord.id,
          quantityTaken: draft.quantityTaken,
          notes: draft.notes,
        }),
      })

      const payload = await requestJson<{ inventory: InventoryRow }>(`/api/flooring/inventory/${currentRecord.id}`)
      publishRecord(payload.inventory)

      return {
        serverValue: payload.inventory,
        serverRevisionKey: createCutLogsRevisionKey(payload.inventory),
        noticeMessage: "Cut log added",
      }
    },
  })

  const runningBalance = useMemo(() => parseInventoryDecimal(record.runningBalance), [record.runningBalance])
  const draftQuantity = useMemo(
    () => parseInventoryDecimal(section.localValue?.quantityTaken ?? ""),
    [section.localValue?.quantityTaken],
  )
  const draftBefore = useMemo(() => toInventoryFixedString(runningBalance), [runningBalance])
  const draftAfter = useMemo(() => toInventoryFixedString(runningBalance - draftQuantity), [draftQuantity, runningBalance])

  const blockedSummary = record.cutLogBlockedReason
    ? record.cutLogBlockedReason
    : runningBalance <= 0
      ? "Running balance is 0. Positive cuts cannot be added until stock is restored."
      : ""

  function addDraft() {
    if (section.localValue) {
      return
    }

    section.setLocalValue(createEmptyCutLogDraft())
    section.setError(null)
  }

  function setDraftField(field: keyof Omit<InventoryCutLogDraft, "id">, value: string) {
    section.setLocalValue((previous) =>
      previous
        ? {
            ...previous,
            [field]: value,
          }
        : previous,
    )
    if (section.error) {
      section.setError(null)
    }
  }

  return {
    ...section,
    addDraft,
    setDraftField,
    draftBefore,
    draftAfter,
    canAddDraft: !section.localValue && !section.isSaving && record.canCreateCutLogs,
    blockedSummary,
  }
}
