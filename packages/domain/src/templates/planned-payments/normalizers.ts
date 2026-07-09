import { normalizeMoneyAmount } from "../../shared/money.js"
import type { FlooringPaymentDirection } from "../../payments/types.js"
import type { PaletteColor } from "../../shared/palette.js"
import type { TemplatePlannedPaymentRow } from "./types.js"

type TemplatePlannedPaymentInput = {
  id: string
  amount: { toString(): string }
  direction: FlooringPaymentDirection
  paymentDate: Date | string | null
  notes: string | null
  entityId: string | null
  // Nested entity relation (from `entityTypesSelect` in the data layer); flattened
  // here to entityName + entityTypes. Absent/null on unlinked rows.
  entity?: {
    entity: string
    entityTypes: { entityType: { id: string; type: string; color: PaletteColor } }[]
  } | null
  createdAt: Date | string
  updatedAt: Date | string
  createdBy: string | null
  updatedBy: string | null
}

function toIso(value: Date | string | null): string {
  if (value == null) return ""
  return value instanceof Date ? value.toISOString() : value
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
    paymentDate: toIso(item.paymentDate),
    notes: item.notes ?? "",
    entityId: item.entityId ?? null,
    // Flatten the nested entity join into the flat read-only display fields
    // (mirrors the planned-product product/unit flatten).
    entityName: item.entity?.entity ?? null,
    entityTypes: (item.entity?.entityTypes ?? []).map((link) => link.entityType),
    createdAt: toIso(item.createdAt),
    updatedAt: toIso(item.updatedAt),
    createdBy: item.createdBy ?? null,
    updatedBy: item.updatedBy ?? null,
  }
}
