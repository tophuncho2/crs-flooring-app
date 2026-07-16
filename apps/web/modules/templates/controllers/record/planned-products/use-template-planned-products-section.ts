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
  TemplatePlannedProductForm,
  TemplatePlannedProductRow,
  TemplatePlannedProductsDiff,
  UnitOfMeasureOption,
} from "@builders/domain"
import { validateTemplatePlannedProductForm } from "@builders/domain"
import { saveTemplatePlannedProductsSectionRequest } from "@/modules/templates/data/mutations"

export type TemplatePlannedProductLocal = {
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
  // LIVE cost read-joined off the product (seeded from the picked ProductOption
  // for unsaved rows; re-resolved server-side on save). Display only — NEVER sent
  // in the diff (like productName).
  productCost: string
  // Client-only ergonomic for narrowing the row's product picker. NOT
  // persisted to the server — excluded from the diff sent on save.
  categoryFilterId: string | null
  // Display-only name of the product's category, seeded from the saved row so
  // the combined picker can show it before the user touches the row.
  categoryFilterName: string | null
}

type TemplatePlannedProductsLocalState = {
  items: TemplatePlannedProductLocal[]
}

function toLocalItem(row: TemplatePlannedProductRow): TemplatePlannedProductLocal {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.productName,
    unitId: row.unitId,
    unitName: row.unitName,
    unitAbbrev: row.unitAbbrev,
    quantity: row.quantity,
    notes: row.notes,
    productCost: row.productCost,
    categoryFilterId: null,
    categoryFilterName: row.categoryName || null,
  }
}

function createLocalState(record: TemplateDetail): TemplatePlannedProductsLocalState {
  return { items: record.plannedProducts.map(toLocalItem) }
}

function createItemsRevisionKey(record: TemplateDetail) {
  return JSON.stringify(
    // productCost is a live join — include it so an external product-cost change
    // re-seeds the local cost display.
    record.plannedProducts.map(
      (row) =>
        `${row.id}:${row.productId}:${row.unitId}:${row.quantity}:${row.notes}:${row.productCost}`,
    ),
  )
}

function itemsDiffer(local: TemplatePlannedProductLocal, server: TemplatePlannedProductRow) {
  return (
    local.productId !== server.productId ||
    local.unitId !== server.unitId ||
    local.quantity !== server.quantity ||
    local.notes !== server.notes
  )
}

function toDiffForm(local: TemplatePlannedProductLocal): TemplatePlannedProductForm {
  return {
    productId: local.productId,
    unitId: local.unitId,
    quantity: local.quantity,
    notes: local.notes,
  }
}

function buildDiff(
  local: TemplatePlannedProductsLocalState,
  server: TemplateDetail,
): TemplatePlannedProductsDiff {
  // Add appends at the bottom (no reverseAdded), matching the section policy.
  return buildRowDiff({
    locals: local.items,
    serverRows: server.plannedProducts,
    getLocalId: (item) => item.id,
    isLocalOnly: isLocalOnlyRecordRow,
    differs: itemsDiffer,
    toAdded: (item) => ({ tempId: item.id, form: toDiffForm(item) }),
    toModified: (item) => ({ id: item.id, form: toDiffForm(item) }),
  })
}

export function useTemplatePlannedProductsSection({
  template,
  publishTemplate,
}: {
  template: TemplateDetail
  publishTemplate: (record: TemplateDetail) => void
}) {
  const section = useRecordScopedSectionController<TemplateDetail, TemplatePlannedProductsLocalState>({
    recordId: template.id,
    sectionKey: "planned-products",
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
        const validationError = validateTemplatePlannedProductForm(toDiffForm(item))
        if (validationError) {
          throw createRecordSectionError({
            kind: "validation",
            message: validationError,
            retryable: true,
          })
        }
      }

      const diff = buildDiff(localValue, currentRecord)
      const { template: nextTemplate } = await saveTemplatePlannedProductsSectionRequest(
        template.id,
        diff,
        template.updatedAt,
      )

      publishTemplate(nextTemplate)

      return {
        serverValue: nextTemplate,
        serverRevisionKey: createItemsRevisionKey(nextTemplate),
        noticeMessage: "Planned products saved",
      }
    },
  })

  function addItem() {
    section.setLocalValue((previous) => ({
      items: [
        ...previous.items,
        {
          id: createLocalRecordRowId("template-planned-product"),
          productId: "",
          productName: "",
          unitId: "",
          unitName: "",
          unitAbbrev: "",
          quantity: "",
          notes: "",
          productCost: "",
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
    field: keyof TemplatePlannedProductLocal,
    value: string,
  ) {
    section.setLocalValue((previous) => ({
      items: previous.items.map((row) =>
        row.id === itemId ? { ...row, [field]: value } : row,
      ),
    }))
    if (section.error) section.setError(null)
  }

  function changeQuantity(itemId: string, value: string) {
    section.setLocalValue((previous) => ({
      items: previous.items.map((row) =>
        row.id === itemId ? { ...row, quantity: value } : row,
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
        // Seed the live cost from the picked product (for unsaved rows the server
        // hasn't joined yet) for the read-only cost display.
        return {
          ...seeded,
          productName: option?.name ?? "",
          productCost: option?.cost ?? "",
        }
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
    changeQuantity,
    changeCategoryFilter,
    setProductSnapshot,
    setUnit,
  }
}
