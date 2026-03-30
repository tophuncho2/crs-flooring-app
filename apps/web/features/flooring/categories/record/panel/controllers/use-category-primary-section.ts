"use client"

import { requestJson } from "@/features/flooring/shared/transport/http"
import { withMutationMeta } from "@/features/flooring/shared/transport/mutation"
import { useSingleSectionRecordController, type RecordDetailClientScaffoldContext } from "@/features/shared/engines/record-view"
import { toCategoryForm, type CategoryForm, type CategoryRow } from "../../../domain/types"

export function useCategoryPrimarySection({
  page,
  category,
}: {
  page: RecordDetailClientScaffoldContext
  category: CategoryRow
}) {
  return useSingleSectionRecordController<CategoryRow, CategoryForm>({
    page,
    scope: "category",
    id: category.id,
    initialRecord: category,
    detailUrl: `/api/flooring/categories/${category.id}`,
    payloadKey: "category",
    createLocalValue: toCategoryForm,
    saveSection: async ({ localValue, record, revisionKey }) => {
      const payload = await requestJson<{ category: CategoryRow }>(
        `/api/flooring/categories/${record.id}/primary/section`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(withMutationMeta(localValue, revisionKey)),
        },
      )

      return payload.category
    },
    deleteRecord: async (record) => {
      await requestJson<{ ok: true }>(`/api/flooring/categories/${record.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withMutationMeta({}, record.updatedAt)),
      })
    },
    deleteErrorMessage: "Failed to delete category",
  })
}
