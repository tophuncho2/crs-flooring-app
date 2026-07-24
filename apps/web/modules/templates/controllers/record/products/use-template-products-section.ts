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
  EntityOption,
  ProductOption,
  TemplateCommissionForm,
  TemplateCommissionRow,
  TemplateCommissionsDiff,
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
  DEFAULT_SERVICE_ITEM_TYPE,
  sumTemplatePlannedProductLineTotals,
  validateTemplateCommissionForm,
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
  // Whether this line is taxed (feeds the Tax Cost roll-up). Sent in the diff.
  taxed: boolean
  // LIVE cost read-joined off the product (seeded from the picked ProductOption
  // for unsaved rows; re-resolved server-side on save). Display only — NEVER sent
  // in the diff. This is the "cost" and the per-unit basis for the line total.
  productCost: string
  // Client-only ergonomic for narrowing the row's product picker. NOT persisted.
  categoryFilterId: string | null
  categoryFilterName: string | null
}

// ── Service / misc items (table 2) ─────────────────────────────────────────

export type TemplateServiceItemLocal = {
  id: string
  // Required classification enum (ServiceItemType member) — never "". Seeded to the
  // default on add; edited via the Labor / Miscellaneous dropdown.
  itemType: string
  itemName: string
  quantity: string
  // Editable unit FK — sent in the diff. `unitName`/`unitAbbrev` are display-only.
  unitId: string
  unitName: string
  unitAbbrev: string
  // MANUAL persisted cost (the key divergence from planned products, where cost
  // is a live product join). Editable money, sent in the diff. It is the
  // per-unit basis for the line total.
  cost: string
  // Whether this line is taxed (feeds the Tax Cost roll-up). Sent in the diff.
  taxed: boolean
}

// ── Commissions (table 3) ──────────────────────────────────────────────────

export type TemplateCommissionLocal = {
  id: string
  // Optional entity link (null = unlinked) — the sales rep. The only writable/diffed
  // link field.
  entityId: string | null
  // Read-only hydration co-located with entityId so the picker's selectedLabel never
  // desyncs from the id. Never sent on save; seeded on load, snapshotted on pick.
  entityName: string | null
  // Manual scale-3 percent ("" = unset). Sent in the diff. The per-row basis for the
  // line total (× Net Cost).
  percent: string
}

type TemplateProductsLocalState = {
  plannedProducts: TemplatePlannedProductLocal[]
  serviceItems: TemplateServiceItemLocal[]
  commissions: TemplateCommissionLocal[]
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
    taxed: row.taxed,
    productCost: row.productCost,
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
    cost: row.cost,
    taxed: row.taxed,
  }
}

function toCommissionLocal(row: TemplateCommissionRow): TemplateCommissionLocal {
  return {
    id: row.id,
    entityId: row.entityId,
    entityName: row.entityName,
    percent: row.percent,
  }
}

function createLocalState(record: TemplateDetail): TemplateProductsLocalState {
  return {
    plannedProducts: record.plannedProducts.map(toPlannedLocal),
    serviceItems: record.serviceItems.map(toServiceLocal),
    commissions: record.commissions.map(toCommissionLocal),
  }
}

function createItemsRevisionKey(record: TemplateDetail) {
  return JSON.stringify({
    // productCost is a live join — include it so an external product-cost change
    // re-seeds the local cost display.
    plannedProducts: record.plannedProducts.map(
      (row) =>
        `${row.id}:${row.productId}:${row.unitId}:${row.quantity}:${row.notes}:${row.taxed}:${row.productCost}`,
    ),
    serviceItems: record.serviceItems.map(
      (row) =>
        `${row.id}:${row.itemType}:${row.itemName}:${row.quantity}:${row.unitId}:${row.cost}:${row.taxed}`,
    ),
    commissions: record.commissions.map(
      (row) => `${row.id}:${row.entityId}:${row.percent}`,
    ),
  })
}

// ── Diff builders ──────────────────────────────────────────────────────────

function plannedDiffers(local: TemplatePlannedProductLocal, server: TemplatePlannedProductRow) {
  return (
    local.productId !== server.productId ||
    local.unitId !== server.unitId ||
    local.quantity !== server.quantity ||
    local.notes !== server.notes ||
    local.taxed !== server.taxed
  )
}

function toPlannedForm(local: TemplatePlannedProductLocal): TemplatePlannedProductForm {
  return {
    productId: local.productId,
    unitId: local.unitId,
    quantity: local.quantity,
    notes: local.notes,
    taxed: local.taxed,
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
    local.cost !== server.cost ||
    local.taxed !== server.taxed
  )
}

