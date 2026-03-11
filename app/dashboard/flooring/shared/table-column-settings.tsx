"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowDown, ArrowUp, Columns3 } from "lucide-react"
import type { TableColumnDefinition } from "./use-table-columns"

type TableColumnSettingsProps<TColumn extends TableColumnDefinition> = {
  columns: TColumn[]
  hiddenColumnKeys: string[]
  onToggleColumn: (columnKey: string, isVisible: boolean) => void
  onMoveColumn: (columnKey: string, direction: "up" | "down") => void
}

export function TableColumnSettings<TColumn extends TableColumnDefinition>({
  columns,
  hiddenColumnKeys,
  onToggleColumn,
  onMoveColumn,
}: TableColumnSettingsProps<TColumn>) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

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

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm font-semibold transition hover:bg-[var(--panel-hover)]"
      >
        <Columns3 size={16} />
        Columns
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-3 shadow-xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">Columns</p>
          <div className="space-y-2">
            {columns.map((column, index) => {
              const isVisible = !hiddenColumnKeys.includes(column.key)

              return (
                <div key={column.key} className="flex items-center gap-2 rounded-lg border border-[var(--panel-border)] px-2 py-2">
                  <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={(event) => onToggleColumn(column.key, event.target.checked)}
                    />
                    <span className="truncate">{column.label}</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onMoveColumn(column.key, "up")}
                      disabled={index === 0}
                      className="rounded border border-[var(--panel-border)] p-1 disabled:opacity-40"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveColumn(column.key, "down")}
                      disabled={index === columns.length - 1}
                      className="rounded border border-[var(--panel-border)] p-1 disabled:opacity-40"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
