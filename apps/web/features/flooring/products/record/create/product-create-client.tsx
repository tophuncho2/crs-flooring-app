"use client"

import { useCallback, useState } from "react"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { buildRecordDetailHref } from "@/features/shared/engines/common/record-entry"
import {
  createRecordSectionError,
  RecordCreateClientScaffold,
  RecordDetailClientScaffoldContext,
  RecordPanelFooter,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
} from "@/features/shared/engines/record-view"
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
  baseColor: "",
  coveragePerUnit: "",
  coverageUnit: "",
  photoUrls: [],
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
  const [customBaseColors, setCustomBaseColors] = useState<string[]>([])
  const [newBaseColor, setNewBaseColor] = useState("")
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

      const payload = await requestJson<{ product: ProductRow }>("/api/flooring/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...localValue,
          coveragePerUnit: localValue.coveragePerUnit.trim(),
        }),
      })

      return {
        redirectTo: buildRecordDetailHref("/dashboard/flooring/products", payload.product.id, backHref),
      }
    },
  })

  const handleAddBaseColorOption = useCallback(() => {
    const trimmed = newBaseColor.trim()
    if (!trimmed) {
      return
    }

    setCustomBaseColors((previous) =>
      Array.from(new Set([...previous, trimmed])).sort((left, right) => left.localeCompare(right)),
    )
    controller.primarySection.setLocalValue((previous) => ({
      ...previous,
      baseColor: trimmed,
    }))
    setNewBaseColor("")
  }, [controller.primarySection, newBaseColor])

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
          customBaseColors={customBaseColors}
          newBaseColor={newBaseColor}
          disabled={controller.primarySection.isSaving}
          onFieldChange={(field, value) => {
            controller.primarySection.setLocalValue((previous) => ({
              ...previous,
              [field]: value,
            }))
          }}
          onNewBaseColorChange={setNewBaseColor}
          onAddBaseColorOption={handleAddBaseColorOption}
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
