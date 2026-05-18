"use client"

import { buildRecordDetailHref } from "@/modules/shared/engines/common/record-entry"
import {
  createRecordSectionError,
  RecordCreateClientScaffold,
  RecordDetailClientScaffoldContext,
  RecordPanelFooter,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
} from "@/modules/shared/engines/record-view"
import {
  EMPTY_PRODUCT_CREATE_FORM,
  validateProductPrimaryForm,
  type ProductCreateForm,
} from "@builders/domain"
import type { CategoryRecord, ProductRecord } from "@builders/db"
import { createProductRequest } from "@/modules/products/data/mutations"
import { ProductPrimaryFieldsSection } from "./product-primary-fields-section"

const EMPTY_PRODUCT: ProductRecord = {
  id: "new",
  name: "",
  categoryId: "",
  manufacturerId: "",
  manufacturerName: "",
  style: "",
  color: "",
  coveragePerUnit: "",
  sendUnitName: "",
  sendUnitAbbrev: "",
  stockUnitName: "",
  stockUnitAbbrev: "",
  itemCoverageUnitName: "",
  itemCoverageUnitAbbrev: "",
  coverageUnit: "",
  note: "",
  createdAt: "",
  updatedAt: "",
  category: {
    id: "",
    slug: "",
    name: "",
    sendUnitId: "",
    stockUnitId: "",
    itemCoverageUnitId: "",
  },
}

function ProductCreatePanel({
  page,
  backHref,
  categoryOptions,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
  categoryOptions: CategoryRecord[]
}) {
  const controller = useSingleSectionCreateController<ProductCreateForm>({
    page,
    createInitialValue: () => ({ ...EMPTY_PRODUCT_CREATE_FORM }),
    createRecord: async (localValue) => {
      const selectedCategory = categoryOptions.find((category) => category.id === localValue.categoryId)
      const validationError = validateProductPrimaryForm({
        ...localValue,
        categorySlug: selectedCategory?.slug ?? null,
        categoryName: selectedCategory?.name ?? null,
      })
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const { product } = await createProductRequest(localValue)

      return {
        redirectTo: buildRecordDetailHref("/dashboard/products", product.id, backHref),
      }
    },
  })

  return (
    <div className="space-y-4">
      <RecordSingleSectionPanel
        title="Product Details"
        controller={controller}
        showHeader={false}
        saveLabel="Create Product"
        savingLabel="Creating Product..."
      >
        <ProductPrimaryFieldsSection
          product={EMPTY_PRODUCT}
          draft={controller.primarySection.localValue}
          categoryOptions={categoryOptions}
          manufacturerName={null}
          disabled={controller.primarySection.isSaving}
          onFieldChange={(field, value) => {
            controller.primarySection.setLocalValue((previous) => ({
              ...previous,
              [field]: value,
            }))
          }}
        />
      </RecordSingleSectionPanel>
      <RecordPanelFooter onClose={page.closePage} />
    </div>
  )
}

export function ProductCreateClient({
  backHref,
  categoryOptions,
}: {
  backHref: string
  categoryOptions: CategoryRecord[]
}) {
  return (
    <RecordCreateClientScaffold
      title="New Product"
      backHref={backHref}
      dirtyMessage="You have unsaved product changes. Leave this form without saving?"
    >
      {(page) => (
        <ProductCreatePanel
          page={page}
          backHref={backHref}
          categoryOptions={categoryOptions}
        />
      )}
    </RecordCreateClientScaffold>
  )
}
