"use client"

import {
  applyUnitSeed,
  buildRowDiff,
  createLocalRecordRowId,
  createRecordSectionError,
  isLocalOnlyRecordRow,
  useRecordScopedSectionController,
} from "@/engines/record-view"
import type {
  ProductOption,
  TemplateDetail,
  TemplateInvoiceProductForm,
  TemplateInvoiceProductRow,
  TemplateInvoiceProductsDiff,
  UnitOfMeasureOption,
} from "@builders/domain"
import { validateTemplateInvoiceProductForm } from "@builders/domain"
import { saveTemplateInvoiceProductsSectionRequest } from "@/modules/templates/data/mutations"

export type TemplateInvoiceProductLocal = {
  id: string
  productId: string
  // Display-only snapshots seeded from the saved row's joined fields and
  // refreshed when the user picks a new product (via ProductPicker's
  // onOptionSelected). Never sent in the diff — server re-normalizes
  // from the live product table on save.
  productName: string
  // Editable unit FK (UoM epic 2C) — seeded from the product on select, then
  // freely editable; sent in the diff. `unitName` feeds the picker's trigger
  // label (selectedLabel), `unitAbbrev` the quantity-cell suffix.
  unitId: string
  unitName: string
  unitAbbrev: string
  quantity: string
  notes: string
  // Invoice-only money column. Canonical "X.XX" string ("" = unset); MoneyCell
  // normalizes it on blur, so local state matches the server round-trip.
  cost: string
  // Client-only ergonomic for narrowing the row's product picker. NOT
  // persisted to the server — excluded from the diff sent on save.
  categoryFilterId: string | null
  // Display-only name of the product's category, seeded from the saved row so
  // the combined picker can show it before the user touches the row.
  categoryFilterName: string | null
}

type TemplateInvoiceProductsLocalState = {
  items: TemplateInvoiceProductLocal[]
}

function toLocalItem(row: TemplateInvoiceProductRow): TemplateInvoiceProductLocal {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.productName,
    unitId: row.unitId,
    unitName: row.unitName,
    unitAbbrev: row.unitAbbrev,
    quantity: row.quantity,
    notes: row.notes,
    cost: row.cost,
    categoryFilterId: null,
    categoryFilterName: row.categoryName || null,
  }
}

function createLocalState(record: TemplateDetail): TemplateInvoiceProductsLocalState {
  return { items: record.invoiceProducts.map(toLocalItem) }
}

function createItemsRevisionKey(record: TemplateDetail) {
  return JSON.stringify(
    record.invoiceProducts.map(
      (row) => `${row.id}:${row.productId}:${row.unitId}:${row.quantity}:${row.notes}:${row.cost}`,
    ),
  )
}

function itemsDiffer(local: TemplateInvoiceProductLocal, server: TemplateInvoiceProductRow) {
  return (
    local.productId !== server.productId ||
    local.unitId !== server.unitId ||
    local.quantity !== server.quantity ||
    local.notes !== server.notes ||
    local.cost !== server.cost
  )
}

function toDiffForm(local: TemplateInvoiceProductLocal): TemplateInvoiceProductForm {
  return {
    productId: local.productId,
    unitId: local.unitId,
    quantity: local.quantity,
    notes: local.notes,
    cost: local.cost,
  }
}

function buildDiff(
  local: TemplateInvoiceProductsLocalState,
  server: TemplateDetail,
): TemplateInvoiceProductsDiff {
  // Add appends at the bottom (no reverseAdded), matching the section policy.
  return buildRowDiff({
    locals: local.items,
    serverRows: server.invoiceProducts,
    getLocalId: (item) => item.id,
    isLocalOnly: isLocalOnlyRecordRow,
    differs: itemsDiffer,
    toAdded: (item) => ({ tempId: item.id, form: toDiffForm(item) }),
    toModified: (item) => ({ id: item.id, form: toDiffForm(item) }),
  })
}

