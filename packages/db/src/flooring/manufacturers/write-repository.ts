import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import { normalizePhoneNumber } from "@builders/domain"
import { normalizeManufacturer, type ManufacturerRecord } from "./read-repository.js"

type ManufacturerDbClient = PrismaClient | Prisma.TransactionClient

export type ManufacturerFormInput = {
  companyName: string
  companyNameNormalized: string
  agentName: string
  website: string
  phone: string
  email: string
}

const manufacturerInclude = {
  _count: { select: { products: true } },
} as const

export async function createManufacturerPrimaryRecord(
  input: ManufacturerFormInput,
  client: ManufacturerDbClient = db,
): Promise<ManufacturerRecord> {
  const manufacturer = await client.flooringManufacturer.create({
    data: {
      companyName: input.companyName.trim(),
      companyNameNormalized: input.companyNameNormalized,
      agentName: input.agentName.trim() || null,
      website: input.website.trim() || null,
      phone: normalizePhoneNumber(input.phone) || null,
      email: input.email.trim() || null,
    },
    include: manufacturerInclude,
  })

  return normalizeManufacturer(manufacturer)
}

export async function updateManufacturerPrimaryRecord(
  id: string,
  input: ManufacturerFormInput,
  client: ManufacturerDbClient = db,
): Promise<ManufacturerRecord> {
  const manufacturer = await client.flooringManufacturer.update({
    where: { id },
    data: {
      companyName: input.companyName.trim(),
      companyNameNormalized: input.companyNameNormalized,
      agentName: input.agentName.trim() || null,
      website: input.website.trim() || null,
      phone: normalizePhoneNumber(input.phone) || null,
      email: input.email.trim() || null,
    },
    include: manufacturerInclude,
  })

  return normalizeManufacturer(manufacturer)
}

export async function deleteManufacturerRecordById(
  id: string,
  client: ManufacturerDbClient = db,
): Promise<void> {
  await client.flooringManufacturer.delete({
    where: { id },
  })
}
