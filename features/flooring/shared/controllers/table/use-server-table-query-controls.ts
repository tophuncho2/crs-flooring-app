"use client"

type GroupOption = {
  key: string
  label: string
}

export function useServerTableQueryControls({
  setSearchQuery,
  setIsAscendingSort,
  isGroupingEnabled,
  setIsGroupingEnabled,
  groupByKeys,
  setGroupByKeys,
  groupOptions,
}: {
  searchQuery: string
  setSearchQuery: (value: string) => void
  isAscendingSort: boolean
  setIsAscendingSort: (value: boolean | ((current: boolean) => boolean)) => void
  isGroupingEnabled: boolean
  setIsGroupingEnabled: (value: boolean | ((current: boolean) => boolean)) => void
  groupByKeys: string[]
  setGroupByKeys: (value: string[]) => void
  groupOptions: GroupOption[]
}) {
  return {
    onSearchQueryChange: (value: string) => setSearchQuery(value),
    onToggleSort: () => setIsAscendingSort((current) => !current),
    onToggleGroupByKey: (columnKey: string) => {
      if (!groupOptions.some((option) => option.key === columnKey)) {
        return
      }

      const existingIndex = groupByKeys.indexOf(columnKey)
      const nextGroupByKeys = existingIndex >= 0
        ? groupByKeys.slice(0, existingIndex)
        : [...groupByKeys, columnKey]

      setGroupByKeys(nextGroupByKeys)
      setIsGroupingEnabled(nextGroupByKeys.length > 0)
    },
    onToggleGrouping: () => setIsGroupingEnabled(!isGroupingEnabled),
    onGroupByKeyAtIndexChange: (index: number, nextKey: string) => {
      const nextGroupByKeys = [...groupByKeys]
      nextGroupByKeys[index] = nextKey
      setGroupByKeys(nextGroupByKeys.filter(Boolean))
    },
    onAddGroupBy: () => {
      const nextKey = groupOptions.find((option) => !groupByKeys.includes(option.key))?.key
      if (!nextKey) return
      setGroupByKeys([...groupByKeys, nextKey])
      setIsGroupingEnabled(true)
    },
    onRemoveGroupBy: (index: number) => {
      const nextGroupByKeys = groupByKeys.filter((_, currentIndex) => currentIndex !== index)
      setGroupByKeys(nextGroupByKeys)
      setIsGroupingEnabled(nextGroupByKeys.length > 0)
    },
  }
}
