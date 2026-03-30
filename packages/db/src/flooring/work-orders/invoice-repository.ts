import { Prisma } from "@prisma/client"
import { db } from "../../client.js"

type WorkOrderInvoiceDbClient = Prisma.TransactionClient | typeof db

export type InvoiceGenerationStatusRecord =
  | "REQUESTED"
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "SUPERSEDED"

export type InvoiceGenerationRecord = {
  id: string
  workOrderId: string
  requestedByUserId: string
  sourceVersion: string
  idempotencyKey: string
  status: InvoiceGenerationStatusRecord
  requestId: string | null
  queueJobId: string | null
  requestedAt: string
  queuedAt: string | null
  startedAt: string | null
  completedAt: string | null
  failedAt: string | null
  supersededAt: string | null
  failureCode: string | null
  failureMessage: string | null
}

export type InvoiceArtifactRecord = {
  id: string
  generationId: string
  workOrderId: string
  bucketName: string
  storageKey: string
  fileName: string
  contentType: string
  checksum: string
  sizeBytes: number
  createdAt: string
  deletedAt: string | null
}

export type WorkOrderInvoiceViewRecord = {
  workOrderId: string
  sourceVersion: string
  generation: InvoiceGenerationRecord | null
  artifact: InvoiceArtifactRecord | null
}

export type WorkOrderInvoiceSourceRecord = {
  workOrderId: string
  workOrderNumber: string
  propertyName: string
  propertyAddress: string
  warehouseName: string
  status: string
  isComplete: boolean
  vacancy: string | null
  scheduledFor: string | null
  unitText: string
  unitType: string
  customAddress: string
  instructions: string
  notes: string
  sourceVersion: string
  items: Array<{
    id: string
    name: string
    style: string | null
    color: string | null
    sendUnit: string
    quantity: string
    unitPrice: string
    notes: string
  }>
  serviceItems: Array<{
    id: string
    name: string
    unitName: string
    quantity: string
    unitPrice: string
    notes: string
  }>
}

const invoiceGenerationSelect = {
  id: true,
  workOrderId: true,
  requestedByUserId: true,
  sourceVersion: true,
  idempotencyKey: true,
  status: true,
  requestId: true,
  queueJobId: true,
  requestedAt: true,
  queuedAt: true,
  startedAt: true,
  completedAt: true,
  failedAt: true,
  supersededAt: true,
  failureCode: true,
  failureMessage: true,
} as const

const invoiceArtifactSelect = {
  id: true,
  generationId: true,
  workOrderId: true,
  bucketName: true,
  storageKey: true,
  fileName: true,
  contentType: true,
  checksum: true,
  sizeBytes: true,
  createdAt: true,
  deletedAt: true,
} as const

function normalizeAddress(value: {
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
}) {
  return [value.streetAddress, value.city, value.state, value.postalCode].filter(Boolean).join(", ")
}

function toInvoiceGenerationRecord(generation: {
  id: string
  workOrderId: string
  requestedByUserId: string
  sourceVersion: Date
  idempotencyKey: string
  status: InvoiceGenerationStatusRecord
  requestId: string | null
  queueJobId: string | null
  requestedAt: Date
  queuedAt: Date | null
  startedAt: Date | null
  completedAt: Date | null
  failedAt: Date | null
  supersededAt: Date | null
  failureCode: string | null
  failureMessage: string | null
}): InvoiceGenerationRecord {
  return {
    id: generation.id,
    workOrderId: generation.workOrderId,
    requestedByUserId: generation.requestedByUserId,
    sourceVersion: generation.sourceVersion.toISOString(),
    idempotencyKey: generation.idempotencyKey,
    status: generation.status,
    requestId: generation.requestId,
    queueJobId: generation.queueJobId,
    requestedAt: generation.requestedAt.toISOString(),
    queuedAt: generation.queuedAt?.toISOString() ?? null,
    startedAt: generation.startedAt?.toISOString() ?? null,
    completedAt: generation.completedAt?.toISOString() ?? null,
    failedAt: generation.failedAt?.toISOString() ?? null,
    supersededAt: generation.supersededAt?.toISOString() ?? null,
    failureCode: generation.failureCode,
    failureMessage: generation.failureMessage,
  }
}

function toInvoiceArtifactRecord(artifact: {
  id: string
  generationId: string
  workOrderId: string
  bucketName: string
  storageKey: string
  fileName: string
  contentType: string
  checksum: string
  sizeBytes: number
  createdAt: Date
  deletedAt: Date | null
}): InvoiceArtifactRecord {
  return {
    id: artifact.id,
    generationId: artifact.generationId,
    workOrderId: artifact.workOrderId,
    bucketName: artifact.bucketName,
    storageKey: artifact.storageKey,
    fileName: artifact.fileName,
    contentType: artifact.contentType,
    checksum: artifact.checksum,
    sizeBytes: artifact.sizeBytes,
    createdAt: artifact.createdAt.toISOString(),
    deletedAt: artifact.deletedAt?.toISOString() ?? null,
  }
}

