import { db } from "../client.js"
import type { Prisma } from "@prisma/client"
import type { DataAccessContext } from "../types.js"

export type FullTablePreferenceRecord = {
  hiddenColumnKeys: string[]
  columnOrderKeys: string[]
  isAscendingSort: boolean
  isGroupingEnabled: boolean
  groupByKeys: string[]
  filtersJson: Prisma.JsonValue | null
}

export type LegacyTablePreferenceRecord = {
  hiddenColumnKeys: string[]
  columnOrderKeys: string[]
}

export type UpsertTablePreferenceData = {
  hiddenColumnKeys: string[]
  columnOrderKeys: string[]
  isAscendingSort: boolean
  isGroupingEnabled: boolean
  groupByKeys: string[]
  filtersJson: Prisma.InputJsonValue
}

export type UpsertLegacyTablePreferenceData = {
  hiddenColumnKeys: string[]
  columnOrderKeys: string[]
}

export async function getTablePreferenceRecord(
  userId: string,
  tableKey: string,
  client: DataAccessContext = db,
): Promise<FullTablePreferenceRecord | null> {
  return client.userTablePreference.findUnique({
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
}

export async function getLegacyTablePreferenceRecord(
  userId: string,
  tableKey: string,
  client: DataAccessContext = db,
): Promise<LegacyTablePreferenceRecord | null> {
  return client.userTablePreference.findUnique({
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
}

export async function upsertTablePreferenceRecord(
  userId: string,
  tableKey: string,
  data: UpsertTablePreferenceData,
  client: DataAccessContext = db,
): Promise<FullTablePreferenceRecord> {
  return client.userTablePreference.upsert({
    where: {
      userId_tableKey: {
        userId,
        tableKey,
      },
    },
    update: data,
    create: {
      userId,
      tableKey,
      ...data,
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
}

export async function upsertLegacyTablePreferenceRecord(
  userId: string,
  tableKey: string,
  data: UpsertLegacyTablePreferenceData,
  client: DataAccessContext = db,
): Promise<LegacyTablePreferenceRecord> {
  return client.userTablePreference.upsert({
    where: {
      userId_tableKey: {
        userId,
        tableKey,
      },
    },
    update: data,
    create: {
      userId,
      tableKey,
      ...data,
    },
    select: {
      hiddenColumnKeys: true,
      columnOrderKeys: true,
    },
  })
}
