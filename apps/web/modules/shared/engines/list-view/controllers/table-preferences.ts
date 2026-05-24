// Local table-preference types for the list-view engine scaffold.
//
// These were previously re-exported from `@builders/domain`, but the shared
// user-table-preference feature (domain type + repository + use cases + API
// route) was removed. This engine is dead scaffolding kept in place until its
// consumers migrate off it (see apps/web/components/CLAUDE.md), so it now
// carries its own standalone copy of the shape it needs.

export type TableFilterPreferenceMap = Record<string, string[]>

export type TableSortDirection = "asc" | "desc"

export type TableSortState = {
  key: string
  direction: TableSortDirection
}

export type TableGroupingState = {
  enabled: boolean
  keys: string[]
}

export type TablePreferencePayload = {
  sort: TableSortState
  filters: TableFilterPreferenceMap
  columnVisibility: Record<string, boolean>
  columnOrder: string[]
  grouping: TableGroupingState
}

export const DEFAULT_TABLE_PREFERENCE_PAYLOAD: TablePreferencePayload = {
  sort: {
    key: "",
    direction: "asc",
  },
  filters: {},
  columnVisibility: {},
  columnOrder: [],
  grouping: {
    enabled: false,
    keys: [],
  },
}

export function createDefaultTablePreferencePayload(sortKey = ""): TablePreferencePayload {
  return {
    ...DEFAULT_TABLE_PREFERENCE_PAYLOAD,
    sort: {
      key: sortKey,
      direction: DEFAULT_TABLE_PREFERENCE_PAYLOAD.sort.direction,
    },
  }
}

export function normalizeTableFilterValues(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)))
}
