import { db } from "../client.js"
import type { Prisma, PrismaClient } from "../generated/prisma/client.js"
import { normalizePaymentPurpose, type PaymentPurpose, type PaletteColor } from "@builders/domain"

type PaymentPurposesDbClient = PrismaClient | Prisma.TransactionClient

export type CreatePaymentPurposeRecordInput = {
  name: string
  color: PaletteColor
  createdBy: string
  updatedBy: string
}

export type UpdatePaymentPurposeRecordInput = {
  name?: string
  color?: PaletteColor
  updatedBy: string
}

export async function createPaymentPurposeRecord(
  input: CreatePaymentPurposeRecordInput,
  client: PaymentPurposesDbClient = db,
): Promise<PaymentPurpose> {
  const paymentPurpose = await client.flooringPaymentPurpose.create({
    data: {
      name: input.name.trim(),
      color: input.color,
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
    },
  })
  return normalizePaymentPurpose(paymentPurpose)
}

export async function updatePaymentPurposeRecord(
  id: string,
  input: UpdatePaymentPurposeRecordInput,
  client: PaymentPurposesDbClient = db,
): Promise<PaymentPurpose> {
  const data: Prisma.FlooringPaymentPurposeUpdateInput = { updatedBy: input.updatedBy }
  if (input.name !== undefined) data.name = input.name.trim()
  if (input.color !== undefined) data.color = input.color

  const paymentPurpose = await client.flooringPaymentPurpose.update({
    where: { id },
    data,
  })
  return normalizePaymentPurpose(paymentPurpose)
}

export async function deletePaymentPurposeRecordById(
  id: string,
  client: PaymentPurposesDbClient = db,
): Promise<void> {
  await client.flooringPaymentPurpose.delete({ where: { id } })
}
