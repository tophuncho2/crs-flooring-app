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
import type { CategoryRecord, ManufacturerRecord, ProductRecord } from "@builders/db"
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
  width: "",
  sheetSize: "",
  thickness: "",
  unitWeight: "",
  coveragePerUnit: "",
  sendUnitName: "",
  sendUnitAbbrev: "",
  stockUnitName: "",
  stockUnitAbbrev: "",
  itemCoverageUnitName: "",
  itemCoverageUnitAbbrev: "",
  coverageUnit: "",
  notes: "",
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
  manufacturerOptions,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
  categoryOptions: CategoryRecord[]
  manufacturerOptions: ManufacturerRecord[]
}) {
  const controller = useSingleSectionCreateController<ProductCreateForm>({
    page,
    createInitialValue: () => ({ ...EMPTY_PRODUCT_CREATE_FORM }),
    createRecord: async (localValue) => {
      const validationError = validateProductPrimaryForm(localValue)
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
          manufacturerOptions={manufacturerOptions}
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
  manufacturerOptions,
}: {
  backHref: string
  categoryOptions: CategoryRecord[]
  manufacturerOptions: ManufacturerRecord[]
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
          manufacturerOptions={manufacturerOptions}
        />
      )}
    </RecordCreateClientScaffold>
  )
}
