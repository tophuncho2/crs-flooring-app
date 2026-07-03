"use client"

import {
  buildRowDiff,
  createLocalRecordRowId,
  createRecordSectionError,
  isLocalOnlyRecordRow,
  useRecordScopedSectionController,
} from "@/engines/record-view"
import type {
  ProductOption,
  TemplateDetail,
  TemplateMaterialItemForm,
  TemplateMaterialItemRow,
  TemplateMaterialItemsDiff,
  UnitOfMeasureOption,
} from "@builders/domain"
import { validateTemplateMaterialItemForm } from "@builders/domain"
import { saveTemplateMaterialItemsSectionRequest } from "@/modules/templates/data/mutations"

export type TemplateMaterialItemLocal = {
  id: string
  productId: string
  // Display-only snapshots seeded from the saved row's joined fields and
  // refreshed when the user picks a new product (via ProductPicker's
  // onOptionSelected). Never sent in the diff — server re-normalizes
  // from the live product table on save.
  productName: string
  // Editable unit FK (UoM epic 2C) — seeded from the product on select, then
  // freely editable; sent in the diff. `sendUnitName` feeds the picker's trigger
  // label (selectedLabel), `sendUnitAbbrev` the quantity-cell suffix.
  unitId: string
  sendUnitName: string
  sendUnitAbbrev: string
  quantity: string
  notes: string
  // Client-only ergonomic for narrowing the row's product picker. NOT
  // persisted to the server — excluded from the diff sent on save.
  categoryFilterId: string | null
  // Display-only name of the product's category, seeded from the saved row so
  // the combined picker can show it before the user touches the row.
  categoryFilterName: string | null
}

type TemplateMaterialItemsLocalState = {
  items: TemplateMaterialItemLocal[]
}

function toLocalItem(row: TemplateMaterialItemRow): TemplateMaterialItemLocal {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.productName,
    unitId: row.unitId,
    sendUnitName: row.sendUnitName,
    sendUnitAbbrev: row.sendUnitAbbrev,
    quantity: row.quantity,
    notes: row.notes,
    categoryFilterId: null,
    categoryFilterName: row.categoryName || null,
  }
}

function createLocalState(record: TemplateDetail): TemplateMaterialItemsLocalState {
  return { items: record.items.map(toLocalItem) }
}

function createItemsRevisionKey(record: TemplateDetail) {
  return JSON.stringify(
    record.items.map((row) => `${row.id}:${row.productId}:${row.unitId}:${row.quantity}:${row.notes}`),
  )
}

function itemsDiffer(local: TemplateMaterialItemLocal, server: TemplateMaterialItemRow) {
  return (
    local.productId !== server.productId ||
    local.unitId !== server.unitId ||
    local.quantity !== server.quantity ||
    local.notes !== server.notes
  )
}

function toDiffForm(local: TemplateMaterialItemLocal): TemplateMaterialItemForm {
  return {
    productId: local.productId,
    unitId: local.unitId,
    quantity: local.quantity,
    notes: local.notes,
  }
}

function buildDiff(
  local: TemplateMaterialItemsLocalState,
  server: TemplateDetail,
): TemplateMaterialItemsDiff {
  // Add appends at the bottom (no reverseAdded), matching the section policy.
  return buildRowDiff({
    locals: local.items,
    serverRows: server.items,
    getLocalId: (item) => item.id,
    isLocalOnly: isLocalOnlyRecordRow,
    differs: itemsDiffer,
    toAdded: (item) => ({ tempId: item.id, form: toDiffForm(item) }),
    toModified: (item) => ({ id: item.id, form: toDiffForm(item) }),
  })
}

export function useTemplateMaterialItemsSection({
  template,
  publishTemplate,
}: {
  template: TemplateDetail
  publishTemplate: (record: TemplateDetail) => void
}) {
  const section = useRecordScopedSectionController<TemplateDetail, TemplateMaterialItemsLocalState>({
    recordId: template.id,
    sectionKey: "material-items",
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
        const validationError = validateTemplateMaterialItemForm(toDiffForm(item))
        if (validationError) {
          throw createRecordSectionError({
            kind: "validation",
            message: validationError,
            retryable: true,
          })
        }
      }

      const diff = buildDiff(localValue, currentRecord)
      const { template: nextTemplate } = await saveTemplateMaterialItemsSectionRequest(
        template.id,
        diff,
        template.updatedAt,
      )

      publishTemplate(nextTemplate)

      return {
        serverValue: nextTemplate,
        serverRevisionKey: createItemsRevisionKey(nextTemplate),
        noticeMessage: "Material items saved",
      }
    },
  })

  function addItem() {
    section.setLocalValue((previous) => ({
      items: [
        ...previous.items,
        {
          id: createLocalRecordRowId("template-material-item"),
          productId: "",
          productName: "",
          unitId: "",
          sendUnitName: "",
          sendUnitAbbrev: "",
          quantity: "",
          notes: "",
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
    field: keyof TemplateMaterialItemLocal,
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
        if (option === null) {
          return { ...row, productName: "", unitId: "", sendUnitName: "", sendUnitAbbrev: "" }
        }
        // Re-seed the unit FK from the picked product (UoM epic 2C); the unit
        // stays editable afterward.
        return {
          ...row,
          productName: option.name,
          unitId: option.unitId,
          sendUnitName: option.sendUnitName,
          sendUnitAbbrev: option.sendUnitAbbrev,
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
          ? {
              ...row,
              unitId: option?.id ?? "",
              sendUnitName: option?.name ?? "",
              sendUnitAbbrev: option?.abbreviation ?? "",
            }
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
