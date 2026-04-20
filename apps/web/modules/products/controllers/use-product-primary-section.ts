"use client"

import {
  createRecordSectionError,
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { toProductForm, validateProductPrimaryForm, type ProductForm } from "@builders/domain"
import type { ProductRecord } from "@builders/db"
import { deleteProductRequest, updateProductRequest } from "@/modules/products/data/mutations"

export function useProductPrimarySection({
  page,
  product,
}: {
  page: RecordDetailClientScaffoldContext
  product: ProductRecord
}) {
  return useSingleSectionRecordController<ProductRecord, ProductForm>({
    page,
    scope: "products",
    id: product.id,
    initialRecord: product,
    detailUrl: `/api/products/${product.id}`,
    payloadKey: "product",
    createLocalValue: toProductForm,
    manageDirtySections: false,
    saveSection: async ({ localValue, record, revisionKey }) => {
      const validationError = validateProductPrimaryForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const { product: updated } = await updateProductRequest(record.id, localValue, revisionKey)

      return {
        serverValue: updated,
        noticeMessage: "Product saved",
      }
    },
    deleteRecord: async (record) => {
      await deleteProductRequest(record.id, record.updatedAt)
    },
    deleteErrorMessage: "Failed to delete product",
  })
}