async function getCurrentSourceVersion(workOrderId: string, client: WorkOrderInvoiceDbClient) {
  const workOrder = await client.flooringWorkOrder.findUniqueOrThrow({
    where: { id: workOrderId },
    select: {
      id: true,
      invoiceSourceVersion: true,
    },
  })

  return {
    workOrderId: workOrder.id,
    sourceVersion: workOrder.invoiceSourceVersion,
  }
}

export async function getWorkOrderInvoiceView(
  workOrderId: string,
  client: WorkOrderInvoiceDbClient = db,
): Promise<WorkOrderInvoiceViewRecord> {
  const { sourceVersion } = await getCurrentSourceVersion(workOrderId, client)
  const generation = await client.flooringInvoiceGeneration.findUnique({
    where: {
      workOrderId_sourceVersion: {
        workOrderId,
        sourceVersion,
      },
    },
    select: invoiceGenerationSelect,
  })

  const artifact = generation
    ? await client.flooringInvoiceArtifact.findFirst({
        where: {
          generationId: generation.id,
          workOrderId,
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: invoiceArtifactSelect,
      })
    : null

  return {
    workOrderId,
    sourceVersion: sourceVersion.toISOString(),
    generation: generation ? toInvoiceGenerationRecord(generation) : null,
    artifact: artifact ? toInvoiceArtifactRecord(artifact) : null,
  }
}

export async function getWorkOrderInvoiceGenerationById(
  generationId: string,
  client: WorkOrderInvoiceDbClient = db,
) {
  const generation = await client.flooringInvoiceGeneration.findUniqueOrThrow({
    where: { id: generationId },
    select: invoiceGenerationSelect,
  })

  return toInvoiceGenerationRecord(generation)
}

export async function getWorkOrderInvoiceSource(
  workOrderId: string,
  client: WorkOrderInvoiceDbClient = db,
): Promise<WorkOrderInvoiceSourceRecord> {
  const workOrder = await client.flooringWorkOrder.findUniqueOrThrow({
    where: { id: workOrderId },
    include: {
      property: {
        select: {
          name: true,
          streetAddress: true,
          city: true,
          state: true,
          postalCode: true,
        },
      },
      warehouse: {
        select: {
          name: true,
        },
      },
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          notes: true,
          product: {
            select: {
              name: true,
              style: true,
              color: true,
              category: {
                select: {
                  sendUnit: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      serviceItems: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          quantity: true,
          unitPrice: true,
          notes: true,
          unit: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  })

  return {
    workOrderId: workOrder.id,
    workOrderNumber: workOrder.workOrderNumber,
    propertyName: workOrder.property.name,
    propertyAddress: normalizeAddress(workOrder.property),
    warehouseName: workOrder.warehouse?.name ?? "",
    status: workOrder.status,
    isComplete: workOrder.isComplete,
    vacancy: workOrder.vacancy,
    scheduledFor: workOrder.scheduledFor?.toISOString() ?? null,
    unitText: workOrder.unitLabel ?? "",
    unitType: workOrder.unitType ?? "",
    customAddress: workOrder.customAddress ?? "",
    instructions: workOrder.instructions ?? "",
    notes: workOrder.notes ?? "",
    sourceVersion: workOrder.invoiceSourceVersion.toISOString(),
    items: workOrder.items.map((item) => ({
      id: item.id,
      name: item.product.name,
      style: item.product.style,
      color: item.product.color,
      sendUnit: item.product.category.sendUnit?.name ?? "",
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      notes: item.notes ?? "",
    })),
    serviceItems: workOrder.serviceItems.map((item) => ({
      id: item.id,
      name: item.name,
      unitName: item.unit.name,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      notes: item.notes ?? "",
    })),
  }
}

export async function createInvoiceGeneration(
  input: {
    workOrderId: string
    requestedByUserId: string
    sourceVersion: Date
    idempotencyKey: string
    requestId?: string | null
    requestedAt?: Date
  },
  client: WorkOrderInvoiceDbClient = db,
) {
  const generation = await client.flooringInvoiceGeneration.create({
    data: {
      workOrderId: input.workOrderId,
      requestedByUserId: input.requestedByUserId,
      sourceVersion: input.sourceVersion,
      idempotencyKey: input.idempotencyKey,
      status: "REQUESTED",
      requestId: input.requestId ?? null,
      requestedAt: input.requestedAt ?? new Date(),
    },
    select: invoiceGenerationSelect,
  })

  return toInvoiceGenerationRecord(generation)
}

export async function supersedePendingInvoiceGenerations(
  input: {
    workOrderId: string
    supersededAt?: Date
  },
  client: WorkOrderInvoiceDbClient = db,
) {
  return client.flooringInvoiceGeneration.updateMany({
    where: {
      workOrderId: input.workOrderId,
      status: {
        in: ["REQUESTED", "QUEUED", "PROCESSING"],
      },
    },
    data: {
      status: "SUPERSEDED",
      supersededAt: input.supersededAt ?? new Date(),
    },
  })
}

export async function queueInvoiceGeneration(
  input: {
    generationId: string
    queueJobId: string
    queuedAt?: Date
  },
  client: WorkOrderInvoiceDbClient = db,
) {
  const result = await client.flooringInvoiceGeneration.updateMany({
    where: {
      id: input.generationId,
      status: "REQUESTED",
    },
    data: {
      status: "QUEUED",
      queueJobId: input.queueJobId,
      queuedAt: input.queuedAt ?? new Date(),
    },
  })

  return result.count > 0
}

export async function startInvoiceGeneration(
  generationId: string,
  client: WorkOrderInvoiceDbClient = db,
) {
  const result = await client.flooringInvoiceGeneration.updateMany({
    where: {
      id: generationId,
      status: "QUEUED",
    },
    data: {
      status: "PROCESSING",
      startedAt: new Date(),
      failedAt: null,
      failureCode: null,
      failureMessage: null,
    },
  })

  return result.count > 0
}

export async function completeInvoiceGeneration(
  input: {
    generationId: string
    completedAt?: Date
  },
  client: WorkOrderInvoiceDbClient = db,
) {
  const result = await client.flooringInvoiceGeneration.updateMany({
    where: {
      id: input.generationId,
      status: "PROCESSING",
    },
    data: {
      status: "COMPLETED",
      completedAt: input.completedAt ?? new Date(),
      failedAt: null,
      failureCode: null,
      failureMessage: null,
    },
  })

  return result.count > 0
}

export async function supersedeInvoiceGeneration(
  input: {
    generationId: string
    supersededAt?: Date
  },
  client: WorkOrderInvoiceDbClient = db,
) {
  const result = await client.flooringInvoiceGeneration.updateMany({
    where: {
      id: input.generationId,
      status: {
        in: ["REQUESTED", "QUEUED", "PROCESSING"],
      },
    },
    data: {
      status: "SUPERSEDED",
      supersededAt: input.supersededAt ?? new Date(),
    },
  })

  return result.count > 0
}

export async function failInvoiceGeneration(
  input: {
    generationId: string
    failureCode?: string | null
    failureMessage: string
    failedAt?: Date
  },
  client: WorkOrderInvoiceDbClient = db,
) {
  const result = await client.flooringInvoiceGeneration.updateMany({
    where: {
      id: input.generationId,
      status: {
        in: ["REQUESTED", "QUEUED", "PROCESSING"],
      },
    },
    data: {
      status: "FAILED",
      failedAt: input.failedAt ?? new Date(),
      failureCode: input.failureCode ?? null,
      failureMessage: input.failureMessage,
    },
  })

  return result.count > 0
}

export async function insertInvoiceArtifact(
  input: {
    generationId: string
    workOrderId: string
    bucketName: string
    storageKey: string
    fileName: string
    contentType: string
    checksum: string
    sizeBytes: number
    createdAt?: Date
  },
  client: WorkOrderInvoiceDbClient = db,
) {
  const artifact = await client.flooringInvoiceArtifact.create({
    data: {
      generationId: input.generationId,
      workOrderId: input.workOrderId,
      bucketName: input.bucketName,
      storageKey: input.storageKey,
      fileName: input.fileName,
      contentType: input.contentType,
      checksum: input.checksum,
      sizeBytes: input.sizeBytes,
      createdAt: input.createdAt ?? new Date(),
    },
    select: invoiceArtifactSelect,
  })

  return toInvoiceArtifactRecord(artifact)
}

export async function softDeleteInvoiceArtifact(
  input: {
    artifactId: string
    deletedAt?: Date
  },
  client: WorkOrderInvoiceDbClient = db,
) {
  const artifact = await client.flooringInvoiceArtifact.update({
    where: { id: input.artifactId },
    data: {
      deletedAt: input.deletedAt ?? new Date(),
    },
    select: invoiceArtifactSelect,
  })

  return toInvoiceArtifactRecord(artifact)
}
