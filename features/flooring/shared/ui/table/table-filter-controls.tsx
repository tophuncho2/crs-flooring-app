"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Filter } from "lucide-react"

type TableFilterOption = {
  value: string
  label: string
}

export type TableFilterGroup = {
  key: string
  type: "tabs" | "select"
  label: string
  clearLabel?: string
  selectedValues: string[]
  options: TableFilterOption[]
  onToggleValue: (value: string) => void
  onClear: () => void
}

const openPanelState = new Map<string, boolean>()

export function TableFilterControls({
  groups,
  panelKey = "table-filters",
  className = "",
}: {
  groups: TableFilterGroup[]
  panelKey?: string
  className?: string
}) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [isOpen, setIsOpen] = useState(() => openPanelState.get(panelKey) ?? false)

  useEffect(() => {
    openPanelState.set(panelKey, isOpen)
  }, [isOpen, panelKey])

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [isOpen])

  const activeFilterCount = useMemo(
    () => groups.reduce((count, group) => count + group.selectedValues.length, 0),
    [groups],
  )

  if (groups.length === 0) {
    return null
  }

  return (
    <div ref={rootRef} className={`relative ${className}`.trim()}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm font-semibold transition hover:bg-[var(--panel-hover)]"
      >
        <Filter size={16} />
        Filter
        {activeFilterCount > 0 ? (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            {activeFilterCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-20 mt-2 w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-3 shadow-xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">Filters</p>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={() => groups.forEach((group) => group.onClear())}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Clear all
              </button>
            ) : null}
          </div>

          <div className="space-y-4">
            {groups.map((group) => (
              <section key={group.key} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]/85">{group.label}</h3>
                  <button
                    type="button"
                    onClick={group.onClear}
                    className="text-xs font-medium text-[var(--foreground)]/60 hover:text-[var(--foreground)]/85"
                  >
                    {group.clearLabel ?? "Any"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.options.map((option) => {
                    const isSelected = group.selectedValues.includes(option.value)

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => group.onToggleValue(option.value)}
                        aria-pressed={isSelected}
                        className={[
                          "rounded-md border px-3 py-1.5 text-xs font-semibold transition",
                          isSelected
                            ? "border-blue-500 bg-blue-500 text-white"
                            : "border-[var(--panel-border)] text-[var(--foreground)]/75 hover:bg-[var(--panel-hover)]",
                        ].join(" ")}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
