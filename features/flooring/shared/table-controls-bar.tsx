"use client"

import { type ReactNode } from "react"
import { Search } from "lucide-react"

type GroupOption = {
  key: string
  label: string
}

export default function TableControlsBar({
  searchQuery,
  onSearchQueryChange,
  searchPlaceholder,
  isAscendingSort,
  onToggleSort,
  ascendingSortLabel = "A-Z",
  descendingSortLabel = "Z-A",
  isGroupingEnabled,
  onToggleGrouping,
  showGrouping = true,
  groupOptions = [],
  groupByKey,
  onGroupByKeyChange,
  groupByKeys,
  onGroupByKeyAtIndexChange,
  onAddGroupBy,
  onRemoveGroupBy,
  maxGroupFields = 3,
  children,
}: {
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  searchPlaceholder: string
  isAscendingSort: boolean
  onToggleSort: () => void
  ascendingSortLabel?: string
  descendingSortLabel?: string
  isGroupingEnabled: boolean
  onToggleGrouping: () => void
  showGrouping?: boolean
  groupOptions?: GroupOption[]
  groupByKey?: string | null
  onGroupByKeyChange?: (value: string) => void
  groupByKeys?: string[]
  onGroupByKeyAtIndexChange?: (index: number, value: string) => void
  onAddGroupBy?: () => void
  onRemoveGroupBy?: (index: number) => void
  maxGroupFields?: number
  children?: ReactNode
}) {
  const activeGroupKeys = groupByKeys?.length ? groupByKeys : groupByKey ? [groupByKey] : []

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <label className="flex items-center gap-2 rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2 text-sm">
        <Search size={16} className="text-[var(--foreground)]/65" />
        <input
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="w-48 bg-transparent outline-none placeholder:text-[var(--foreground)]/45"
        />
      </label>
      {showGrouping ? (
        <>
          <button
            type="button"
            onClick={onToggleGrouping}
            className={[
              "inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-semibold transition",
              isGroupingEnabled
                ? "border-blue-500 bg-blue-500 text-black hover:bg-blue-400"
                : "border-[var(--panel-border)] text-[var(--foreground)] hover:bg-[var(--panel-hover)]",
            ].join(" ")}
          >
            G
          </button>
          {groupOptions.length > 0 && isGroupingEnabled ? (
            <div className="flex flex-wrap items-center gap-2">
              {activeGroupKeys.map((activeKey, index) => {
                const availableOptions = groupOptions.filter((option) => option.key === activeKey || !activeGroupKeys.includes(option.key))
                return (
                  <div key={`${activeKey}-${index}`} className="flex items-center gap-2">
                    <select
                      value={activeKey}
                      onChange={(event) => {
                        if (groupByKeys?.length && onGroupByKeyAtIndexChange) {
                          onGroupByKeyAtIndexChange(index, event.target.value)
                          return
                        }
                        onGroupByKeyChange?.(event.target.value)
                      }}
                      className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2 text-sm"
                    >
                      {availableOptions.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {groupByKeys?.length && activeGroupKeys.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => onRemoveGroupBy?.(index)}
                        className="rounded-lg border border-[var(--panel-border)] px-2 py-2 text-xs font-semibold hover:bg-[var(--panel-hover)]"
                      >
                        X
                      </button>
                    ) : null}
                  </div>
                )
              })}
              {groupByKeys?.length && activeGroupKeys.length < Math.min(maxGroupFields, groupOptions.length) ? (
                <button
                  type="button"
                  onClick={onAddGroupBy}
                  className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-xs font-semibold hover:bg-[var(--panel-hover)]"
                >
                  Add Group
                </button>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
      <button
        type="button"
        onClick={onToggleSort}
        className={[
          "inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-semibold transition",
          isAscendingSort
            ? "border-blue-500 bg-blue-500 text-black hover:bg-blue-400"
            : "border-[var(--panel-border)] text-[var(--foreground)] hover:bg-[var(--panel-hover)]",
        ].join(" ")}
      >
        {isAscendingSort ? ascendingSortLabel : descendingSortLabel}
      </button>
      {children}
    </div>
  )
}
