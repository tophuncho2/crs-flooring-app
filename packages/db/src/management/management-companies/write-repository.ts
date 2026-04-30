import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "@prisma/client"
import { normalizeManagementCompany, type ManagementCompanyDetail } from "@builders/domain"

type ManagementCompaniesDbClient = PrismaClient | Prisma.TransactionClient

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
} as const

export async function createManagementCompanyRecord(
  input: CreateManagementCompanyRecordInput,
  client: ManagementCompaniesDbClient = db,
): Promise<ManagementCompanyDetail> {
  const company = await client.flooringManagementCompany.create({
    data: input,
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
    data: input,
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
