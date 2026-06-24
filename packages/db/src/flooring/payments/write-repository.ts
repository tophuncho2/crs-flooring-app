import { db } from "../../client.js"
import { paymentLinksInclude, projectPaymentLinks } from "./payment-links.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import {
  normalizeMoneyAmount,
  normalizePayment,
  type FlooringPaymentDirection,
  type Payment,
} from "@builders/domain"

type PaymentsDbClient = PrismaClient | Prisma.TransactionClient

export type CreatePaymentRecordInput = {
  amount: string
  direction: FlooringPaymentDirection
  paymentDate?: string
  // Optional, single links. `null`/omitted = unlinked.
  entityId?: string | null
  workOrderId?: string | null
  createdBy: string
  updatedBy: string
}

export type UpdatePaymentRecordInput = {
  amount?: string
  direction?: FlooringPaymentDirection
  paymentDate?: string
  // Tri-state: `undefined` = leave as-is, `null` = clear the link, string = set.
  entityId?: string | null
  workOrderId?: string | null
  updatedBy: string
}

function optionalDate(value: string | undefined): Date | null | undefined {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  if (!trimmed) return null
  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function createPaymentRecord(
  input: CreatePaymentRecordInput,
  client: PaymentsDbClient = db,
): Promise<Payment> {
  const payment = await client.flooringPayment.create({
    data: {
      amount: normalizeMoneyAmount(input.amount),
      direction: input.direction,
      paymentDate: optionalDate(input.paymentDate) ?? null,
      entityId: input.entityId ?? null,
      workOrderId: input.workOrderId ?? null,
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
    },
    include: paymentLinksInclude,
  })
  return normalizePayment({ ...payment, ...projectPaymentLinks(payment) })
}

export async function updatePaymentRecord(
  id: string,
  input: UpdatePaymentRecordInput,
  client: PaymentsDbClient = db,
): Promise<Payment> {
  // Unchecked input so the scalar FK columns can be set/cleared directly.
  const data: Prisma.FlooringPaymentUncheckedUpdateInput = { updatedBy: input.updatedBy }
  if (input.amount !== undefined) data.amount = normalizeMoneyAmount(input.amount)
  if (input.direction !== undefined) data.direction = input.direction
  if (input.paymentDate !== undefined) data.paymentDate = optionalDate(input.paymentDate)
  if (input.entityId !== undefined) data.entityId = input.entityId
  if (input.workOrderId !== undefined) data.workOrderId = input.workOrderId

  const payment = await client.flooringPayment.update({
    where: { id },
    data,
    include: paymentLinksInclude,
  })
  return normalizePayment({ ...payment, ...projectPaymentLinks(payment) })
}

export async function deletePaymentRecordById(
  id: string,
  client: PaymentsDbClient = db,
): Promise<void> {
  await client.flooringPayment.delete({ where: { id } })
}
