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