function toServiceForm(local: TemplateServiceItemLocal): TemplateServiceItemForm {
  return {
    itemType: local.itemType,
    itemName: local.itemName,
    quantity: local.quantity,
    unitId: local.unitId,
    cost: local.cost,
    taxed: local.taxed,
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

function commissionDiffers(local: TemplateCommissionLocal, server: TemplateCommissionRow) {
  return local.entityId !== server.entityId || local.percent !== server.percent
}

function toCommissionForm(local: TemplateCommissionLocal): TemplateCommissionForm {
  return {
    // Only the writable link — entityName is display hydration and must never enter
    // the diff form.
    entityId: local.entityId,
    percent: local.percent,
  }
}

function buildCommissionDiff(
  locals: TemplateCommissionLocal[],
  server: TemplateDetail,
): TemplateCommissionsDiff {
  return buildRowDiff({
    locals,
    serverRows: server.commissions,
    getLocalId: (item) => item.id,
    isLocalOnly: isLocalOnlyRecordRow,
    differs: commissionDiffers,
    toAdded: (item) => ({ tempId: item.id, form: toCommissionForm(item) }),
    toModified: (item) => ({ id: item.id, form: toCommissionForm(item) }),
  })
}

// Live Net Cost = Σ of every planned-product + service-item line total, computed
// directly from the current local rows (the commission line total is a % of this).
// Planned products use their live productCost as the per-unit basis; service items
// use the manual cost. Mirrors the domain ledger's Net Cost, on unsaved edits.
function computeLiveNetCost(state: TemplateProductsLocalState): string {
  return sumTemplatePlannedProductLineTotals([
    ...state.plannedProducts.map((row) => ({ quantity: row.quantity, cost: row.productCost })),
    ...state.serviceItems.map((row) => ({ quantity: row.quantity, cost: row.cost })),
  ])
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
      for (const item of localValue.commissions) {
        const validationError = validateTemplateCommissionForm(toCommissionForm(item))
        if (validationError) {
          throw createRecordSectionError({ kind: "validation", message: validationError, retryable: true })
        }
      }

      // All three tables ride ONE atomic PATCH so a single Save is all-or-nothing
      // across every grid (and one round-trip). (Child writes don't bump the
      // parent template.updatedAt, so this isn't about token-staleness.)
      const { template: nextTemplate } = await saveTemplateProductsSectionRequest(
        template.id,
        {
          plannedProducts: buildPlannedDiff(localValue.plannedProducts, currentRecord),
          serviceItems: buildServiceDiff(localValue.serviceItems, currentRecord),
          commissions: buildCommissionDiff(localValue.commissions, currentRecord),
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
          taxed: true,
          productCost: "",
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

  // Dedicated boolean setter — the generic `changePlannedField` is string-typed.
  function changePlannedTaxed(itemId: string, next: boolean) {
    section.setLocalValue((previous) => ({
      ...previous,
      plannedProducts: previous.plannedProducts.map((row) =>
        row.id === itemId ? { ...row, taxed: next } : row,
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
          itemType: DEFAULT_SERVICE_ITEM_TYPE,
          itemName: "",
          quantity: "",
          unitId: "",
          unitName: "",
          unitAbbrev: "",
          cost: "",
          taxed: false,
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

  // Dedicated boolean setter — the generic `changeServiceField` is string-typed.
  function changeServiceTaxed(itemId: string, next: boolean) {
    section.setLocalValue((previous) => ({
      ...previous,
      serviceItems: previous.serviceItems.map((row) =>
        row.id === itemId ? { ...row, taxed: next } : row,
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

  // ── Commission mutators ───────────────────────────────────────────────────

  function addCommission() {
    section.setLocalValue((previous) => ({
      ...previous,
      commissions: [
        ...previous.commissions,
        {
          id: createLocalRecordRowId("template-commission"),
          entityId: null,
          entityName: null,
          percent: "",
        },
      ],
    }))
    section.setError(null)
  }

  function removeCommission(itemId: string) {
    section.setLocalValue((previous) => ({
      ...previous,
      commissions: previous.commissions.filter((row) => row.id !== itemId),
    }))
    section.setError(null)
  }

  function changeCommissionField(
    itemId: string,
    field: keyof TemplateCommissionLocal,
    value: string,
  ) {
    section.setLocalValue((previous) => ({
      ...previous,
      commissions: previous.commissions.map((row) =>
        row.id === itemId ? { ...row, [field]: value } : row,
      ),
    }))
    if (section.error) section.setError(null)
  }

  // Snapshot the picked entity's id + name into the row atomically, so selectedLabel
  // populates instantly with no server round-trip and never desyncs from entityId.
  // Null clears the link.
  function selectCommissionEntity(itemId: string, option: EntityOption | null) {
    section.setLocalValue((previous) => ({
      ...previous,
      commissions: previous.commissions.map((row) =>
        row.id === itemId
          ? {
              ...row,
              entityId: option?.id ?? null,
              entityName: option?.entity ?? null,
            }
          : row,
      ),
    }))
    if (section.error) section.setError(null)
  }

  // Live Net Cost — the shared per-unit basis every commission line total is a
  // percent of. Recomputed from the current planned + service local rows.
  const commissionNetCost = computeLiveNetCost(section.localValue)

  return {
    ...section,
    plannedItems: section.localValue.plannedProducts,
    serviceItems: section.localValue.serviceItems,
    commissions: section.localValue.commissions,
    commissionNetCost,
    addPlannedItem,
    removePlannedItem,
    changePlannedField,
    changePlannedQuantity,
    changePlannedTaxed,
    changeCategoryFilter,
    setProductSnapshot,
    setPlannedUnit,
    addServiceItem,
    removeServiceItem,
    changeServiceField,
    changeServiceQuantity,
    changeServiceTaxed,
    setServiceUnit,
    addCommission,
    removeCommission,
    changeCommissionField,
    selectCommissionEntity,
  }
}
