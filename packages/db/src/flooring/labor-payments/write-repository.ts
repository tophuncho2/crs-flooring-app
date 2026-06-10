import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import { normalizeLaborPayment, normalizeMoneyAmount, type LaborPayment } from "@builders/domain"

type LaborPaymentsDbClient = PrismaClient | Prisma.TransactionClient

const laborPaymentInclude = {
  contact: { select: { name: true } },
} satisfies Prisma.FlooringLaborPaymentInclude

export type CreateLaborPaymentRecordInput = {
  contactId: string
  unit?: string
  description?: string
  cost?: string
}

export type UpdateLaborPaymentRecordInput = Partial<CreateLaborPaymentRecordInput>

function optionalText(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function optionalDecimal(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined
  const normalized = normalizeMoneyAmount(value.trim())
  return normalized ? normalized : null
}

export async function createLaborPaymentRecord(
  input: CreateLaborPaymentRecordInput,
  client: LaborPaymentsDbClient = db,
): Promise<LaborPayment> {
  const laborPayment = await client.flooringLaborPayment.create({
    data: {
      contactId: input.contactId,
      unit: optionalText(input.unit) ?? null,
      description: optionalText(input.description) ?? null,
      cost: optionalDecimal(input.cost) ?? null,
    },
    include: laborPaymentInclude,
  })
  return normalizeLaborPayment(laborPayment)
}

export async function updateLaborPaymentRecord(
  id: string,
  input: UpdateLaborPaymentRecordInput,
  client: LaborPaymentsDbClient = db,
): Promise<LaborPayment> {
  const data: Prisma.FlooringLaborPaymentUpdateInput = {}
  if (input.contactId !== undefined) {
    data.contact = { connect: { id: input.contactId } }
  }
  if (input.unit !== undefined) data.unit = optionalText(input.unit)
  if (input.description !== undefined) data.description = optionalText(input.description)
  if (input.cost !== undefined) data.cost = optionalDecimal(input.cost)

  const laborPayment = await client.flooringLaborPayment.update({
    where: { id },
    data,
    include: laborPaymentInclude,
  })
  return normalizeLaborPayment(laborPayment)
}

export async function deleteLaborPaymentRecordById(
  id: string,
  client: LaborPaymentsDbClient = db,
): Promise<void> {
  await client.flooringLaborPayment.delete({ where: { id } })
}
