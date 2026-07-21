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
  TemplateServiceItemForm,
  TemplateServiceItemRow,
  TemplateServiceItemsDiff,
  UnitOfMeasureOption,
} from "@builders/domain"
import {
  validateTemplatePlannedProductForm,
  validateTemplateServiceItemForm,
} from "@builders/domain"
import { saveTemplateProductsSectionRequest } from "@/modules/templates/data/mutations"

// ── Planned products (table 1) ─────────────────────────────────────────────

export type TemplatePlannedProductLocal = {
  id: string
  productId: string
  // Display-only snapshots seeded from the saved row's joined fields and
  // refreshed when the user picks a new product. Never sent in the diff — server
  // re-normalizes from the live product table on save.
  productName: string
  // Editable unit FK (UoM epic 2C) — seeded from the product on select, then
  // freely editable; sent in the diff. `unitName` feeds the picker's trigger
  // label, `unitAbbrev` the quantity-cell suffix.
  unitId: string
  unitName: string
  unitAbbrev: string
  quantity: string
  notes: string
  // LIVE cost read-joined off the product (seeded from the picked ProductOption
  // for unsaved rows; re-resolved server-side on save). Display only — NEVER sent
  // in the diff. This is the "bid cost".
  productCost: string
  // Persisted job-costing money columns (all sent in the diff). `unitPrice` seeds
  // from the product on select but stays editable; tax + freight are manual.
  unitPrice: string
  tax: string
  freight: string
  // Client-only ergonomic for narrowing the row's product picker. NOT persisted.
  categoryFilterId: string | null
  categoryFilterName: string | null
}

// ── Service / misc items (table 2) ─────────────────────────────────────────

export type TemplateServiceItemLocal = {
  id: string
  // Free-text classification + label (no enum). "" = unset.
  itemType: string
  itemName: string
  quantity: string
  // Editable unit FK — sent in the diff. `unitName`/`unitAbbrev` are display-only.
  unitId: string
  unitName: string
  unitAbbrev: string
  // MANUAL persisted bid cost (the key divergence from planned products, where bid
  // cost is a live product join). Editable money, sent in the diff.
  bidCost: string
  unitPrice: string
  tax: string
  freight: string
}

type TemplateProductsLocalState = {
  plannedProducts: TemplatePlannedProductLocal[]
  serviceItems: TemplateServiceItemLocal[]
}

// ── Local mappers ──────────────────────────────────────────────────────────

function toPlannedLocal(row: TemplatePlannedProductRow): TemplatePlannedProductLocal {
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
    unitPrice: row.unitPrice,
    tax: row.tax,
    freight: row.freight,
    categoryFilterId: null,
    categoryFilterName: row.categoryName || null,
  }
}

function toServiceLocal(row: TemplateServiceItemRow): TemplateServiceItemLocal {
  return {
    id: row.id,
    itemType: row.itemType,
    itemName: row.itemName,
    quantity: row.quantity,
    unitId: row.unitId,
    unitName: row.unitName,
    unitAbbrev: row.unitAbbrev,
    bidCost: row.bidCost,
    unitPrice: row.unitPrice,
    tax: row.tax,
    freight: row.freight,
  }
}

function createLocalState(record: TemplateDetail): TemplateProductsLocalState {
  return {
    plannedProducts: record.plannedProducts.map(toPlannedLocal),
    serviceItems: record.serviceItems.map(toServiceLocal),
  }
}

function createItemsRevisionKey(record: TemplateDetail) {
  return JSON.stringify({
    // productCost is a live join — include it so an external product-cost change
    // re-seeds the local cost display.
    plannedProducts: record.plannedProducts.map(
      (row) =>
        `${row.id}:${row.productId}:${row.unitId}:${row.quantity}:${row.notes}:${row.productCost}:${row.unitPrice}:${row.tax}:${row.freight}`,
    ),
    serviceItems: record.serviceItems.map(
      (row) =>
        `${row.id}:${row.itemType}:${row.itemName}:${row.quantity}:${row.unitId}:${row.bidCost}:${row.unitPrice}:${row.tax}:${row.freight}`,
    ),
  })
}

// ── Diff builders ──────────────────────────────────────────────────────────

function plannedDiffers(local: TemplatePlannedProductLocal, server: TemplatePlannedProductRow) {
  return (
    local.productId !== server.productId ||
    local.unitId !== server.unitId ||
    local.quantity !== server.quantity ||
    local.unitPrice !== server.unitPrice ||
    local.tax !== server.tax ||
    local.freight !== server.freight ||
    local.notes !== server.notes
  )
}

