import { DEFAULT_PALETTE_COLOR, type PaletteColor } from "../shared/palette.js"
import type { TemplatePlannedProductRow } from "./planned-products/types.js"
import type { TemplatePlannedPaymentRow } from "./planned-payments/types.js"
import type { TemplateEntityInvolvementRow } from "./entity-involvement/types.js"
import type { TemplateServiceItemRow } from "./service-items/types.js"
import type { TemplateCommissionRow } from "./commissions/types.js"

export type TemplateListRow = {
  id: string
  templateNumber: string
  // Non-semantic palette tag (user-assigned visual color). Metadata-only — no
  // business logic reads it. Defaults to SLATE; only the record-view edit form sets it.
  color: PaletteColor
  unitType: string
  customerName: string
  description: string
  // Manually-entered transaction total — canonical money string ("" = unset).
  // Normalized on read so dirty-checks compare stable strings. List-visible.
  totalTransaction: string
  // Manually-entered sales-tax rate as a percent string ("8.375"; "" = unset).
  // Normalized to scale-3 on read. Drives the derived Tax Cost roll-up.
  taxRate: string
  propertyId: string | null
  propertyName: string
  entityId: string | null
  entityName: string | null
  jobTypeId: string | null
  jobTypeName: string | null
  warehouseId: string | null
  warehouseName: string
  plannedProductsCount: number
  createdAt: string
  updatedAt: string
  // Actor-email snapshots: WHO created / last-updated the row. Plain nullable
  // strings (no FK), null on historical rows. Mirrors job-types / payments /
  // warehouse / products / properties.
  createdBy: string | null
  updatedBy: string | null
}

/**
 * An adjacent template in the global template-number sequence
 * (`templateNumberInt`). Carries only `id` — the record-view stepper navigates
 * straight to the neighbor record by number; it does not drive the
 * entity→Property→Template cascade. Null at the ends of the sequence.
 */
export type TemplateNeighbor = {
  id: string
}

export type TemplateDetail = TemplateListRow & {
  internalNotes: string
  installerInstructions: string
  propertyStreetAddress: string
  propertyCity: string
  propertyState: string
  propertyPostalCode: string
  propertyInstructions: string
  plannedProducts: TemplatePlannedProductRow[]
  // Service / miscellaneous line items — same "products" record section as planned
  // products (one Save envelope). Read as an array by the record view. cost is a
  // manual persisted column here (not a live product join).
  serviceItems: TemplateServiceItemRow[]
  // Planned payments on the template — the §3 payment plan (own table). Read as an
  // array by the record view; no count surfaced. Entity link arrives in a later pass.
  plannedPayments: TemplatePlannedPaymentRow[]
  // Entity-involvement rows — optional entity link + free-text involvement type.
  // Read as an array by the record view; carries forward to a synced work order.
  entityInvolvements: TemplateEntityInvolvementRow[]
  // Sales-rep commission rows — 3rd grid in the "products" section (optional entity
  // link + manual percent). Read as an array by the record view; template-only (does
  // NOT carry into a synced work order).
  commissions: TemplateCommissionRow[]
  /**
   * Neighbors by global template-number order (`templateNumberInt`), ignoring
   * property/entity filters — powers the record-view shell stepper (◀ TP-# ▶). Null
   * when the current row is at the start/end of the sequence.
   */
  previousTemplate: TemplateNeighbor | null
  nextTemplate: TemplateNeighbor | null
}

export type TemplateOption = {
  id: string
  unitType: string
  jobTypeName: string | null
  description: string | null
  plannedProductsCount: number
}

export type TemplateForm = {
  propertyId: string
  jobTypeId: string
  warehouseId: string
  unitType: string
  customerName: string
  description: string
  internalNotes: string
  installerInstructions: string
  // Manually-entered transaction total (money-as-string; "" = unset). Edited via a
  // MoneyCell on the primary section; saved with the parent update.
  totalTransaction: string
  // Manually-entered sales-tax rate (percent-as-string; "" = unset). Edited via a
  // NumberCell in the primary totals area; saved with the parent update.
  taxRate: string
  // Non-semantic palette tag. Carried on the draft so the record-view edit form
  // can re-pick it; the create flow renders no picker and the create API validator
  // ignores it, so new rows fall to the DB default SLATE.
  color: PaletteColor
}

export const EMPTY_TEMPLATE_FORM: TemplateForm = {
  propertyId: "",
  jobTypeId: "",
  warehouseId: "",
  unitType: "",
  customerName: "",
  description: "",
  internalNotes: "",
  installerInstructions: "",
  totalTransaction: "",
  taxRate: "",
  color: DEFAULT_PALETTE_COLOR,
}
