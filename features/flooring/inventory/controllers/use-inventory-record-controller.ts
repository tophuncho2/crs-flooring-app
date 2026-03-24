"use client"

import { useMemo, useState } from "react"
import type { RecordNotices } from "@/features/flooring/shared/controllers/record-page/use-record-notices"
import type { CutLogDraft } from "@/features/flooring/shared/ui/record-items/cut-logs-editor"
import { requestJson } from "@/features/flooring/shared/transport/http"
import {
  formatInventoryQuantity,
  parseInventoryDecimal,
  toInventoryFixedString,
} from "@/features/flooring/inventory/domain/formatters"
import type { InventoryRow, LocationOption } from "@/features/flooring/inventory/domain/types"

const EMPTY_CUT_LOG_DRAFT: CutLogDraft = {
  quantityTaken: "",
  notes: "",
}

export function useInventoryRecordController({
  initialRecord,
  locationOptions,
  notices,
  onDeleted,
}: {
  initialRecord: InventoryRow
  locationOptions: LocationOption[]
  notices: RecordNotices
  onDeleted: () => void
}) {
  const [record, setRecord] = useState(initialRecord)
  const [editLocationId, setEditLocationId] = useState(initialRecord.locationId)
  const [editItemNumber, setEditItemNumber] = useState(initialRecord.itemNumber)
  const [editDyeLot, setEditDyeLot] = useState(initialRecord.dyeLot)
  const [cutLogDraft, setCutLogDraft] = useState<CutLogDraft>(EMPTY_CUT_LOG_DRAFT)
  const [isSavingInventory, setIsSavingInventory] = useState(false)
  const [isSavingCutLog, setIsSavingCutLog] = useState(false)
  const [isDeletingInventory, setIsDeletingInventory] = useState(false)
  const [deletingCutLogId, setDeletingCutLogId] = useState<string | null>(null)

  const selectedEditLocation = useMemo(
    () => locationOptions.find((location) => location.id === editLocationId) ?? null,
    [editLocationId, locationOptions],
  )

  const locationScopeId = record.importWarehouseId || record.warehouseId || ""
  const availableLocationOptions = useMemo(() => {
    if (!locationScopeId) {
      return locationOptions
    }

    return locationOptions.filter((location) => location.warehouseId === locationScopeId)
  }, [locationOptions, locationScopeId])

  const activeWarehouseName = selectedEditLocation?.warehouseName || record.importWarehouseName || record.warehouseName || ""
  const activeSectionName = selectedEditLocation?.sectionName || record.sectionName || ""
  const activeLocationCode = selectedEditLocation?.locationCode || record.locationCode || ""
  const activeRunningBalance = parseInventoryDecimal(record.runningBalance)
  const draftQuantity = parseInventoryDecimal(cutLogDraft.quantityTaken)
  const cutPreviewAfter = toInventoryFixedString(activeRunningBalance - draftQuantity)
  const isDirty =
    editLocationId !== record.locationId ||
    editItemNumber !== record.itemNumber ||
    editDyeLot !== record.dyeLot ||
    cutLogDraft.quantityTaken.trim() !== "" ||
    cutLogDraft.notes.trim() !== ""

  const canSubmitCutLog =
    record.canCreateCutLogs &&
    cutLogDraft.quantityTaken.trim() !== "" &&
    draftQuantity !== 0 &&
    !(draftQuantity > 0 && activeRunningBalance <= 0) &&
    !(draftQuantity > activeRunningBalance)

  const isBusy = isSavingInventory || isSavingCutLog || isDeletingInventory || deletingCutLogId !== null

  function setCutLogDraftField(field: keyof CutLogDraft, value: string) {
    setCutLogDraft((previous) => ({ ...previous, [field]: value }))
  }

  async function saveInventory() {
    if (!editLocationId.trim()) {
      notices.showError("Select a location before saving inventory")
      return
    }

    setIsSavingInventory(true)
    notices.clearNotices()

    try {
      const payload = await requestJson<{ inventory: Omit<InventoryRow, "cutLogs"> }>(`/api/flooring/inventory/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: editLocationId,
          itemNumber: editItemNumber,
          dyeLot: editDyeLot,
        }),
      })

      setRecord((previous) => ({
        ...previous,
        ...payload.inventory,
        cutLogs: previous.cutLogs,
      }))
      setEditLocationId(payload.inventory.locationId)
      setEditItemNumber(payload.inventory.itemNumber)
      setEditDyeLot(payload.inventory.dyeLot)
      notices.showSuccess("Inventory saved")
    } catch (error) {
      notices.showError(error instanceof Error ? error.message : "Failed to save inventory")
    } finally {
      setIsSavingInventory(false)
    }
  }

  async function deleteInventory() {
    notices.clearNotices()
    setIsDeletingInventory(true)

    try {
      await requestJson<{ ok: boolean }>(`/api/flooring/inventory/${record.id}`, { method: "DELETE" })
      onDeleted()
    } catch (error) {
      notices.showError(error instanceof Error ? error.message : "Failed to delete inventory")
      setIsDeletingInventory(false)
    }
  }

  async function addCutLog() {
    setIsSavingCutLog(true)
    notices.clearNotices()

    try {
      const payload = await requestJson<{ cutLog: InventoryRow["cutLogs"][number] }>("/api/flooring/cut-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId: record.id,
          quantityTaken: cutLogDraft.quantityTaken,
          notes: cutLogDraft.notes,
        }),
      })

      setRecord((previous) => {
        const nextCutLogs = [payload.cutLog, ...previous.cutLogs]
        const nextCutTotal = nextCutLogs.reduce((sum, log) => sum + parseInventoryDecimal(log.cut), 0)

        return {
          ...previous,
          cutLogs: nextCutLogs,
          cutTotal: toInventoryFixedString(nextCutTotal),
          runningBalance: toInventoryFixedString(parseInventoryDecimal(previous.stockCount) - nextCutTotal),
        }
      })
      setCutLogDraft(EMPTY_CUT_LOG_DRAFT)
      notices.showSuccess("Cut added")
    } catch (error) {
      notices.showError(error instanceof Error ? error.message : "Failed to add cut")
    } finally {
      setIsSavingCutLog(false)
    }
  }

  async function deleteCutLog(cutLogId: string) {
    setDeletingCutLogId(cutLogId)
    notices.clearNotices()

    try {
      const payload = await requestJson<{ success: boolean; updatedRows: Array<{ id: string; before: string; after: string }> }>(
        `/api/flooring/cut-logs/${cutLogId}`,
        { method: "DELETE" },
      )

      setRecord((previous) => {
        const nextCutLogs = previous.cutLogs
          .filter((log) => log.id !== cutLogId)
          .map((log) => {
            const updated = payload.updatedRows.find((entry) => entry.id === log.id)
            return updated
              ? {
                  ...log,
                  before: updated.before,
                  after: updated.after,
                }
              : log
          })
        const nextCutTotal = nextCutLogs.reduce((sum, log) => sum + parseInventoryDecimal(log.cut), 0)

        return {
          ...previous,
          cutLogs: nextCutLogs,
          cutTotal: toInventoryFixedString(nextCutTotal),
          runningBalance: toInventoryFixedString(parseInventoryDecimal(previous.stockCount) - nextCutTotal),
        }
      })
      notices.showSuccess("Cut deleted")
    } catch (error) {
      notices.showError(error instanceof Error ? error.message : "Failed to delete cut")
    } finally {
      setDeletingCutLogId(null)
    }
  }

  return {
    record,
    notices,
    isDirty,
    editLocationId,
    setEditLocationId,
    editItemNumber,
    setEditItemNumber,
    editDyeLot,
    setEditDyeLot,
    cutLogDraft,
    setCutLogDraftField,
    isSavingInventory,
    isSavingCutLog,
    isDeletingInventory,
    deletingCutLogId,
    isBusy,
    availableLocationOptions,
    activeWarehouseName,
    activeSectionName,
    activeLocationCode,
    activeRunningBalance,
    cutPreviewAfter,
    canSubmitCutLog,
    canCreateCutLogs: record.canCreateCutLogs,
    cutLogBlockedReason: record.cutLogBlockedReason,
    saveInventory,
    deleteInventory,
    addCutLog,
    deleteCutLog,
    lowBalanceWarning:
      activeRunningBalance <= 0
        ? "Running balance is 0. Positive cuts cannot be added until stock is restored."
        : "",
    inventorySummary: {
      importNumber: record.importNumber,
      importTag: record.importTag,
      productName: record.productName,
      itemNumber: editItemNumber,
      warehouseName: activeWarehouseName,
      sectionName: activeSectionName,
      locationCode: activeLocationCode,
      dyeLot: editDyeLot,
      startingStockLabel: formatInventoryQuantity(record.stockCount, record.stockUnit),
      cutTotalLabel: formatInventoryQuantity(record.cutTotal, record.stockUnit),
      runningBalanceLabel: formatInventoryQuantity(record.runningBalance, record.stockUnit),
      notes: record.notes,
    },
  }
}