function toPlannedForm(local: TemplatePlannedProductLocal): TemplatePlannedProductForm {
  return {
    productId: local.productId,
    unitId: local.unitId,
    quantity: local.quantity,
    unitPrice: local.unitPrice,
    tax: local.tax,
    freight: local.freight,
    notes: local.notes,
  }
}

function buildPlannedDiff(
  locals: TemplatePlannedProductLocal[],
  server: TemplateDetail,
): TemplatePlannedProductsDiff {
  return buildRowDiff({
    locals,
    serverRows: server.plannedProducts,
    getLocalId: (item) => item.id,
    isLocalOnly: isLocalOnlyRecordRow,
    differs: plannedDiffers,
    toAdded: (item) => ({ tempId: item.id, form: toPlannedForm(item) }),
    toModified: (item) => ({ id: item.id, form: toPlannedForm(item) }),
  })
}

function serviceDiffers(local: TemplateServiceItemLocal, server: TemplateServiceItemRow) {
  return (
    local.itemType !== server.itemType ||
    local.itemName !== server.itemName ||
    local.quantity !== server.quantity ||
    local.unitId !== server.unitId ||
    local.bidCost !== server.bidCost ||
    local.unitPrice !== server.unitPrice ||
    local.tax !== server.tax ||
    local.freight !== server.freight
  )
}

function toServiceForm(local: TemplateServiceItemLocal): TemplateServiceItemForm {
  return {
    itemType: local.itemType,
    itemName: local.itemName,
    quantity: local.quantity,
    unitId: local.unitId,
    bidCost: local.bidCost,
    unitPrice: local.unitPrice,
    tax: local.tax,
    freight: local.freight,
  }
}

function buildServiceDiff(
  locals: TemplateServiceItemLocal[],
  server: TemplateDetail,
): TemplateServiceItemsDiff {
  return buildRowDiff({
    locals,
    serverRows: server.serviceItems,
    getLocalId: (item) => item.id,
    isLocalOnly: isLocalOnlyRecordRow,
    differs: serviceDiffers,
    toAdded: (item) => ({ tempId: item.id, form: toServiceForm(item) }),
    toModified: (item) => ({ id: item.id, form: toServiceForm(item) }),
  })
}

// ── Controller ─────────────────────────────────────────────────────────────

