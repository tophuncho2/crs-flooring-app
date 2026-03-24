import type { Prisma } from "@prisma/client"
import type { DataAccessContext } from "@/server/db/context"
import { prisma } from "@/server/db/prisma"
import { createAppError } from "@/server/http/api-helpers"
import {
  DEFAULT_TABLE_PREFERENCE_PAYLOAD,
  type TableFilterPreferenceMap,
  type TablePreferencePayload,
} from "@/features/flooring/shared/controllers/table/table-preferences"

export type TablePreferenceInput = Partial<TablePreferencePayload>
export type ResolvedTablePreference = TablePreferencePayload & {
  hasSavedPreference: boolean
}

function normalizeStoredFilters(value: Prisma.JsonValue | null | undefined): TableFilterPreferenceMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string"),
  )
}

function normalizeAllowedFilterValues(value: unknown) {
  if (value === undefined) {
    return undefined
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw createAppError("Invalid request body")
  }

  const entries = Object.entries(value)
  for (const [, allowedValues] of entries) {
    if (!Array.isArray(allowedValues) || !allowedValues.every((entry) => typeof entry === "string")) {
      throw createAppError("Invalid request body")
    }
  }

  return Object.fromEntries(entries.map(([key, allowedValues]) => [key, Array.from(new Set(allowedValues as string[]))]))
}

export function normalizeTablePreferenceInput(body: unknown): TablePreferenceInput {
  if (!body || typeof body !== "object") {
    throw createAppError("Invalid request body")
  }

  const rawBody = body as Record<string, unknown>
  const nextPreference: TablePreferenceInput = {}
  const rawAllowedColumnKeys = rawBody.allowedColumnKeys
  const rawAllowedGroupKeys = rawBody.allowedGroupKeys
  const allowedFilterValues = normalizeAllowedFilterValues(rawBody.allowedFilterValues)

  if (rawBody.hiddenColumnKeys !== undefined || rawBody.columnOrderKeys !== undefined) {
    if (
      !Array.isArray(rawAllowedColumnKeys) ||
      !rawAllowedColumnKeys.every((key) => typeof key === "string")
    ) {
      throw createAppError("Invalid request body")
    }

    const allowedColumnKeys = Array.from(new Set(rawAllowedColumnKeys))
    const allowedColumnSet = new Set(allowedColumnKeys)

    if (rawBody.hiddenColumnKeys !== undefined) {
      if (!Array.isArray(rawBody.hiddenColumnKeys) || !rawBody.hiddenColumnKeys.every((key) => typeof key === "string")) {
        throw createAppError("Invalid request body")
      }

      nextPreference.hiddenColumnKeys = Array.from(
        new Set(rawBody.hiddenColumnKeys.filter((key): key is string => typeof key === "string" && allowedColumnSet.has(key))),
      )
    }

    if (rawBody.columnOrderKeys !== undefined) {
      if (!Array.isArray(rawBody.columnOrderKeys) || !rawBody.columnOrderKeys.every((key) => typeof key === "string")) {
        throw createAppError("Invalid request body")
      }

      const columnOrderKeys = Array.from(
        new Set(rawBody.columnOrderKeys.filter((key): key is string => typeof key === "string" && allowedColumnSet.has(key))),
      )

      for (const key of allowedColumnKeys) {
        if (!columnOrderKeys.includes(key)) {
          columnOrderKeys.push(key)
        }
      }

      nextPreference.columnOrderKeys = columnOrderKeys
    }
  }

  if (rawBody.isAscendingSort !== undefined) {
    if (typeof rawBody.isAscendingSort !== "boolean") {
      throw createAppError("Invalid request body")
    }

    nextPreference.isAscendingSort = rawBody.isAscendingSort
  }

  if (rawBody.isGroupingEnabled !== undefined) {
    if (typeof rawBody.isGroupingEnabled !== "boolean") {
      throw createAppError("Invalid request body")
    }

    nextPreference.isGroupingEnabled = rawBody.isGroupingEnabled
  }

  if (rawBody.groupByKeys !== undefined) {
    if (
      !Array.isArray(rawBody.groupByKeys) ||
      !rawBody.groupByKeys.every((key) => typeof key === "string") ||
      !Array.isArray(rawAllowedGroupKeys) ||
      !rawAllowedGroupKeys.every((key) => typeof key === "string")
    ) {
      throw createAppError("Invalid request body")
    }

    const allowedGroupSet = new Set(rawAllowedGroupKeys)
    nextPreference.groupByKeys = Array.from(
      new Set(rawBody.groupByKeys.filter((key): key is string => typeof key === "string" && allowedGroupSet.has(key))),
    ).slice(0, 3)
  }

  if (rawBody.filters !== undefined) {
    if (!rawBody.filters || typeof rawBody.filters !== "object" || Array.isArray(rawBody.filters) || !allowedFilterValues) {
      throw createAppError("Invalid request body")
    }

    const filters = Object.fromEntries(
      Object.entries(rawBody.filters).filter(([key, value]) => (
        typeof value === "string" &&
        Object.prototype.hasOwnProperty.call(allowedFilterValues, key) &&
        allowedFilterValues[key]?.includes(value)
      )),
    )

    nextPreference.filters = filters
  }

  return nextPreference
}

