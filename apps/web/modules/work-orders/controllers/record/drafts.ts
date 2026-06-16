import type { UpdateWorkOrderUseCaseInput } from "@builders/application"
import {
  validateWorkOrderForm as domainValidateWorkOrderForm,
  type WorkOrderDetail,
  type WorkOrderForm,
  type WorkOrderMaterialItemRow,
} from "@builders/domain"

export type WorkOrderRecordEntry = WorkOrderDetail

export type PropertyOption = {
  id: string
  label: string
  streetAddress: string
  city: string
  state: string
  postalCode: string
  instructions: string
}
export type WarehouseOption = { id: string; name: string }
export type JobTypeOption = { id: string; name: string }
export type ManagementCompanyOption = { id: string; name: string }
export type ProductOption = {
  id: string
  label: string
  categoryId: string
  sendUnitAbbrev: string
  stockUnitAbbrev: string
}
export type CategoryOption = { id: string; label: string }

/**
 * Local draft for a material-item row in the section's diff state.
 * `clientId` is the React-state key (preserved across re-renders).
 * `tempId` is sent to the server only for new (added) rows so the
 * producer-stamped UUID can be reconciled back via `tempIdMap`.
 *
 * `categoryFilterId` is a per-row UI-only filter for the product
 * dropdown — never sent to the server.
 */
export type WorkOrderMaterialItemDraft = {
  clientId: string
  serverId: string | null
  tempId: string | null
  productId: string
  quantity: string
  notes: string
  categoryFilterId: string | null
  // Snapshot fields surfaced for display only — no user input.
  sendUnitAbbrev: string
  status: WorkOrderMaterialItemRow["status"]
  isNew: boolean
}

export function createWorkOrderMaterialItemDraft(
  row?: WorkOrderMaterialItemRow,
): WorkOrderMaterialItemDraft {
  if (!row) {
    return {
      clientId: crypto.randomUUID(),
      serverId: null,
      tempId: crypto.randomUUID(),
      productId: "",
      quantity: "",
      notes: "",
      categoryFilterId: null,
      sendUnitAbbrev: "",
      status: "IDLE",
      isNew: true,
    }
  }
  return {
    clientId: row.id,
    serverId: row.id,
    tempId: null,
    productId: row.productId,
    quantity: row.quantity,
    notes: row.notes,
    categoryFilterId: null,
    sendUnitAbbrev: row.sendUnitAbbrev,
    status: row.status,
    isNew: false,
  }
}

export function toWorkOrderMaterialItemDrafts(
  rows: WorkOrderMaterialItemRow[],
): WorkOrderMaterialItemDraft[] {
  return rows.map((row) => createWorkOrderMaterialItemDraft(row))
}

export function validateWorkOrderPrimaryForm(input: WorkOrderForm): string {
  return domainValidateWorkOrderForm(input)
}

/**
 * Converts the local `WorkOrderForm` (string-only fields with empty
 * strings to mean "blank") into the wire shape the API + use case
 * expect. Maps `""` to `null` for nullable fields, parses
 * `scheduledFor` into a `Date | null`.
 */
export function toUpdateWorkOrderInput(form: WorkOrderForm): UpdateWorkOrderUseCaseInput {
  const scheduledFor = form.scheduledFor
    ? (() => {
        const parsed = new Date(form.scheduledFor)
        return Number.isNaN(parsed.getTime()) ? null : parsed
      })()
    : null

  return {
    propertyId: form.propertyId || null,
    warehouseId: form.warehouseId || undefined,
    templateId: form.templateId || null,
    jobTypeId: form.jobTypeId || null,
    statusId: form.statusId || null,
    unitNumber: form.unitNumber,
    unitType: form.unitType,
    customAddress: form.customAddress,
    description: form.description,
    internalNotes: form.internalNotes,
    installerInstructions: form.installerInstructions,
    scheduledFor,
    vacancy: form.vacancy === "" ? null : form.vacancy,
    timeOfDay: form.timeOfDay === "" ? null : form.timeOfDay,
  }
}

export function validateWorkOrderMaterialItemDrafts(
  drafts: WorkOrderMaterialItemDraft[],
): string {
  for (const [index, draft] of drafts.entries()) {
    if (!draft.productId.trim()) {
      return `Row ${index + 1}: product is required.`
    }
    const quantity = Number(draft.quantity)
    if (!draft.quantity.trim() || !Number.isFinite(quantity) || quantity <= 0) {
      return `Row ${index + 1}: quantity must be greater than zero.`
    }
  }
  return ""
}

/**
 * Local draft for a pending adjustment under a single WOMI.
 */
export type PendingAdjustmentDraft = {
  clientId: string
  serverId: string | null
  tempId: string | null
  inventoryId: string
  cut: string
  isWaste: boolean
  notes: string
  expectedUpdatedAt: string | null
  isNew: boolean
  // UI-only — narrows the inventory dropdown to a chosen location.
  locationFilterCode: string
}

export function createPendingAdjustmentDraft(): PendingAdjustmentDraft {
  return {
    clientId: crypto.randomUUID(),
    serverId: null,
    tempId: crypto.randomUUID(),
    inventoryId: "",
    cut: "",
    isWaste: false,
    notes: "",
    expectedUpdatedAt: null,
    isNew: true,
    locationFilterCode: "",
  }
}
