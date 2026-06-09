"use client"

import {
  createRecordSectionError,
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import {
  toProductUpdateForm,
  validateProductPrimaryForm,
  type ProductCreateForm,
} from "@builders/domain"
import type { ProductRecord } from "@builders/db"
import { useProductsListMutations } from "@/modules/products/controllers/list/use-products-list-mutations"

// Synthesize a ProductCreateForm-shaped local value for the record-view section.
// `categoryId` is sourced from the loaded record and never edited (the section
// renders it readonly, and the PATCH body strips it), but the section component
// shares its draft type with the create flow which DOES carry it. It's still
// needed here for read-only display.
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
  const { updateProduct, deleteProduct } = useProductsListMutations()

  return useSingleSectionRecordController<ProductRecord, ProductCreateForm>({
    page,
    scope: "products",
    id: product.id,
    initialRecord: product,
    detailUrl: `/api/products/${product.id}`,
    payloadKey: "product",
    createLocalValue: toProductRecordViewForm,
    manageDirtySections: false,
    saveSection: async ({ localValue, record }) => {
      const validationError = validateProductPrimaryForm({ categoryId: localValue.categoryId })
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const { product: updated } = await updateProduct.mutateAsync({
        id: record.id,
        input: localValue,
        revisionKey: record.updatedAt,
      })

      return {
        serverValue: updated,
        noticeMessage: "Product saved",
      }
    },
    deleteRecord: async (record) => {
      await deleteProduct.mutateAsync({ id: record.id, updatedAt: record.updatedAt })
    },
    deleteErrorMessage: "Failed to delete product",
  })
}
