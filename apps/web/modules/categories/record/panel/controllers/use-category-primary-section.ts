"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import { withMutationMeta } from "@/modules/shared/engines/common/transport/mutation"
import { useSingleSectionRecordController, type RecordDetailClientScaffoldContext } from "@/modules/shared/engines/record-view"
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
    detailUrl: `/api/categories/${category.id}`,
    payloadKey: "category",
    createLocalValue: toCategoryForm,
    saveSection: async ({ localValue, record, revisionKey }) => {
      const payload = await requestJson<{ category: CategoryRow }>(
        `/api/categories/${record.id}/primary/section`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(withMutationMeta(localValue, revisionKey)),
        },
      )

      return {
        serverValue: payload.category,
        noticeMessage: "Category saved",
      }
    },
    deleteRecord: async (record) => {
      await requestJson<{ ok: true }>(`/api/categories/${record.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withMutationMeta({}, record.updatedAt)),
      })
    },
    deleteErrorMessage: "Failed to delete category",
  })
}
