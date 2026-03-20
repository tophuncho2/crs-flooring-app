"use client"

import { type ReactNode } from "react"
import { Search } from "lucide-react"

export default function TableControlsBar({
  searchQuery,
  onSearchQueryChange,
  searchPlaceholder,
  isAscendingSort,
  onToggleSort,
  ascendingSortLabel = "A-Z",
  descendingSortLabel = "Z-A",
  children,
}: {
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  searchPlaceholder: string
  isAscendingSort: boolean
  onToggleSort: () => void
  ascendingSortLabel?: string
  descendingSortLabel?: string
  children?: ReactNode
}) {
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
