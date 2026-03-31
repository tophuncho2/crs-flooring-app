"use client"

import {
  createLocalRecordRowId,
  createRecordSectionError,
  useRecordScopedSectionController,
} from "@/features/shared/engines/record-view"
import { requestJson } from "@/features/flooring/shared/transport/http"
import {
  applyDefaultLocationToImportRow,
  buildImportMutationPayload,
  createImportInventoryRowDraft,
  toImportInventoryDrafts,
  toImportPrimaryForm,
  validateImportInventoryDrafts,
  type ImportInventoryRowDraft,
  type ImportRow,
  type LocationOption,
} from "../../../domain/types"

function createDraftRow(locationOptions: LocationOption[], warehouseId: string) {
  return applyDefaultLocationToImportRow(
    {
      ...createImportInventoryRowDraft(),
      clientId: createLocalRecordRowId("import-inventory-row"),
    },
    warehouseId,
    locationOptions,
  )
}

function createRowsRevisionKey(record: ImportRow) {
  return `${record.updatedAt}:${record.inventories.length}`
}

export function useImportInventoryRowsSection({
  record,
  locationOptions,
  publishRecord,
}: {
  record: ImportRow
  locationOptions: LocationOption[]
  publishRecord: (record: ImportRow) => void
}) {
  const section = useRecordScopedSectionController<ImportRow, ImportInventoryRowDraft[]>({
    recordId: record.id,
    sectionKey: "inventory-rows",
    serverValue: record,
    serverRevisionKey: createRowsRevisionKey(record),
    createLocalValue: toImportInventoryDrafts,
    persistDraft: false,
    policy: {
      addRowPlacement: "top",
      childRows: "none",
    },
    onSave: async (localValue, currentRecord) => {
      const validationError = validateImportInventoryDrafts(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const payload = await requestJson<{ import: ImportRow }>(`/api/flooring/imports/${currentRecord.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildImportMutationPayload(toImportPrimaryForm(currentRecord), localValue)),
      })

      publishRecord(payload.import)

      return {
        serverValue: payload.import,
        serverRevisionKey: createRowsRevisionKey(payload.import),
        noticeMessage: "Import inventory rows saved",
      }
    },
  })

  function addRow() {
    section.setLocalValue((previous) => [
      createDraftRow(locationOptions, record.warehouseId),
      ...previous,
    ])
    if (section.error) {
      section.setError(null)
    }
  }

  function removeRow(index: number) {
    section.setLocalValue((previous) => previous.filter((_, rowIndex) => rowIndex !== index))
    if (section.error) {
      section.setError(null)
    }
  }

  function setRowField(index: number, field: keyof Omit<ImportInventoryRowDraft, "clientId">, value: string) {
    section.setLocalValue((previous) =>
      previous.map((row, rowIndex) => {
        if (rowIndex !== index) {
          return row
        }

        const nextRow = {
          ...row,
          [field]: value,
        }

        if (field === "locationId") {
          return nextRow
        }

        return nextRow
      }),
    )

    if (section.error) {
      section.setError(null)
    }
  }

  function handleWarehouseChange(nextWarehouseId: string) {
    section.setLocalValue((previous) =>
      previous.map((row) => applyDefaultLocationToImportRow(row, nextWarehouseId, locationOptions)),
    )
  }

  return {
    ...section,
    addRow,
    removeRow,
    setRowField,
    handleWarehouseChange,
  }
}