export function useTemplateProductsSection({
  template,
  publishTemplate,
}: {
  template: TemplateDetail
  publishTemplate: (record: TemplateDetail) => void
}) {
  const section = useRecordScopedSectionController<TemplateDetail, TemplateProductsLocalState>({
    recordId: template.id,
    sectionKey: "products",
    serverValue: template,
    serverRevisionKey: createItemsRevisionKey(template),
    createLocalValue: createLocalState,
    persistDraft: false,
    policy: {
      addRowPlacement: "bottom",
      childRows: "inline",
    },
    onSave: async (localValue, currentRecord) => {
      for (const item of localValue.plannedProducts) {
        const validationError = validateTemplatePlannedProductForm(toPlannedForm(item))
        if (validationError) {
          throw createRecordSectionError({ kind: "validation", message: validationError, retryable: true })
        }
      }
      for (const item of localValue.serviceItems) {
        const validationError = validateTemplateServiceItemForm(toServiceForm(item))
        if (validationError) {
          throw createRecordSectionError({ kind: "validation", message: validationError, retryable: true })
        }
      }

      // Both tables ride ONE atomic PATCH so a single Save is all-or-nothing
      // across both grids (and one round-trip). (Child writes don't bump the
      // parent template.updatedAt, so this isn't about token-staleness.)
      const { template: nextTemplate } = await saveTemplateProductsSectionRequest(
        template.id,
        {
          plannedProducts: buildPlannedDiff(localValue.plannedProducts, currentRecord),
          serviceItems: buildServiceDiff(localValue.serviceItems, currentRecord),
        },
        template.updatedAt,
      )

      publishTemplate(nextTemplate)

      return {
        serverValue: nextTemplate,
        serverRevisionKey: createItemsRevisionKey(nextTemplate),
        noticeMessage: "Products saved",
      }
    },
  })

  // ── Planned-product mutators ──────────────────────────────────────────────

  function addPlannedItem() {
    section.setLocalValue((previous) => ({
      ...previous,
      plannedProducts: [
        ...previous.plannedProducts,
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
          unitPrice: "",
          tax: "",
          freight: "",
          categoryFilterId: null,
          categoryFilterName: null,
        },
      ],
    }))
    section.setError(null)
  }

  function removePlannedItem(itemId: string) {
    section.setLocalValue((previous) => ({
      ...previous,
      plannedProducts: previous.plannedProducts.filter((row) => row.id !== itemId),
    }))
    section.setError(null)
  }

  function changePlannedField(itemId: string, field: keyof TemplatePlannedProductLocal, value: string) {
    section.setLocalValue((previous) => ({
      ...previous,
      plannedProducts: previous.plannedProducts.map((row) =>
        row.id === itemId ? { ...row, [field]: value } : row,
      ),
    }))
    if (section.error) section.setError(null)
  }

  function changePlannedQuantity(itemId: string, value: string) {
    section.setLocalValue((previous) => ({
      ...previous,
      plannedProducts: previous.plannedProducts.map((row) =>
        row.id === itemId ? { ...row, quantity: value } : row,
      ),
    }))
    if (section.error) section.setError(null)
  }

  // Client-only ergonomic — does NOT mark the section dirty (excluded from the
  // planned diff). ProductCategoryPicker clears the selected product on change.
  function changeCategoryFilter(itemId: string, categoryId: string | null) {
    section.setLocalValue((previous) => ({
      ...previous,
      plannedProducts: previous.plannedProducts.map((row) =>
        row.id === itemId ? { ...row, categoryFilterId: categoryId } : row,
      ),
    }))
  }

  function setProductSnapshot(itemId: string, option: ProductOption | null) {
    section.setLocalValue((previous) => ({
      ...previous,
      plannedProducts: previous.plannedProducts.map((row) => {
        if (row.id !== itemId) return row
        const seeded = applyUnitSeed(
          row,
          option && { unitId: option.unitId, unitName: option.unitName, unitAbbrev: option.unitAbbrev },
          { nameKey: "unitName", abbrevKey: "unitAbbrev" },
        )
        return {
          ...seeded,
          productName: option?.name ?? "",
          productCost: option?.cost ?? "",
          unitPrice: option?.unitPrice ?? "",
        }
      }),
    }))
  }

  function setPlannedUnit(itemId: string, option: UnitOfMeasureOption | null) {
    section.setLocalValue((previous) => ({
      ...previous,
      plannedProducts: previous.plannedProducts.map((row) =>
        row.id === itemId
          ? applyUnitSeed(
              row,
              option && { unitId: option.id, unitName: option.name, unitAbbrev: option.abbreviation },
              { nameKey: "unitName", abbrevKey: "unitAbbrev" },
            )
          : row,
      ),
    }))
    if (section.error) section.setError(null)
  }

  // ── Service-item mutators ─────────────────────────────────────────────────

  function addServiceItem() {
    section.setLocalValue((previous) => ({
      ...previous,
      serviceItems: [
        ...previous.serviceItems,
        {
          id: createLocalRecordRowId("template-service-item"),
          itemType: "",
          itemName: "",
          quantity: "",
          unitId: "",
          unitName: "",
          unitAbbrev: "",
          bidCost: "",
          unitPrice: "",
          tax: "",
          freight: "",
        },
      ],
    }))
    section.setError(null)
  }

  function removeServiceItem(itemId: string) {
    section.setLocalValue((previous) => ({
      ...previous,
      serviceItems: previous.serviceItems.filter((row) => row.id !== itemId),
    }))
    section.setError(null)
  }

  function changeServiceField(itemId: string, field: keyof TemplateServiceItemLocal, value: string) {
    section.setLocalValue((previous) => ({
      ...previous,
      serviceItems: previous.serviceItems.map((row) =>
        row.id === itemId ? { ...row, [field]: value } : row,
      ),
    }))
    if (section.error) section.setError(null)
  }

  function changeServiceQuantity(itemId: string, value: string) {
    section.setLocalValue((previous) => ({
      ...previous,
      serviceItems: previous.serviceItems.map((row) =>
        row.id === itemId ? { ...row, quantity: value } : row,
      ),
    }))
    if (section.error) section.setError(null)
  }

  function setServiceUnit(itemId: string, option: UnitOfMeasureOption | null) {
    section.setLocalValue((previous) => ({
      ...previous,
      serviceItems: previous.serviceItems.map((row) =>
        row.id === itemId
          ? applyUnitSeed(
              row,
              option && { unitId: option.id, unitName: option.name, unitAbbrev: option.abbreviation },
              { nameKey: "unitName", abbrevKey: "unitAbbrev" },
            )
          : row,
      ),
    }))
    if (section.error) section.setError(null)
  }

  return {
    ...section,
    plannedItems: section.localValue.plannedProducts,
    serviceItems: section.localValue.serviceItems,
    addPlannedItem,
    removePlannedItem,
    changePlannedField,
    changePlannedQuantity,
    changeCategoryFilter,
    setProductSnapshot,
    setPlannedUnit,
    addServiceItem,
    removeServiceItem,
    changeServiceField,
    changeServiceQuantity,
    setServiceUnit,
  }
}
