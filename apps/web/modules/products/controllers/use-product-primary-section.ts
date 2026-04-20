"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import {
  createRecordSectionError,
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import {
  toProductForm,
  validateProductPrimaryForm,
  type ProductForm,
  type ProductRow,
} from "../../../domain/types"

export function useProductPrimarySection({
  page,
  product,
}: {
  page: RecordDetailClientScaffoldContext
  product: ProductRow
}) {
  return useSingleSectionRecordController<ProductRow, ProductForm>({
    page,
    scope: "products",
    id: product.id,
    initialRecord: product,
    detailUrl: `/api/products/${product.id}`,
    payloadKey: "product",
    createLocalValue: toProductForm,
    manageDirtySections: false,
    saveSection: async ({ localValue, record }) => {
      const validationError = validateProductPrimaryForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const payload = await requestJson<{ product: ProductRow }>(`/api/products/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...localValue,
          coveragePerUnit: localValue.coveragePerUnit.trim(),
        }),
      })

      return {
        serverValue: payload.product,
        noticeMessage: "Product saved",
      }
    },
    deleteRecord: async (record) => {
      await requestJson<{ ok: true }>(`/api/products/${record.id}`, {
        method: "DELETE",
      })
    },
    deleteErrorMessage: "Failed to delete product",
  })
}
