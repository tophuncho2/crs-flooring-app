import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import { normalizeManagementCompany, normalizePhoneNumber, type ManagementCompanyDetail } from "@builders/domain"

type ManagementCompaniesDbClient = PrismaClient | Prisma.TransactionClient

// Phone standard: persist the canonical digits-only form (defensive guard — the
// API validator already normalized, but the data layer is the last gate).
// `undefined` is preserved so a partial update never clears the column.
function normalizeNullablePhone(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  return normalizePhoneNumber(value) || null
}

export type CreateManagementCompanyRecordInput = {
  name: string
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  phone: string | null
  email: string | null
}

export type UpdateManagementCompanyRecordInput = Partial<CreateManagementCompanyRecordInput>

const managementCompanyDetailSelect = {
  id: true,
  updatedAt: true,
  name: true,
  streetAddress: true,
  city: true,
  state: true,
  postalCode: true,
  phone: true,
  email: true,
  _count: {
    select: { properties: true },
  },
} as const

export async function createManagementCompanyRecord(
  input: CreateManagementCompanyRecordInput,
  client: ManagementCompaniesDbClient = db,
): Promise<ManagementCompanyDetail> {
  const company = await client.flooringManagementCompany.create({
    data: { ...input, phone: normalizeNullablePhone(input.phone) },
    select: managementCompanyDetailSelect,
  })

  return normalizeManagementCompany(company)
}

export async function updateManagementCompanyRecord(
  id: string,
  input: UpdateManagementCompanyRecordInput,
  client: ManagementCompaniesDbClient = db,
): Promise<ManagementCompanyDetail> {
  const company = await client.flooringManagementCompany.update({
    where: { id },
    data: { ...input, phone: normalizeNullablePhone(input.phone) },
    select: managementCompanyDetailSelect,
  })

  return normalizeManagementCompany(company)
}

export async function deleteManagementCompanyRecordById(
  id: string,
  client: ManagementCompaniesDbClient = db,
): Promise<void> {
  await client.flooringManagementCompany.delete({ where: { id } })
}
