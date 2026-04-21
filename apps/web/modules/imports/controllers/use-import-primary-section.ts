"use client"

import {
  createRecordSectionError,
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import {
  toImportPrimaryForm,
  type ImportDetail as ImportRow,
  type ImportPrimaryForm,
} from "@builders/domain"
import { validateImportPrimaryForm } from "./drafts"
import { deleteImportRequest, updateImportRequest } from "@/modules/imports/data/mutations"

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
    detailUrl: `/api/imports/${entry.id}`,
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

      const payload = await updateImportRequest(record.id, localValue, record.updatedAt)
      return {
        serverValue: { ...record, ...payload.import },
        noticeMessage: "Import saved",
      }
    },
    deleteRecord: async (record) => {
      await deleteImportRequest(record.id, record.updatedAt)
    },
    deleteErrorMessage: "Failed to delete import",
  })
}
