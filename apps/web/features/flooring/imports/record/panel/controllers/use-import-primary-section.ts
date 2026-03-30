"use client"

import { requestJson } from "@/features/flooring/shared/transport/http"
import {
  createRecordSectionError,
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/features/shared/engines/record-view"
import {
  buildImportMutationPayload,
  toImportInventoryDrafts,
  toImportPrimaryForm,
  validateImportPrimaryForm,
  type ImportPrimaryForm,
  type ImportRow,
} from "../../../domain/types"

export function useImportPrimarySection({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: ImportRow
}) {
  return useSingleSectionRecordController<ImportRow, ImportPrimaryForm>({
    page,
    scope: "imports",
    id: entry.id,
    initialRecord: entry,
    detailUrl: `/api/flooring/imports/${entry.id}`,
    payloadKey: "import",
    createLocalValue: toImportPrimaryForm,
    manageDirtySections: false,
    saveSection: async ({ localValue, record }) => {
      const validationError = validateImportPrimaryForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const payload = await requestJson<{ import: ImportRow }>(`/api/flooring/imports/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildImportMutationPayload(localValue, toImportInventoryDrafts(record))),
      })

      return {
        serverValue: payload.import,
        noticeMessage: "Import saved",
      }
    },
    deleteRecord: async (record) => {
      await requestJson<{ ok: true }>(`/api/flooring/imports/${record.id}`, {
        method: "DELETE",
      })
    },
    deleteErrorMessage: "Failed to delete import",
  })
}
