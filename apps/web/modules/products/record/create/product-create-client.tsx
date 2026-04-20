"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
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
  EMPTY_PRODUCT_FORM,
  type CategoryOption,
  type ManufacturerOption,
  type ProductForm,
  type ProductRow,
  validateProductPrimaryForm,
} from "../../domain/types"
import { ProductPrimaryFieldsSection } from "../panel/sections/product-primary-fields-section"

const EMPTY_PRODUCT: ProductRow = {
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
  coverageUnit: "",
  notes: "",
  createdAt: "",
  updatedAt: "",
  category: {
    id: "",
    name: "",
    sendUnit: "",
    stockUnit: "",
    coverageAvailableUnit: "",
    itemCoverageUnit: "",
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
  categoryOptions: CategoryOption[]
  manufacturerOptions: ManufacturerOption[]
}) {
  const controller = useSingleSectionCreateController<ProductForm>({
    page,
    createInitialValue: () => ({ ...EMPTY_PRODUCT_FORM }),
    createRecord: async (localValue) => {
      const validationError = validateProductPrimaryForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const payload = await requestJson<{ product: ProductRow }>("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...localValue,
          coveragePerUnit: localValue.coveragePerUnit.trim(),
        }),
      })

      return {
        redirectTo: buildRecordDetailHref("/dashboard/products", payload.product.id, backHref),
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
  categoryOptions: CategoryOption[]
  manufacturerOptions: ManufacturerOption[]
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
