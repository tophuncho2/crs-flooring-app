import { db } from "../../client.js"
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
}

export type UpdatePaymentRecordInput = Partial<CreatePaymentRecordInput>

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
    },
  })
  return normalizePayment(payment)
}

export async function updatePaymentRecord(
  id: string,
  input: UpdatePaymentRecordInput,
  client: PaymentsDbClient = db,
): Promise<Payment> {
  const data: Prisma.FlooringPaymentUpdateInput = {}
  if (input.amount !== undefined) data.amount = normalizeMoneyAmount(input.amount)
  if (input.direction !== undefined) data.direction = input.direction
  if (input.paymentDate !== undefined) data.paymentDate = optionalDate(input.paymentDate)

  const payment = await client.flooringPayment.update({
    where: { id },
    data,
  })
  return normalizePayment(payment)
}

export async function deletePaymentRecordById(
  id: string,
  client: PaymentsDbClient = db,
): Promise<void> {
  await client.flooringPayment.delete({ where: { id } })
}
