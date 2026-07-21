import { toIsoTimestamp } from "../../shared/date-format.js"
import { normalizeMoneyAmount } from "../../shared/money.js"
import type { FlooringPaymentDirection } from "../../payments/types.js"
import type { PaletteColor } from "../../shared/palette.js"
import type { TemplatePlannedPaymentRow } from "./types.js"

type TemplatePlannedPaymentInput = {
  id: string
  amount: { toString(): string }
  direction: FlooringPaymentDirection
  notes: string | null
  entityId: string | null
  // Nested entity relation (from `entityTypeSelect` in the data layer); flattened
  // here to entityName + entityType. Absent/null on unlinked rows.
  entity?: {
    entity: string
    entityType: { id: string; type: string; color: PaletteColor } | null
  } | null
  paymentPurposeId: string | null
  // Nested payment-purpose relation; flattened here to name + color. Absent/null
  // on unlinked rows.
  paymentPurpose?: { name: string; color: PaletteColor } | null
  createdAt: Date | string
  updatedAt: Date | string
  createdBy: string | null
  updatedBy: string | null
}

export function normalizeTemplatePlannedPayment(
  item: TemplatePlannedPaymentInput,
): TemplatePlannedPaymentRow {
  return {
    id: item.id,
    // Normalize on read so the row always carries a canonical "X.XX" string.
    // Prisma's Decimal.toString() drops trailing zeros ("10"), but MoneyCell pads
    // local state to "10.00" on blur — without this the FE's itemsDiffer would
    // flag every saved row as still-dirty.
    amount: normalizeMoneyAmount(item.amount.toString()),
    direction: item.direction,
    notes: item.notes ?? "",
    entityId: item.entityId ?? null,
    // Flatten the nested entity join into the flat read-only display fields
    // (mirrors the planned-product product/unit flatten).
    entityName: item.entity?.entity ?? null,
    entityType: item.entity?.entityType ?? null,
    paymentPurposeId: item.paymentPurposeId ?? null,
    paymentPurposeName: item.paymentPurpose?.name ?? null,
    paymentPurposeColor: item.paymentPurpose?.color ?? null,
    createdAt: toIsoTimestamp(item.createdAt),
    updatedAt: toIsoTimestamp(item.updatedAt),
    createdBy: item.createdBy ?? null,
    updatedBy: item.updatedBy ?? null,
  }
}
