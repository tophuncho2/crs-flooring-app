import {
  Prisma,
  getTablePreferenceRecord,
  getLegacyTablePreferenceRecord,
  upsertTablePreferenceRecord,
  upsertLegacyTablePreferenceRecord,
  type DataAccessContext,
  type FullTablePreferenceRecord,
  type LegacyTablePreferenceRecord,
  prisma,
} from "@builders/db"
import {
  DEFAULT_TABLE_PREFERENCE_PAYLOAD,
  normalizeTableFilterValues,
  type TableFilterPreferenceMap,
  type TablePreferencePayload,
} from "@builders/domain"
import { TablePreferenceExecutionError } from "./errors.js"

export type TablePreferenceInput = Partial<TablePreferencePayload>
export type ResolvedTablePreference = TablePreferencePayload & {
  hasSavedPreference: boolean
}

const USER_TABLE_PREFERENCE_VIEW_STATE_COLUMNS = [
  "UserTablePreference.isAscendingSort",
  "UserTablePreference.isGroupingEnabled",
  "UserTablePreference.groupByKeys",
  "UserTablePreference.filtersJson",
] as const

function parseStringArray(value: unknown) {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    throw new TablePreferenceExecutionError({
      code: "INVALID_INPUT",
      message: "Invalid request body",
      status: 400,
    })
  }

  return Array.from(new Set(value))
}

function normalizeAllowedFilterValues(value: unknown) {
  if (value === undefined) {
    return undefined
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TablePreferenceExecutionError({
      code: "INVALID_INPUT",
      message: "Invalid request body",
      status: 400,
    })
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, allowedValues]) => [key, parseStringArray(allowedValues)]),
  ) as Record<string, string[]>
}

function normalizeStoredFilters(value: Prisma.JsonValue | null | undefined): TableFilterPreferenceMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value)
      .flatMap(([key, rawValue]) => {
        if (Array.isArray(rawValue) && rawValue.every((item) => typeof item === "string")) {
          return [[key, normalizeTableFilterValues(rawValue)] as const]
        }

        if (typeof rawValue === "string" && rawValue.length > 0) {
          return [[key, [rawValue]] as const]
        }

        return []
      }),
  )
}

function createColumnVisibility(hiddenColumnKeys: string[], columnOrder: string[]) {
  return Object.fromEntries(
    Array.from(new Set([...columnOrder, ...hiddenColumnKeys])).map((key) => [key, !hiddenColumnKeys.includes(key)]),
  )
}

function normalizeTablePreferenceRecord(preference: FullTablePreferenceRecord | null): ResolvedTablePreference {
  return {
    hasSavedPreference: Boolean(preference),
    sort: {
      key: "",
      direction: preference?.isAscendingSort === false ? "desc" : DEFAULT_TABLE_PREFERENCE_PAYLOAD.sort.direction,
    },
    filters: normalizeStoredFilters(preference?.filtersJson),
    columnVisibility: createColumnVisibility(
      preference?.hiddenColumnKeys ?? [],
      preference?.columnOrderKeys ?? [],
    ),
    columnOrder: preference?.columnOrderKeys ?? DEFAULT_TABLE_PREFERENCE_PAYLOAD.columnOrder,
    grouping: {
      enabled: preference?.isGroupingEnabled ?? DEFAULT_TABLE_PREFERENCE_PAYLOAD.grouping.enabled,
      keys: preference?.groupByKeys ?? DEFAULT_TABLE_PREFERENCE_PAYLOAD.grouping.keys,
    },
  }
}

function normalizeLegacyTablePreferenceRecord(preference: LegacyTablePreferenceRecord | null): ResolvedTablePreference {
  return {
    hasSavedPreference: Boolean(preference),
    sort: DEFAULT_TABLE_PREFERENCE_PAYLOAD.sort,
    filters: DEFAULT_TABLE_PREFERENCE_PAYLOAD.filters,
    columnVisibility: createColumnVisibility(
      preference?.hiddenColumnKeys ?? [],
      preference?.columnOrderKeys ?? [],
    ),
    columnOrder: preference?.columnOrderKeys ?? DEFAULT_TABLE_PREFERENCE_PAYLOAD.columnOrder,
    grouping: DEFAULT_TABLE_PREFERENCE_PAYLOAD.grouping,
  }
}