function normalizeTablePreferenceRecord(preference: {
  hiddenColumnKeys: string[]
  columnOrderKeys: string[]
  isAscendingSort: boolean
  isGroupingEnabled: boolean
  groupByKeys: string[]
  filtersJson: Prisma.JsonValue | null
} | null): ResolvedTablePreference {
  return {
    hasSavedPreference: Boolean(preference),
    hiddenColumnKeys: preference?.hiddenColumnKeys ?? DEFAULT_TABLE_PREFERENCE_PAYLOAD.hiddenColumnKeys,
    columnOrderKeys: preference?.columnOrderKeys ?? DEFAULT_TABLE_PREFERENCE_PAYLOAD.columnOrderKeys,
    isAscendingSort: preference?.isAscendingSort ?? DEFAULT_TABLE_PREFERENCE_PAYLOAD.isAscendingSort,
    isGroupingEnabled: preference?.isGroupingEnabled ?? DEFAULT_TABLE_PREFERENCE_PAYLOAD.isGroupingEnabled,
    groupByKeys: preference?.groupByKeys ?? DEFAULT_TABLE_PREFERENCE_PAYLOAD.groupByKeys,
    filters: normalizeStoredFilters(preference?.filtersJson),
  }
}

export async function getUserTablePreference(
  userId: string,
  tableKey: string,
  db: DataAccessContext = prisma,
): Promise<TablePreferencePayload> {
  const normalized = await getResolvedUserTablePreference(userId, tableKey, db)
  return {
    hiddenColumnKeys: normalized.hiddenColumnKeys,
    columnOrderKeys: normalized.columnOrderKeys,
    isAscendingSort: normalized.isAscendingSort,
    isGroupingEnabled: normalized.isGroupingEnabled,
    groupByKeys: normalized.groupByKeys,
    filters: normalized.filters,
  }
}

export async function getResolvedUserTablePreference(
  userId: string,
  tableKey: string,
  db: DataAccessContext = prisma,
): Promise<ResolvedTablePreference> {
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
      isAscendingSort: true,
      isGroupingEnabled: true,
      groupByKeys: true,
      filtersJson: true,
    },
  })

  return normalizeTablePreferenceRecord(preference)
}

export async function saveUserTablePreference(
  userId: string,
  tableKey: string,
  input: TablePreferenceInput,
  db: DataAccessContext = prisma,
): Promise<TablePreferencePayload> {
  const existing = await db.userTablePreference.findUnique({
    where: {
      userId_tableKey: {
        userId,
        tableKey,
      },
    },
    select: {
      hiddenColumnKeys: true,
      columnOrderKeys: true,
      isAscendingSort: true,
      isGroupingEnabled: true,
      groupByKeys: true,
      filtersJson: true,
    },
  })
  const currentPreference = normalizeTablePreferenceRecord(existing)
  const nextPreference: TablePreferencePayload = {
    hiddenColumnKeys: input.hiddenColumnKeys ?? currentPreference.hiddenColumnKeys,
    columnOrderKeys: input.columnOrderKeys ?? currentPreference.columnOrderKeys,
    isAscendingSort: input.isAscendingSort ?? currentPreference.isAscendingSort,
    isGroupingEnabled: input.isGroupingEnabled ?? currentPreference.isGroupingEnabled,
    groupByKeys: input.groupByKeys ?? currentPreference.groupByKeys,
    filters: input.filters ?? currentPreference.filters,
  }

  const preference = await db.userTablePreference.upsert({
    where: {
      userId_tableKey: {
        userId,
        tableKey,
      },
    },
    update: {
      hiddenColumnKeys: nextPreference.hiddenColumnKeys,
      columnOrderKeys: nextPreference.columnOrderKeys,
      isAscendingSort: nextPreference.isAscendingSort,
      isGroupingEnabled: nextPreference.isGroupingEnabled,
      groupByKeys: nextPreference.groupByKeys,
      filtersJson: nextPreference.filters,
    },
    create: {
      userId,
      tableKey,
      hiddenColumnKeys: nextPreference.hiddenColumnKeys,
      columnOrderKeys: nextPreference.columnOrderKeys,
      isAscendingSort: nextPreference.isAscendingSort,
      isGroupingEnabled: nextPreference.isGroupingEnabled,
      groupByKeys: nextPreference.groupByKeys,
      filtersJson: nextPreference.filters,
    },
    select: {
      hiddenColumnKeys: true,
      columnOrderKeys: true,
      isAscendingSort: true,
      isGroupingEnabled: true,
      groupByKeys: true,
      filtersJson: true,
    },
  })

  const normalized = normalizeTablePreferenceRecord(preference)
  return {
    hiddenColumnKeys: normalized.hiddenColumnKeys,
    columnOrderKeys: normalized.columnOrderKeys,
    isAscendingSort: normalized.isAscendingSort,
    isGroupingEnabled: normalized.isGroupingEnabled,
    groupByKeys: normalized.groupByKeys,
    filters: normalized.filters,
  }
}
