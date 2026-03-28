import { Prisma } from "@prisma/client"
import { db } from "./client.js"

type MutationReceiptDbClient = Prisma.TransactionClient | typeof db

export type AppMutationReceiptRecord = {
  id: string
  scope: string
  userId: string
  idempotencyKey: string
  requestHash: string
  responseStatus: number | null
  responseBodyJson: Prisma.JsonValue | null
  createdAt: string
  completedAt: string | null
  expiresAt: string
}

function toRecord(receipt: {
  id: string
  scope: string
  userId: string
  idempotencyKey: string
  requestHash: string
  responseStatus: number | null
  responseBodyJson: Prisma.JsonValue | null
  createdAt: Date
  completedAt: Date | null
  expiresAt: Date
}): AppMutationReceiptRecord {
  return {
    id: receipt.id,
    scope: receipt.scope,
    userId: receipt.userId,
    idempotencyKey: receipt.idempotencyKey,
    requestHash: receipt.requestHash,
    responseStatus: receipt.responseStatus,
    responseBodyJson: receipt.responseBodyJson,
    createdAt: receipt.createdAt.toISOString(),
    completedAt: receipt.completedAt?.toISOString() ?? null,
    expiresAt: receipt.expiresAt.toISOString(),
  }
}

export async function getAppMutationReceipt(
  input: {
    scope: string
    userId: string
    idempotencyKey: string
  },
  client: MutationReceiptDbClient = db,
) {
  const receipt = await client.appMutationReceipt.findUnique({
    where: {
      scope_userId_idempotencyKey: {
        scope: input.scope,
        userId: input.userId,
        idempotencyKey: input.idempotencyKey,
      },
    },
  })

  return receipt ? toRecord(receipt) : null
}

export async function reserveAppMutationReceipt(
  input: {
    scope: string
    userId: string
    idempotencyKey: string
    requestHash: string
    expiresAt: Date
  },
  client: MutationReceiptDbClient = db,
) {
  const receipt = await client.appMutationReceipt.create({
    data: {
      scope: input.scope,
      userId: input.userId,
      idempotencyKey: input.idempotencyKey,
      requestHash: input.requestHash,
      expiresAt: input.expiresAt,
    },
  })

  return toRecord(receipt)
}

export async function finalizeAppMutationReceipt(
  input: {
    scope: string
    userId: string
    idempotencyKey: string
    responseStatus: number
    responseBodyJson: Prisma.InputJsonValue
  },
  client: MutationReceiptDbClient = db,
) {
  const receipt = await client.appMutationReceipt.update({
    where: {
      scope_userId_idempotencyKey: {
        scope: input.scope,
        userId: input.userId,
        idempotencyKey: input.idempotencyKey,
      },
    },
    data: {
      responseStatus: input.responseStatus,
      responseBodyJson: input.responseBodyJson,
      completedAt: new Date(),
    },
  })

  return toRecord(receipt)
}

export async function deleteExpiredAppMutationReceipts(
  now: Date = new Date(),
  client: MutationReceiptDbClient = db,
) {
  return client.appMutationReceipt.deleteMany({
    where: {
      expiresAt: {
        lt: now,
      },
    },
  })
}
