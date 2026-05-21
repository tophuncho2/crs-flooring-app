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
import { useProductsListMutations } from "@/modules/products/controllers/list/use-products-list-mutations"

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
      // Category is immutable post-create — pass the loaded record's category
      // slug + name so `validateProductPrimaryForm` can fire its required /
      // not-allowed branches before the network roundtrip. Without these,
      // the validator only checks categoryId-non-empty + numeric format.
      const validationError = validateProductPrimaryForm({
        ...localValue,
        categorySlug: record.category.slug,
        categoryName: record.category.name,
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