export function useTemplateInvoiceProductsSection({
  template,
  publishTemplate,
}: {
  template: TemplateDetail
  publishTemplate: (record: TemplateDetail) => void
}) {
  const section = useRecordScopedSectionController<TemplateDetail, TemplateInvoiceProductsLocalState>({
    recordId: template.id,
    sectionKey: "invoice-products",
    serverValue: template,
    serverRevisionKey: createItemsRevisionKey(template),
    createLocalValue: createLocalState,
    persistDraft: false,
    policy: {
      addRowPlacement: "bottom",
      childRows: "inline",
    },
    onSave: async (localValue, currentRecord) => {
      for (const item of localValue.items) {
        const validationError = validateTemplateInvoiceProductForm(toDiffForm(item))
        if (validationError) {
          throw createRecordSectionError({
            kind: "validation",
            message: validationError,
            retryable: true,
          })
        }
      }

      const diff = buildDiff(localValue, currentRecord)
      const { template: nextTemplate } = await saveTemplateInvoiceProductsSectionRequest(
        template.id,
        diff,
        template.updatedAt,
      )

      publishTemplate(nextTemplate)

      return {
        serverValue: nextTemplate,
        serverRevisionKey: createItemsRevisionKey(nextTemplate),
        noticeMessage: "Invoice products saved",
      }
    },
  })

  function addItem() {
    section.setLocalValue((previous) => ({
      items: [
        ...previous.items,
        {
          id: createLocalRecordRowId("template-invoice-product"),
          productId: "",
          productName: "",
          unitId: "",
          unitName: "",
          unitAbbrev: "",
          quantity: "",
          notes: "",
          cost: "",
          categoryFilterId: null,
          categoryFilterName: null,
        },
      ],
    }))
    section.setError(null)
  }

  function removeItem(itemId: string) {
    section.setLocalValue((previous) => ({
      items: previous.items.filter((row) => row.id !== itemId),
    }))
    section.setError(null)
  }

  function changeField(
    itemId: string,
    field: keyof TemplateInvoiceProductLocal,
    value: string,
  ) {
    section.setLocalValue((previous) => ({
      items: previous.items.map((row) =>
        row.id === itemId ? { ...row, [field]: value } : row,
      ),
    }))
    if (section.error) section.setError(null)
  }

  // Client-only ergonomic — does NOT mark the section dirty (excluded from
  // the diff in `toDiffForm` / `itemsDiffer`). Only the filter id moves here;
  // ProductCategoryPicker clears the selected product when the category
  // changes, so a mismatched product can't linger.
  function changeCategoryFilter(itemId: string, categoryId: string | null) {
    section.setLocalValue((previous) => ({
      items: previous.items.map((row) =>
        row.id === itemId ? { ...row, categoryFilterId: categoryId } : row,
      ),
    }))
  }

  function setProductSnapshot(itemId: string, option: ProductOption | null) {
    section.setLocalValue((previous) => ({
      items: previous.items.map((row) => {
        if (row.id !== itemId) return row
        // Re-seed the unit FK from the picked product (UoM epic 2C); the unit
        // stays editable afterward.
        const seeded = applyUnitSeed(
          row,
          option && {
            unitId: option.unitId,
            unitName: option.unitName,
            unitAbbrev: option.unitAbbrev,
          },
          { nameKey: "unitName", abbrevKey: "unitAbbrev" },
        )
        return { ...seeded, productName: option?.name ?? "" }
      }),
    }))
  }

  // Set the item's unit from the picked UoM option — refreshes the display
  // name (picker trigger label) + abbrev (quantity-cell suffix) alongside the FK.
  function setUnit(itemId: string, option: UnitOfMeasureOption | null) {
    section.setLocalValue((previous) => ({
      items: previous.items.map((row) =>
        row.id === itemId
          ? applyUnitSeed(
              row,
              option && {
                unitId: option.id,
                unitName: option.name,
                unitAbbrev: option.abbreviation,
              },
              { nameKey: "unitName", abbrevKey: "unitAbbrev" },
            )
          : row,
      ),
    }))
    if (section.error) section.setError(null)
  }

  return {
    ...section,
    items: section.localValue.items,
    addItem,
    removeItem,
    changeField,
    changeCategoryFilter,
    setProductSnapshot,
    setUnit,
  }
}