function toTablePreferencePayload(preference: ResolvedTablePreference): TablePreferencePayload {
  return {
    sort: preference.sort,
    filters: preference.filters,
    columnVisibility: preference.columnVisibility,
    columnOrder: preference.columnOrder,
    grouping: preference.grouping,
  }
}

function isMissingUserTablePreferenceViewStateColumnError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2022" &&
    USER_TABLE_PREFERENCE_VIEW_STATE_COLUMNS.some((column) => error.message.includes(column))
  )
}

function logLegacyTablePreferenceFallback(action: "read" | "write", tableKey: string, error: unknown) {
  const payload = {
    timestamp: new Date().toISOString(),
    level: "warn",
    service: "web",
    environment: process.env.NODE_ENV ?? "development",
    message: "Falling back to legacy table preference storage because view-state columns are missing",
    action: `account.tablePreferences.${action}.legacyFallback`,
    details: {
      entityType: "userTablePreference",
      entityId: tableKey,
      tableKey,
      missingColumns: USER_TABLE_PREFERENCE_VIEW_STATE_COLUMNS,
    },
    error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
  }
  console.warn(JSON.stringify(payload))
}

function normalizeColumnVisibility(
  value: unknown,
  allowedColumnKeys: string[],
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TablePreferenceExecutionError({
      code: "INVALID_INPUT",
      message: "Invalid request body",
      status: 400,
    })
  }

  const allowedColumnSet = new Set(allowedColumnKeys)
  const entries = Object.entries(value)
  for (const [key, visible] of entries) {
    if (!allowedColumnSet.has(key) || typeof visible !== "boolean") {
      throw new TablePreferenceExecutionError({
        code: "INVALID_INPUT",
        message: "Invalid request body",
        status: 400,
      })
    }
  }

  return Object.fromEntries(entries) as Record<string, boolean>
}

function normalizeColumnOrder(
  value: unknown,
  allowedColumnKeys: string[],
) {
  const requestedKeys = parseStringArray(value)
  const allowedColumnSet = new Set(allowedColumnKeys)

  if (requestedKeys.some((key) => !allowedColumnSet.has(key))) {
    throw new TablePreferenceExecutionError({
      code: "INVALID_INPUT",
      message: "Invalid request body",
      status: 400,
    })
  }

  const normalizedOrder = [...requestedKeys]
  for (const key of allowedColumnKeys) {
    if (!normalizedOrder.includes(key)) {
      normalizedOrder.push(key)
    }
  }

  return normalizedOrder
}

function normalizeSort(
  value: unknown,
  allowedSortKeys: string[],
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TablePreferenceExecutionError({
      code: "INVALID_INPUT",
      message: "Invalid request body",
      status: 400,
    })
  }

  const rawValue = value as Record<string, unknown>
  const key = typeof rawValue.key === "string" ? rawValue.key.trim() : ""
  const direction = rawValue.direction

  if (!allowedSortKeys.includes(key) || (direction !== "asc" && direction !== "desc")) {
    throw new TablePreferenceExecutionError({
      code: "INVALID_INPUT",
      message: "Invalid request body",
      status: 400,
    })
  }

  return {
    key,
    direction,
  } as TablePreferencePayload["sort"]
}

function normalizeGrouping(
  value: unknown,
  allowedGroupKeys: string[],
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TablePreferenceExecutionError({
      code: "INVALID_INPUT",
      message: "Invalid request body",
      status: 400,
    })
  }

  const rawValue = value as Record<string, unknown>
  const enabled = rawValue.enabled
  const keys = rawValue.keys

  if (typeof enabled !== "boolean") {
    throw new TablePreferenceExecutionError({
      code: "INVALID_INPUT",
      message: "Invalid request body",
      status: 400,
    })
  }

  const normalizedKeys = parseStringArray(keys).slice(0, 3)
  if (normalizedKeys.some((key) => !allowedGroupKeys.includes(key))) {
    throw new TablePreferenceExecutionError({
      code: "INVALID_INPUT",
      message: "Invalid request body",
      status: 400,
    })
  }

  return {
    enabled,
    keys: enabled ? normalizedKeys : [],
  } as TablePreferencePayload["grouping"]
}

