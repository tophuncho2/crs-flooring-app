import { db } from "../client.js"
import type { Prisma, PrismaClient } from "../generated/prisma/client.js"
import { normalizeCertificate, type CertificateDetailRecord } from "@builders/domain"

type CertificatesDbClient = PrismaClient | Prisma.TransactionClient

const certificateSelect = {
  id: true,
  name: true,
  expirationDate: true,
  internalNotes: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  entity: {
    select: { id: true, entity: true },
  },
} as const

export type CreateCertificateRecordInput = {
  entityId: string | null
  name: string
  expirationDate: Date | null
  internalNotes: string | null
  createdBy: string
  updatedBy: string
}

export type UpdateCertificateRecordInput = Partial<
  Omit<CreateCertificateRecordInput, "createdBy" | "updatedBy">
> & {
  updatedBy: string
}

export async function createCertificateRecord(
  input: CreateCertificateRecordInput,
  client: CertificatesDbClient = db,
): Promise<CertificateDetailRecord> {
  const certificate = await client.certificate.create({
    data: {
      entityId: input.entityId,
      name: input.name.trim(),
      expirationDate: input.expirationDate,
      internalNotes: input.internalNotes,
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
    },
    select: certificateSelect,
  })
  return normalizeCertificate(certificate)
}

export async function updateCertificateRecord(
  id: string,
  input: UpdateCertificateRecordInput,
  client: CertificatesDbClient = db,
): Promise<CertificateDetailRecord> {
  // Unchecked update input so the scalar `entityId` FK is set directly (null
  // clears the link, an id relinks) — mirrors `createCertificateRecord` above and
  // the properties write repo. Only keys present in the partial input are touched.
  const data: Prisma.CertificateUncheckedUpdateInput = { updatedBy: input.updatedBy }
  if (input.name !== undefined) data.name = input.name.trim()
  if (input.expirationDate !== undefined) data.expirationDate = input.expirationDate
  if (input.internalNotes !== undefined) data.internalNotes = input.internalNotes
  if (input.entityId !== undefined) data.entityId = input.entityId

  const certificate = await client.certificate.update({
    where: { id },
    data,
    select: certificateSelect,
  })
  return normalizeCertificate(certificate)
}

export async function deleteCertificateRecordById(
  id: string,
  client: CertificatesDbClient = db,
): Promise<void> {
  await client.certificate.delete({ where: { id } })
}
