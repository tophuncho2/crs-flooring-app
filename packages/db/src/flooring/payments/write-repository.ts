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
  paymentType?: string
  paymentMethod?: string
  paymentDate?: string
  memo?: string
}

export type UpdatePaymentRecordInput = Partial<CreatePaymentRecordInput>

function optionalText(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : null
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
      paymentType: optionalText(input.paymentType) ?? null,
      paymentMethod: optionalText(input.paymentMethod) ?? null,
      paymentDate: optionalDate(input.paymentDate) ?? null,
      memo: optionalText(input.memo) ?? null,
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
  if (input.paymentType !== undefined) data.paymentType = optionalText(input.paymentType)
  if (input.paymentMethod !== undefined) data.paymentMethod = optionalText(input.paymentMethod)
  if (input.paymentDate !== undefined) data.paymentDate = optionalDate(input.paymentDate)
  if (input.memo !== undefined) data.memo = optionalText(input.memo)

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
