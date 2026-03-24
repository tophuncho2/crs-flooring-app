export type TableFilterPreferenceMap = Record<string, string>

export type TablePreferencePayload = {
  hiddenColumnKeys: string[]
  columnOrderKeys: string[]
  isAscendingSort: boolean
  isGroupingEnabled: boolean
  groupByKeys: string[]
  filters: TableFilterPreferenceMap
}

export const DEFAULT_TABLE_PREFERENCE_PAYLOAD: TablePreferencePayload = {
  hiddenColumnKeys: [],
  columnOrderKeys: [],
  isAscendingSort: true,
  isGroupingEnabled: false,
  groupByKeys: [],
  filters: {},
}