function normalizeFilters(
  value: unknown,
  allowedFilterValues: Record<string, string[]>,
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TablePreferenceExecutionError({
      code: "INVALID_INPUT",
      message: "Invalid request body",
      status: 400,
    })
  }

  const entries = Object.entries(value)
  const normalizedEntries = entries.map(([key, rawValues]) => {
    const allowedValues = allowedFilterValues[key]
    if (!allowedValues) {
      throw new TablePreferenceExecutionError({
        code: "INVALID_INPUT",
        message: "Invalid request body",
        status: 400,
      })
    }

    const values = Array.isArray(rawValues)
      ? parseStringArray(rawValues)
      : typeof rawValues === "string"
        ? [rawValues]
        : (() => {
            throw new TablePreferenceExecutionError({
              code: "INVALID_INPUT",
              message: "Invalid request body",
              status: 400,
            })
          })()
    if (values.some((entry) => !allowedValues.includes(entry))) {
      throw new TablePreferenceExecutionError({
        code: "INVALID_INPUT",
        message: "Invalid request body",
        status: 400,
      })
    }

    return [key, normalizeTableFilterValues(values)] as const
  })

  return Object.fromEntries(normalizedEntries) as TablePreferencePayload["filters"]
}

export function normalizeTablePreferenceInput(body: unknown): TablePreferenceInput {
  if (!body || typeof body !== "object") {
    throw new TablePreferenceExecutionError({
      code: "INVALID_INPUT",
      message: "Invalid request body",
      status: 400,
    })
  }

  const rawBody = body as Record<string, unknown>
  const rawState = rawBody.state
  if (!rawState || typeof rawState !== "object" || Array.isArray(rawState)) {
    throw new TablePreferenceExecutionError({
      code: "INVALID_INPUT",
      message: "Invalid request body",
      status: 400,
    })
  }

  const state = rawState as Record<string, unknown>
  const nextPreference: TablePreferenceInput = {}
  const allowedColumnKeys = rawBody.allowedColumnKeys === undefined ? undefined : parseStringArray(rawBody.allowedColumnKeys)
  const allowedSortKeys = rawBody.allowedSortKeys === undefined
    ? allowedColumnKeys
    : parseStringArray(rawBody.allowedSortKeys)
  const allowedGroupKeys = rawBody.allowedGroupKeys === undefined ? undefined : parseStringArray(rawBody.allowedGroupKeys)
  const allowedFilterValues = normalizeAllowedFilterValues(rawBody.allowedFilterValues)

  if (state.columnVisibility !== undefined) {
    if (!allowedColumnKeys) {
      throw new TablePreferenceExecutionError({
        code: "INVALID_INPUT",
        message: "Invalid request body",
        status: 400,
      })
    }

    nextPreference.columnVisibility = normalizeColumnVisibility(state.columnVisibility, allowedColumnKeys)
  }

  if (state.columnOrder !== undefined) {
    if (!allowedColumnKeys) {
      throw new TablePreferenceExecutionError({
        code: "INVALID_INPUT",
        message: "Invalid request body",
        status: 400,
      })
    }

    nextPreference.columnOrder = normalizeColumnOrder(state.columnOrder, allowedColumnKeys)
  }

  if (state.sort !== undefined) {
    if (!allowedSortKeys || allowedSortKeys.length === 0) {
      throw new TablePreferenceExecutionError({
        code: "INVALID_INPUT",
        message: "Invalid request body",
        status: 400,
      })
    }

    nextPreference.sort = normalizeSort(state.sort, allowedSortKeys)
  }

  if (state.grouping !== undefined) {
    if (!allowedGroupKeys) {
      throw new TablePreferenceExecutionError({
        code: "INVALID_INPUT",
        message: "Invalid request body",
        status: 400,
      })
    }

    nextPreference.grouping = normalizeGrouping(state.grouping, allowedGroupKeys)
  }

  if (state.filters !== undefined) {
    if (!allowedFilterValues) {
      throw new TablePreferenceExecutionError({
        code: "INVALID_INPUT",
        message: "Invalid request body",
        status: 400,
      })
    }

    nextPreference.filters = normalizeFilters(state.filters, allowedFilterValues)
  }

  return nextPreference
}

