import { db } from "../../../client.js"
import { allocationRunSelect, type WorkOrderAllocationDbClient, type WorkOrderAllocationRunRow } from "./shared.js"

export async function createWorkOrderAllocationRun(
  input: {
    id?: string
    workOrderId: string
    requestedByUserId: string
    sourceVersion: Date
    idempotencyKey: string
    requestId?: string | null
    requestedAt?: Date
  },
  client: WorkOrderAllocationDbClient = db,
): Promise<WorkOrderAllocationRunRow> {
  return client.flooringWorkOrderAllocationRun.create({
    data: {
      id: input.id,
      workOrderId: input.workOrderId,
      requestedByUserId: input.requestedByUserId,
      sourceVersion: input.sourceVersion,
      idempotencyKey: input.idempotencyKey,
      requestId: input.requestId ?? null,
      requestedAt: input.requestedAt ?? new Date(),
    },
    select: allocationRunSelect,
  })
}

export async function queueWorkOrderAllocationRun(
  input: {
    allocationRunId: string
    queueJobId: string
    queuedAt?: Date
  },
  client: WorkOrderAllocationDbClient = db,
) {
  const result = await client.flooringWorkOrderAllocationRun.updateMany({
    where: {
      id: input.allocationRunId,
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

export async function startWorkOrderAllocationRun(
  allocationRunId: string,
  client: WorkOrderAllocationDbClient = db,
) {
  const result = await client.flooringWorkOrderAllocationRun.updateMany({
    where: {
      id: allocationRunId,
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

export async function retryWorkOrderAllocationRun(
  input: {
    allocationRunId: string
    queuedAt?: Date
    failureCode?: string | null
    failureMessage?: string | null
  },
  client: WorkOrderAllocationDbClient = db,
) {
  const result = await client.flooringWorkOrderAllocationRun.updateMany({
    where: {
      id: input.allocationRunId,
      status: "PROCESSING",
    },
    data: {
      status: "QUEUED",
      queuedAt: input.queuedAt ?? new Date(),
      failureCode: input.failureCode ?? null,
      failureMessage: input.failureMessage ?? null,
      failedAt: null,
      completedAt: null,
    },
  })

  return result.count > 0
}

export async function completeWorkOrderAllocationRun(
  input: {
    allocationRunId: string
    allocatedRowCount: number
    shortageCount: number
    completedAt?: Date
  },
  client: WorkOrderAllocationDbClient = db,
) {
  const result = await client.flooringWorkOrderAllocationRun.updateMany({
    where: {
      id: input.allocationRunId,
      status: "PROCESSING",
    },
    data: {
      status: "COMPLETED",
      completedAt: input.completedAt ?? new Date(),
      allocatedRowCount: input.allocatedRowCount,
      shortageCount: input.shortageCount,
      failureCode: null,
      failureMessage: null,
    },
  })

  return result.count > 0
}

export async function failWorkOrderAllocationRun(
  input: {
    allocationRunId: string
    failureMessage: string
    failureCode?: string | null
    failedAt?: Date
  },
  client: WorkOrderAllocationDbClient = db,
) {
  const result = await client.flooringWorkOrderAllocationRun.updateMany({
    where: {
      id: input.allocationRunId,
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

export async function supersedeWorkOrderAllocationRun(
  input: {
    allocationRunId: string
  },
  client: WorkOrderAllocationDbClient = db,
) {
  const result = await client.flooringWorkOrderAllocationRun.updateMany({
    where: {
      id: input.allocationRunId,
      status: {
        in: ["REQUESTED", "QUEUED", "PROCESSING"],
      },
    },
    data: {
      status: "SUPERSEDED",
      failedAt: null,
      failureCode: null,
      failureMessage: null,
      completedAt: null,
    },
  })

  return result.count > 0
}

export async function supersedePendingWorkOrderAllocationRuns(
  input: {
    workOrderId: string
    excludeSourceVersion?: Date
  },
  client: WorkOrderAllocationDbClient = db,
) {
  return client.flooringWorkOrderAllocationRun.updateMany({
    where: {
      workOrderId: input.workOrderId,
      status: {
        in: ["REQUESTED", "QUEUED"],
      },
      ...(input.excludeSourceVersion
        ? {
            sourceVersion: {
              not: input.excludeSourceVersion,
            },
          }
        : {}),
    },
    data: {
      status: "SUPERSEDED",
      failedAt: null,
      failureCode: null,
      failureMessage: null,
      completedAt: null,
    },
  })
}
