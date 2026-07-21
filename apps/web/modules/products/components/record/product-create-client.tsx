"use client"

import { buildRecordDetailHref } from "@/hooks/navigation"
import {
  createRecordSectionError,
  RecordCreateClientScaffold,
  RecordDetailClientScaffoldContext,
  RecordPanelFooter,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
} from "@/engines/record-view"
import {
  EMPTY_PRODUCT_CREATE_FORM,
  validateProductPrimaryForm,
  type ProductCreateForm,
} from "@builders/domain"
import type { CategoryRecord, ProductRecord } from "@builders/db"
import { useProductsListMutations } from "@/modules/products/controllers/list/use-products-list-mutations"
import { ProductPrimaryFieldsSection } from "./primary/product-primary-fields-section"

const EMPTY_PRODUCT: ProductRecord = {
  id: "new",
  // Empty on create — the canonical PROD-N is DB-generated at insert. The
  // read-only PROD # field + record stepper key off this and stay hidden when "".
  productNumber: "",
  name: "",
  categoryId: "",
  // No unit until the user picks one — the create form seeds nothing.
  unitId: "",
  unit: null,
  entityId: "",
  entityName: "",
  style: "",
  color: "",
  // Placeholder default — the create flow renders no palette picker; new rows
  // fall to the DB default SLATE.
  paletteColor: "SLATE",
  coveragePerUnit: "",
  // No coverage unit until the user picks one (UoM epic 1a).
  coverageUnitId: "",
  coverageUnit: null,
  // No cost / cost unit until the user sets them.
  cost: "",
  costUnitId: "",
  costUnit: null,
  // No sell price until the user sets it.
  unitPrice: "",
  // No conversion formula until the user picks one.
  conversionFormulaId: "",
  conversionFormulaName: "",
  productNamingAddon: "",
  isArchived: false,
  createdAt: "",
  updatedAt: "",
  createdBy: null,
  updatedBy: null,
  category: {
    id: "",
    name: "",
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
  const { createProduct } = useProductsListMutations()
  const controller = useSingleSectionCreateController<ProductCreateForm>({
    page,
    createInitialValue: () => ({ ...EMPTY_PRODUCT_CREATE_FORM }),
    createRecord: async (localValue) => {
      const validationError = validateProductPrimaryForm({
        categoryId: localValue.categoryId,
        unitId: localValue.unitId,
        cost: localValue.cost,
        unitPrice: localValue.unitPrice,
      })
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const { product } = await createProduct.mutateAsync(localValue)

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
        saveLabel="Create"
        savingLabel="Creating..."
      >
        <ProductPrimaryFieldsSection
          product={EMPTY_PRODUCT}
          draft={controller.primarySection.localValue}
          categoryOptions={categoryOptions}
          entityName={null}
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
