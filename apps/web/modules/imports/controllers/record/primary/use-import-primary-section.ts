"use client"

import {
  createRecordSectionError,
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import {
  toImportPrimaryForm,
  type ImportDetail as ImportRow,
  type ImportPrimaryForm,
} from "@builders/domain"
import { validateImportPrimaryForm } from "../drafts"
import { useImportsListMutations } from "@/modules/imports/controllers/list/use-imports-list-mutations"

export function useImportPrimarySection({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: ImportRow
}) {
  const { updateImport, deleteImport } = useImportsListMutations()

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

      const payload = await updateImport.mutateAsync({
        id: record.id,
        input: localValue,
        revisionKey: record.updatedAt,
      })
      return {
        serverValue: payload.import,
        noticeMessage: "Import saved",
      }
    },
    deleteRecord: async (record) => {
      await deleteImport.mutateAsync({ id: record.id, updatedAt: record.updatedAt })
    },
    deleteErrorMessage: "Failed to delete import",
  })
}
