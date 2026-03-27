import { Prisma } from "@prisma/client"
import { db } from "../client.js"

type OutboxDbClient = Prisma.TransactionClient | typeof db

export type QueueOutboxEventStatusRecord = "PENDING" | "PROCESSING" | "DISPATCHED" | "EXHAUSTED"

export type QueueOutboxEventRecord = {
  id: string
  topic: string
  aggregateType: string
  aggregateId: string
  idempotencyKey: string
  payloadJson: Prisma.JsonValue
  status: QueueOutboxEventStatusRecord
  availableAt: string
  lockedAt: string | null
  lockedBy: string | null
  dispatchedAt: string | null
  attemptCount: number
  lastError: string | null
  createdAt: string
  updatedAt: string
}

const queueOutboxEventSelect = {
  id: true,
  topic: true,
  aggregateType: true,
  aggregateId: true,
  idempotencyKey: true,
  payloadJson: true,
  status: true,
  availableAt: true,
  lockedAt: true,
  lockedBy: true,
  dispatchedAt: true,
  attemptCount: true,
  lastError: true,
  createdAt: true,
  updatedAt: true,
} as const

function toQueueOutboxEventRecord(event: {
  id: string
  topic: string
  aggregateType: string
  aggregateId: string
  idempotencyKey: string
  payloadJson: Prisma.JsonValue
  status: QueueOutboxEventStatusRecord
  availableAt: Date
  lockedAt: Date | null
  lockedBy: string | null
  dispatchedAt: Date | null
  attemptCount: number
  lastError: string | null
  createdAt: Date
  updatedAt: Date
}): QueueOutboxEventRecord {
  return {
    id: event.id,
    topic: event.topic,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    idempotencyKey: event.idempotencyKey,
    payloadJson: event.payloadJson,
    status: event.status,
    availableAt: event.availableAt.toISOString(),
    lockedAt: event.lockedAt?.toISOString() ?? null,
    lockedBy: event.lockedBy,
    dispatchedAt: event.dispatchedAt?.toISOString() ?? null,
    attemptCount: event.attemptCount,
    lastError: event.lastError,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  }
}

export async function createQueueOutboxEvent(
  input: {
    topic: string
    aggregateType: string
    aggregateId: string
    idempotencyKey: string
    payloadJson: Prisma.InputJsonValue
    availableAt?: Date
  },
  client: OutboxDbClient = db,
) {
  const event = await client.queueOutboxEvent.create({
    data: {
      topic: input.topic,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      idempotencyKey: input.idempotencyKey,
      payloadJson: input.payloadJson,
      status: "PENDING",
      availableAt: input.availableAt ?? new Date(),
    },
    select: queueOutboxEventSelect,
  })

  return toQueueOutboxEventRecord(event)
}

export async function listClaimableQueueOutboxEvents(
  input: {
    limit: number
    now?: Date
    lockStaleBefore?: Date
  },
  client: OutboxDbClient = db,
) {
  const now = input.now ?? new Date()
  const lockStaleBefore = input.lockStaleBefore ?? now

  const events = await client.queueOutboxEvent.findMany({
    where: {
      availableAt: {
        lte: now,
      },
      OR: [
        {
          status: "PENDING",
          lockedAt: null,
        },
        {
          status: "PENDING",
          lockedAt: {
            lte: lockStaleBefore,
          },
        },
        {
          status: "PROCESSING",
          lockedAt: {
            lte: lockStaleBefore,
          },
        },
      ],
    },
    orderBy: [
      { availableAt: "asc" },
      { createdAt: "asc" },
    ],
    take: input.limit,
    select: queueOutboxEventSelect,
  })

  return events.map(toQueueOutboxEventRecord)
}

export async function claimQueueOutboxEvent(
  input: {
    eventId: string
    lockedAt?: Date
    lockedBy: string
    lockStaleBefore?: Date
  },
  client: OutboxDbClient = db,
) {
  const lockedAt = input.lockedAt ?? new Date()
  const lockStaleBefore = input.lockStaleBefore ?? lockedAt

  const result = await client.queueOutboxEvent.updateMany({
    where: {
      id: input.eventId,
      OR: [
        {
          status: "PENDING",
          lockedAt: null,
        },
        {
          status: "PENDING",
          lockedAt: {
            lte: lockStaleBefore,
          },
        },
        {
          status: "PROCESSING",
          lockedAt: {
            lte: lockStaleBefore,
          },
        },
      ],
    },
    data: {
      status: "PROCESSING",
      lockedAt,
      lockedBy: input.lockedBy,
      attemptCount: {
        increment: 1,
      },
    },
  })

  if (result.count === 0) {
    return null
  }

  const event = await client.queueOutboxEvent.findUniqueOrThrow({
    where: { id: input.eventId },
    select: queueOutboxEventSelect,
  })

  return toQueueOutboxEventRecord(event)
}

export async function markQueueOutboxEventDispatched(
  input: {
    eventId: string
    dispatchedAt?: Date
  },
  client: OutboxDbClient = db,
) {
  const event = await client.queueOutboxEvent.update({
    where: { id: input.eventId },
    data: {
      status: "DISPATCHED",
      dispatchedAt: input.dispatchedAt ?? new Date(),
      lockedAt: null,
      lockedBy: null,
      lastError: null,
    },
    select: queueOutboxEventSelect,
  })

  return toQueueOutboxEventRecord(event)
}

export async function retryQueueOutboxEvent(
  input: {
    eventId: string
    availableAt: Date
    lastError: string
  },
  client: OutboxDbClient = db,
) {
  const event = await client.queueOutboxEvent.update({
    where: { id: input.eventId },
    data: {
      status: "PENDING",
      availableAt: input.availableAt,
      lockedAt: null,
      lockedBy: null,
      lastError: input.lastError,
    },
    select: queueOutboxEventSelect,
  })

  return toQueueOutboxEventRecord(event)
}

export async function exhaustQueueOutboxEvent(
  input: {
    eventId: string
    lastError: string
  },
  client: OutboxDbClient = db,
) {
  const event = await client.queueOutboxEvent.update({
    where: { id: input.eventId },
    data: {
      status: "EXHAUSTED",
      lockedAt: null,
      lockedBy: null,
      lastError: input.lastError,
    },
    select: queueOutboxEventSelect,
  })

  return toQueueOutboxEventRecord(event)
}