function mergeTablePreferencePayload(
  currentPreference: TablePreferencePayload,
  input: TablePreferenceInput,
): TablePreferencePayload {
  return {
    sort: input.sort ?? currentPreference.sort,
    filters: input.filters ?? currentPreference.filters,
    columnVisibility: input.columnVisibility
      ? {
          ...currentPreference.columnVisibility,
          ...input.columnVisibility,
        }
      : currentPreference.columnVisibility,
    columnOrder: input.columnOrder ?? currentPreference.columnOrder,
    grouping: input.grouping ?? currentPreference.grouping,
  }
}

function toStoredHiddenColumnKeys(preference: TablePreferencePayload) {
  const allColumnKeys = Array.from(
    new Set([...preference.columnOrder, ...Object.keys(preference.columnVisibility)]),
  )

  return allColumnKeys.filter((key) => preference.columnVisibility[key] === false)
}

export async function getUserTablePreference(
  userId: string,
  tableKey: string,
  db: DataAccessContext = prisma,
): Promise<TablePreferencePayload> {
  const normalized = await getResolvedUserTablePreference(userId, tableKey, db)
  return toTablePreferencePayload(normalized)
}

export async function getResolvedUserTablePreference(
  userId: string,
  tableKey: string,
  db: DataAccessContext = prisma,
): Promise<ResolvedTablePreference> {
  try {
    const preference = await getTablePreferenceRecord(userId, tableKey, db)
    return normalizeTablePreferenceRecord(preference)
  } catch (error) {
    if (!isMissingUserTablePreferenceViewStateColumnError(error)) {
      throw error
    }

    logLegacyTablePreferenceFallback("read", tableKey, error)
    const legacyPreference = await getLegacyTablePreferenceRecord(userId, tableKey, db)
    return normalizeLegacyTablePreferenceRecord(legacyPreference)
  }
}

export async function saveUserTablePreference(
  userId: string,
  tableKey: string,
  input: TablePreferenceInput,
  db: DataAccessContext = prisma,
): Promise<TablePreferencePayload> {
  const currentPreference = await getResolvedUserTablePreference(userId, tableKey, db)
  const nextPreference = mergeTablePreferencePayload(currentPreference, input)
  const hiddenColumnKeys = toStoredHiddenColumnKeys(nextPreference)

  try {
    const preference = await upsertTablePreferenceRecord(userId, tableKey, {
      hiddenColumnKeys,
      columnOrderKeys: nextPreference.columnOrder,
      isAscendingSort: nextPreference.sort.direction === "asc",
      isGroupingEnabled: nextPreference.grouping.enabled,
      groupByKeys: nextPreference.grouping.keys,
      filtersJson: nextPreference.filters,
    }, db)

    const normalizedPreference = normalizeTablePreferenceRecord(preference)
    return {
      ...toTablePreferencePayload(normalizedPreference),
      sort: nextPreference.sort,
    }
  } catch (error) {
    if (!isMissingUserTablePreferenceViewStateColumnError(error)) {
      throw error
    }

    logLegacyTablePreferenceFallback("write", tableKey, error)
    const legacyPreference = await upsertLegacyTablePreferenceRecord(userId, tableKey, {
      hiddenColumnKeys,
      columnOrderKeys: nextPreference.columnOrder,
    }, db)

    const normalizedPreference = normalizeLegacyTablePreferenceRecord(legacyPreference)
    return {
      ...toTablePreferencePayload(normalizedPreference),
      sort: nextPreference.sort,
    }
  }
}
