"use client"

import {
  createRecordSectionError,
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import {
  toProductUpdateForm,
  validateProductPrimaryForm,
  type ProductCreateForm,
} from "@builders/domain"
import type { ProductRecord } from "@builders/db"
import { deleteProductRequest, updateProductRequest } from "@/modules/products/data/mutations"

// Synthesize a ProductCreateForm-shaped local value for the record-view section.
// `categoryId` is sourced from the loaded record and never edited (the section
// renders the category cell readonly and `updateProductRequest` strips
// categoryId from the PATCH body), but the section component shares its draft
// type with the create flow which DOES allow categoryId.
function toProductRecordViewForm(product: ProductRecord): ProductCreateForm {
  return {
    categoryId: product.categoryId,
    ...toProductUpdateForm(product),
  }
}

export function useProductPrimarySection({
  page,
  product,
}: {
  page: RecordDetailClientScaffoldContext
  product: ProductRecord
}) {
  return useSingleSectionRecordController<ProductRecord, ProductCreateForm>({
    page,
    scope: "products",
    id: product.id,
    initialRecord: product,
    detailUrl: `/api/products/${product.id}`,
    payloadKey: "product",
    createLocalValue: toProductRecordViewForm,
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
