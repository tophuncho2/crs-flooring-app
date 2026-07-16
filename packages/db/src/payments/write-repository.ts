import { db } from "../client.js"
import type { Prisma, PrismaClient } from "../generated/prisma/client.js"
import {
  normalizeMoneyAmount,
  normalizePhoneNumber,
  type FlooringPaymentDirection,
  type PaletteColor,
} from "@builders/domain"

type PaymentsDbClient = PrismaClient | Prisma.TransactionClient

export type CreatePaymentRecordInput = {
  amount: string
  direction: FlooringPaymentDirection
  paymentMethod?: string | null
  storePhone?: string | null
  receiptNumber?: string | null
  storeAddress?: string | null
  storeNumber?: string | null
  internalNotes?: string | null
  paymentDate?: string
  // Optional, single links. `null`/omitted = unlinked.
  entityId?: string | null
  workOrderId?: string | null
  paymentPurposeId?: string | null
  createdBy: string
  updatedBy: string
}

export type UpdatePaymentRecordInput = {
  amount?: string
  direction?: FlooringPaymentDirection
  // Non-semantic palette tag. Metadata only — never triggers a recompute.
  color?: PaletteColor
  paymentMethod?: string | null
  storePhone?: string | null
  receiptNumber?: string | null
  storeAddress?: string | null
  storeNumber?: string | null
  internalNotes?: string | null
  paymentDate?: string
  // Tri-state: `undefined` = leave as-is, `null` = clear the link, string = set.
  entityId?: string | null
  workOrderId?: string | null
  paymentPurposeId?: string | null
  updatedBy: string
}

function optionalDate(value: string | undefined): Date | null | undefined {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  if (!trimmed) return null
  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? null : date
}

// Lean write: returns only `{ id }`. A `create`/`update` whose `include` pulls
// the multi-relation `paymentLinksInclude` (entity + workOrder + purpose) run on
// the pinned interactive-transaction connection fires concurrent relation
// sub-queries on that one pg connection ("client is already executing a query").
// The full links-hydrated record is read on the pool after commit via
// `getPaymentByIdWithLinks`.
export async function createPaymentRecord(
  input: CreatePaymentRecordInput,
  client: PaymentsDbClient = db,
): Promise<{ id: string }> {
  return client.flooringPayment.create({
    data: {
      amount: normalizeMoneyAmount(input.amount),
      direction: input.direction,
      paymentMethod: input.paymentMethod?.trim() || null,
      storePhone: normalizePhoneNumber(input.storePhone ?? "") || null,
      receiptNumber: input.receiptNumber?.trim() || null,
      storeAddress: input.storeAddress?.trim() || null,
      storeNumber: input.storeNumber?.trim() || null,
      internalNotes: input.internalNotes?.trim() || null,
      paymentDate: optionalDate(input.paymentDate) ?? null,
      entityId: input.entityId ?? null,
      workOrderId: input.workOrderId ?? null,
      paymentPurposeId: input.paymentPurposeId ?? null,
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
    },
    select: { id: true },
  })
}

export async function updatePaymentRecord(
  id: string,
  input: UpdatePaymentRecordInput,
  client: PaymentsDbClient = db,
): Promise<{ id: string }> {
  // Unchecked input so the scalar FK columns can be set/cleared directly.
  const data: Prisma.FlooringPaymentUncheckedUpdateInput = { updatedBy: input.updatedBy }
  if (input.amount !== undefined) data.amount = normalizeMoneyAmount(input.amount)
  if (input.direction !== undefined) data.direction = input.direction
  if (input.color !== undefined) data.color = input.color
  if (input.paymentMethod !== undefined) data.paymentMethod = input.paymentMethod?.trim() || null
  if (input.storePhone !== undefined) data.storePhone = normalizePhoneNumber(input.storePhone ?? "") || null
  if (input.receiptNumber !== undefined) data.receiptNumber = input.receiptNumber?.trim() || null
  if (input.storeAddress !== undefined) data.storeAddress = input.storeAddress?.trim() || null
  if (input.storeNumber !== undefined) data.storeNumber = input.storeNumber?.trim() || null
  if (input.internalNotes !== undefined) data.internalNotes = input.internalNotes?.trim() || null
  if (input.paymentDate !== undefined) data.paymentDate = optionalDate(input.paymentDate)
  if (input.entityId !== undefined) data.entityId = input.entityId
  if (input.workOrderId !== undefined) data.workOrderId = input.workOrderId
  if (input.paymentPurposeId !== undefined) data.paymentPurposeId = input.paymentPurposeId

  // Lean write (see `createPaymentRecord`) — `{ id }` only; the caller enriches
  // on the pool. `where: { id }` still throws P2025 when the row is gone, which
  // the update use case maps to a 404 (kept, wrapping this call).
  return client.flooringPayment.update({
    where: { id },
    data,
    select: { id: true },
  })
}

export async function deletePaymentRecordById(
  id: string,
  client: PaymentsDbClient = db,
): Promise<void> {
  await client.flooringPayment.delete({ where: { id } })
}
