import { db } from "../client.js"
import type { Prisma, PrismaClient } from "../generated/prisma/client.js"
import {
  normalizeWorkOrderDocumentType,
  type PaletteColor,
  type WorkOrderDocumentType,
  type WorkOrderStoredPrintConfig,
} from "@builders/domain"

type WorkOrderDocumentTypesDbClient = PrismaClient | Prisma.TransactionClient

export type CreateWorkOrderDocumentTypeRecordInput = {
  name: string
  color: PaletteColor
  printConfig: WorkOrderStoredPrintConfig
  createdBy: string
  updatedBy: string
}

export type UpdateWorkOrderDocumentTypeRecordInput = {
  name?: string
  color?: PaletteColor
  printConfig?: WorkOrderStoredPrintConfig
  updatedBy: string
}

// The stored config is a plain object of optional boolean maps — a valid JSON
// value. Cast at the persistence boundary to Prisma's InputJsonValue.
function toJson(config: WorkOrderStoredPrintConfig): Prisma.InputJsonValue {
  return config as Prisma.InputJsonValue
}

export async function createWorkOrderDocumentTypeRecord(
  input: CreateWorkOrderDocumentTypeRecordInput,
  client: WorkOrderDocumentTypesDbClient = db,
): Promise<WorkOrderDocumentType> {
  const documentType = await client.flooringWorkOrderDocumentType.create({
    data: {
      name: input.name.trim(),
      color: input.color,
      printConfig: toJson(input.printConfig),
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
    },
  })
  return normalizeWorkOrderDocumentType(documentType)
}

export async function updateWorkOrderDocumentTypeRecord(
  id: string,
  input: UpdateWorkOrderDocumentTypeRecordInput,
  client: WorkOrderDocumentTypesDbClient = db,
): Promise<WorkOrderDocumentType> {
  const data: Prisma.FlooringWorkOrderDocumentTypeUpdateInput = { updatedBy: input.updatedBy }
  if (input.name !== undefined) data.name = input.name.trim()
  if (input.color !== undefined) data.color = input.color
  if (input.printConfig !== undefined) data.printConfig = toJson(input.printConfig)

  const documentType = await client.flooringWorkOrderDocumentType.update({
    where: { id },
    data,
  })
  return normalizeWorkOrderDocumentType(documentType)
}

export async function deleteWorkOrderDocumentTypeRecordById(
  id: string,
  client: WorkOrderDocumentTypesDbClient = db,
): Promise<void> {
  await client.flooringWorkOrderDocumentType.delete({ where: { id } })
}
