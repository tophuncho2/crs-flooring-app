import { Prisma } from "@prisma/client"
import { db } from "../../client.js"

type WorkOrderInvoiceDbClient = Prisma.TransactionClient | typeof db

export type WorkOrderInvoiceStatusRecord = {
  workOrderId: string
  invoiceSourceUpdatedAt: string
  invoiceStatus: "IDLE" | "QUEUED" | "PROCESSING" | "READY" | "FAILED"
  invoiceFileKey: string | null
  invoiceRequestedAt: string | null
  invoiceGeneratedAt: string | null
  invoiceFailedAt: string | null
  invoiceError: string | null
  invoiceIdempotencyKey: string | null
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
  invoiceSourceUpdatedAt: string
  invoiceIdempotencyKey: string | null
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

function normalizeAddress(value: {
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
}) {
  return [value.streetAddress, value.city, value.state, value.postalCode].filter(Boolean).join(", ")
}

function toStatusRecord(workOrder: {
  id: string
  invoiceSourceUpdatedAt: Date
  invoiceStatus: "IDLE" | "QUEUED" | "PROCESSING" | "READY" | "FAILED"
  invoiceFileKey: string | null
  invoiceRequestedAt: Date | null
  invoiceGeneratedAt: Date | null
  invoiceFailedAt: Date | null
  invoiceError: string | null
  invoiceIdempotencyKey: string | null
}): WorkOrderInvoiceStatusRecord {
  return {
    workOrderId: workOrder.id,
    invoiceSourceUpdatedAt: workOrder.invoiceSourceUpdatedAt.toISOString(),
    invoiceStatus: workOrder.invoiceStatus,
    invoiceFileKey: workOrder.invoiceFileKey,
    invoiceRequestedAt: workOrder.invoiceRequestedAt?.toISOString() ?? null,
    invoiceGeneratedAt: workOrder.invoiceGeneratedAt?.toISOString() ?? null,
    invoiceFailedAt: workOrder.invoiceFailedAt?.toISOString() ?? null,
    invoiceError: workOrder.invoiceError,
    invoiceIdempotencyKey: workOrder.invoiceIdempotencyKey,
  }
}

export async function getWorkOrderInvoiceStatus(workOrderId: string, client: WorkOrderInvoiceDbClient = db) {
  const workOrder = await client.flooringWorkOrder.findUniqueOrThrow({
    where: { id: workOrderId },
    select: {
      id: true,
      invoiceSourceUpdatedAt: true,
      invoiceStatus: true,
      invoiceFileKey: true,
      invoiceRequestedAt: true,
      invoiceGeneratedAt: true,
      invoiceFailedAt: true,
      invoiceError: true,
      invoiceIdempotencyKey: true,
    },
  })

  return toStatusRecord(workOrder)
}

export async function getWorkOrderInvoiceSource(workOrderId: string, client: WorkOrderInvoiceDbClient = db): Promise<WorkOrderInvoiceSourceRecord> {
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
    invoiceSourceUpdatedAt: workOrder.invoiceSourceUpdatedAt.toISOString(),
    invoiceIdempotencyKey: workOrder.invoiceIdempotencyKey,
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

export async function queueWorkOrderInvoiceGeneration(
  workOrderId: string,
  input: {
    idempotencyKey: string
    requestedAt?: Date
  },
  client: WorkOrderInvoiceDbClient = db,
) {
  const workOrder = await client.flooringWorkOrder.update({
    where: { id: workOrderId },
    data: {
      invoiceStatus: "QUEUED",
      invoiceRequestedAt: input.requestedAt ?? new Date(),
      invoiceGeneratedAt: null,
      invoiceFailedAt: null,
      invoiceError: null,
      invoiceIdempotencyKey: input.idempotencyKey,
    },
    select: {
      id: true,
      invoiceSourceUpdatedAt: true,
      invoiceStatus: true,
      invoiceFileKey: true,
      invoiceRequestedAt: true,
      invoiceGeneratedAt: true,
      invoiceFailedAt: true,
      invoiceError: true,
      invoiceIdempotencyKey: true,
    },
  })

  return toStatusRecord(workOrder)
}

export async function startWorkOrderInvoiceGeneration(
  workOrderId: string,
  idempotencyKey: string,
  client: WorkOrderInvoiceDbClient = db,
) {
  const result = await client.flooringWorkOrder.updateMany({
    where: {
      id: workOrderId,
      invoiceIdempotencyKey: idempotencyKey,
    },
    data: {
      invoiceStatus: "PROCESSING",
      invoiceFailedAt: null,
      invoiceError: null,
    },
  })

  return result.count > 0
}

export async function completeWorkOrderInvoiceGeneration(
  workOrderId: string,
  input: {
    idempotencyKey: string
    fileKey: string
    generatedAt?: Date
  },
  client: WorkOrderInvoiceDbClient = db,
) {
  const result = await client.flooringWorkOrder.updateMany({
    where: {
      id: workOrderId,
      invoiceIdempotencyKey: input.idempotencyKey,
    },
    data: {
      invoiceStatus: "READY",
      invoiceFileKey: input.fileKey,
      invoiceGeneratedAt: input.generatedAt ?? new Date(),
      invoiceFailedAt: null,
      invoiceError: null,
    },
  })

  return result.count > 0
}

export async function failWorkOrderInvoiceGeneration(
  workOrderId: string,
  input: {
    idempotencyKey: string
    errorMessage: string
    failedAt?: Date
  },
  client: WorkOrderInvoiceDbClient = db,
) {
  const result = await client.flooringWorkOrder.updateMany({
    where: {
      id: workOrderId,
      invoiceIdempotencyKey: input.idempotencyKey,
    },
    data: {
      invoiceStatus: "FAILED",
      invoiceFailedAt: input.failedAt ?? new Date(),
      invoiceError: input.errorMessage,
    },
  })

  return result.count > 0
}
