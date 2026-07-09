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
// `ProductUpdateForm` now carries the full draft (categoryId + unitId are both
// mutable, UoM epic 2A), so the update form IS the section's local value.
function toProductRecordViewForm(product: ProductRecord): ProductCreateForm {
  return toProductUpdateForm(product)
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
      const validationError = validateProductPrimaryForm({
        categoryId: localValue.categoryId,
        unitId: localValue.unitId,
        cost: localValue.cost,
      })
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
