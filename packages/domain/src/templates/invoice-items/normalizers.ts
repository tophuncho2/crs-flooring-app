import { normalizeMoneyAmount } from "../../shared/money.js"
import type { FlooringPaymentDirection } from "../../payments/types.js"
import type { TemplateInvoiceItemRow } from "./types.js"

type TemplateInvoiceItemInput = {
  id: string
  amount: { toString(): string }
  direction: FlooringPaymentDirection
  notes: string | null
  createdAt: Date | string
  updatedAt: Date | string
  createdBy: string | null
  updatedBy: string | null
}

function toIso(value: Date | string | null): string {
  if (value == null) return ""
  return value instanceof Date ? value.toISOString() : value
}

export function normalizeTemplateInvoiceItem(
  item: TemplateInvoiceItemInput,
): TemplateInvoiceItemRow {
  return {
    id: item.id,
    // Normalize on read so the row always carries a canonical "X.XX" string.
    // Prisma's Decimal.toString() drops trailing zeros ("10"), but MoneyCell pads
    // local state to "10.00" on blur — without this the FE's itemsDiffer would
    // flag every saved row as still-dirty.
    amount: normalizeMoneyAmount(item.amount.toString()),
    direction: item.direction,
    notes: item.notes ?? "",
    createdAt: toIso(item.createdAt),
    updatedAt: toIso(item.updatedAt),
    createdBy: item.createdBy ?? null,
    updatedBy: item.updatedBy ?? null,
  }
}
