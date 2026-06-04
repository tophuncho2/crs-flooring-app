"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Filter } from "lucide-react"
import type { FilterContract } from "./contracts/filter-contract"

const openPanelState = new Map<string, boolean>()

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

function toggleValueIn(values: string[], value: string): string[] {
  const set = new Set(values)
  if (set.has(value)) set.delete(value)
  else set.add(value)
  return Array.from(set)
}

export type FilterControlProps = FilterContract & {
  className?: string
}

/**
 * Filter popover control. Renders a button with active-count badge that
 * toggles a panel of grouped multi-value pill toggles. Pure UI — values
 * and onChange come from the caller (typically wired straight to the
 * list controller's `filters` + `onFilterChange`).
 *
 * Active count is the sum of selected values across all fields.
 * Each field has its own per-field clear; the panel header has a
 * "Clear all" affordance (visible only when at least one filter is active).
 */
export function FilterControl({
  fields,
  values,
  onChange,
  onClearAll,
  panelKey = "list-filters",
  ariaLabel = "Filter",
  className,
}: FilterControlProps) {
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
    () => fields.reduce((count, field) => count + (values[field.key]?.length ?? 0), 0),
    [fields, values],
  )

  if (fields.length === 0) {
    return null
  }

  return (
    <div ref={rootRef} className={joinClasses("relative z-30", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={ariaLabel}
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
        <div className="absolute right-0 top-full z-[70] mt-2 w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-3 shadow-xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">Filters</p>
            {activeFilterCount > 0 && onClearAll ? (
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Clear all
              </button>
            ) : null}
          </div>

          <div className="space-y-4">
            {fields.map((field) => {
              const selected = values[field.key] ?? []
              return (
                <section key={field.key} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]/85">{field.label}</h3>
                    <button
                      type="button"
                      onClick={() => onChange(field.key, [])}
                      className="text-xs font-medium text-[var(--foreground)]/60 hover:text-[var(--foreground)]/85"
                    >
                      {field.clearLabel ?? "Any"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {field.options.map((option) => {
                      const isSelected = selected.includes(option.value)
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => onChange(field.key, toggleValueIn(selected, option.value))}
                          aria-pressed={isSelected}
                          className={joinClasses(
                            "rounded-md border px-3 py-1.5 text-xs font-semibold transition",
                            isSelected
                              ? "border-blue-500 bg-blue-500 text-white"
                              : "border-[var(--panel-border)] text-[var(--foreground)]/75 hover:bg-[var(--panel-hover)]",
                          )}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
