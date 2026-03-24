import type { DataAccessContext } from "@/server/db/context"
import { prisma } from "@/server/db/prisma"
import { createAppError } from "@/server/http/api-helpers"
import type { TablePreferencePayload } from "@/features/flooring/shared/controllers/table/table-preferences"

export type TablePreferenceInput = TablePreferencePayload & {
  allowedColumnKeys: string[]
}

export function normalizeTablePreferenceInput(body: unknown): TablePreferenceInput {
  if (!body || typeof body !== "object") {
    throw createAppError("Invalid request body")
  }

  const rawHiddenColumnKeys = (body as { hiddenColumnKeys?: unknown }).hiddenColumnKeys
  const rawColumnOrderKeys = (body as { columnOrderKeys?: unknown }).columnOrderKeys
  const rawAllowedColumnKeys = (body as { allowedColumnKeys?: unknown }).allowedColumnKeys

  if (
    !Array.isArray(rawHiddenColumnKeys) ||
    !rawHiddenColumnKeys.every((key) => typeof key === "string") ||
    !Array.isArray(rawColumnOrderKeys) ||
    !rawColumnOrderKeys.every((key) => typeof key === "string") ||
    !Array.isArray(rawAllowedColumnKeys) ||
    !rawAllowedColumnKeys.every((key) => typeof key === "string")
  ) {
    throw createAppError("Invalid request body")
  }

  const allowedColumnKeys = Array.from(new Set(rawAllowedColumnKeys))
  const allowedSet = new Set(allowedColumnKeys)
  const hiddenColumnKeys = Array.from(new Set(rawHiddenColumnKeys.filter((key) => allowedSet.has(key))))
  const columnOrderKeys = Array.from(new Set(rawColumnOrderKeys.filter((key) => allowedSet.has(key))))

  for (const key of allowedColumnKeys) {
    if (!columnOrderKeys.includes(key)) {
      columnOrderKeys.push(key)
    }
  }

  return {
    hiddenColumnKeys,
    columnOrderKeys,
    allowedColumnKeys,
  }
}

export async function getUserTablePreference(
  userId: string,
  tableKey: string,
  db: DataAccessContext = prisma,
): Promise<TablePreferencePayload> {
  const preference = await db.userTablePreference.findUnique({
    where: {
      userId_tableKey: {
        userId,
        tableKey,
      },
    },
    select: {
      hiddenColumnKeys: true,
      columnOrderKeys: true,
    },
  })

  return {
    hiddenColumnKeys: preference?.hiddenColumnKeys ?? [],
    columnOrderKeys: preference?.columnOrderKeys ?? [],
  }
}

export async function saveUserTablePreference(
  userId: string,
  tableKey: string,
  input: TablePreferenceInput,
  db: DataAccessContext = prisma,
): Promise<TablePreferencePayload> {
  const preference = await db.userTablePreference.upsert({
    where: {
      userId_tableKey: {
        userId,
        tableKey,
      },
    },
    update: {
      hiddenColumnKeys: input.hiddenColumnKeys,
      columnOrderKeys: input.columnOrderKeys,
    },
    create: {
      userId,
      tableKey,
      hiddenColumnKeys: input.hiddenColumnKeys,
      columnOrderKeys: input.columnOrderKeys,
    },
    select: {
      hiddenColumnKeys: true,
      columnOrderKeys: true,
    },
  })

  return {
    hiddenColumnKeys: preference.hiddenColumnKeys,
    columnOrderKeys: preference.columnOrderKeys,
  }
}
