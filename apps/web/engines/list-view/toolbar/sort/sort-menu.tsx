"use client"

import { useMemo } from "react"
import { ArrowDown, ArrowUp, X } from "lucide-react"

/** A sortable column offered by the menu. `key` is the backend sort field. */
export type SortMenuOption = { key: string; label: string }

/** One ordered sort level. `field` matches a {@link SortMenuOption.key}. */
export type SortMenuLevel = { field: string; direction: "asc" | "desc" }

export type SortMenuBodyProps = {
  /** Sortable columns available to add, in display order. */
  options: ReadonlyArray<SortMenuOption>
  /** Current ordered sort levels (highest priority first). */
  value: ReadonlyArray<SortMenuLevel>
  /** Cap on simultaneous levels (e.g. 3). */
  maxLevels: number
  /** Emit the new ordered list. The caller validates/persists it. */
  onChange: (next: SortMenuLevel[]) => void
  className?: string
}

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

function dedupeByField(levels: SortMenuLevel[]): SortMenuLevel[] {
  const seen = new Set<string>()
  const result: SortMenuLevel[] = []
  for (const level of levels) {
    if (seen.has(level.field)) continue
    seen.add(level.field)
    result.push(level)
  }
  return result
}

const SELECT_CLASS_NAME =
  "min-w-0 flex-1 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2 py-1.5 text-sm text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
const DIRECTION_CLASS_NAME =
  "inline-flex items-center gap-1 rounded-md border border-[var(--panel-border)] px-2 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:border-sky-500/45"

/**
 * Multi-level sort builder body. Each level picks a column + direction and can be
 * removed; an "Add level" affordance appears while under {@link SortMenuBodyProps.maxLevels}
 * and unused columns remain. Pure UI — `value`/`onChange` wire straight to the list
 * controller's `sorts` + `onSortsChange`. Column headers stay the quick single-sort
 * path; this composes the ordered chain.
 *
 * Chrome-free: hosts render this inside their own popover (the table-header
 * `TableOptions` "Sort" tab). Returns null when no columns are sortable.
 */
export function SortMenuBody({
  options,
  value,
  maxLevels,
  onChange,
  className,
}: SortMenuBodyProps) {
  const labelByField = useMemo(() => {
    const map = new Map<string, string>()
    for (const option of options) map.set(option.key, option.label)
    return map
  }, [options])

  const usedFields = useMemo(() => new Set(value.map((level) => level.field)), [value])
  const availableToAdd = options.filter((option) => !usedFields.has(option.key))
  const canAddLevel = value.length < maxLevels && availableToAdd.length > 0

  function setLevelField(index: number, field: string) {
    onChange(dedupeByField(value.map((level, i) => (i === index ? { ...level, field } : level))))
  }
  function toggleLevelDirection(index: number) {
    onChange(
      value.map((level, i) =>
        i === index ? { ...level, direction: level.direction === "asc" ? "desc" : "asc" } : level,
      ),
    )
  }
  function removeLevel(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }
  function addLevel() {
    const first = availableToAdd[0]
    if (!first) return
    onChange([...value, { field: first.key, direction: "asc" }])
  }

  if (options.length === 0) return null

  return (
    <div className={joinClasses("w-[min(20rem,calc(100vw-3rem))]", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">
          Sort by
        </p>
        {value.length > 0 ? (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs font-semibold text-sky-600 hover:text-sky-700"
          >
            Clear
          </button>
        ) : null}
      </div>

      {value.length === 0 ? (
        <p className="px-1 py-2 text-sm text-[var(--foreground)]/55">No sort applied.</p>
      ) : (
        <div className="space-y-2">
          {value.map((level, index) => {
            // Offer this row's own field plus any not used by another row.
            const fieldOptions = options.filter(
              (option) => option.key === level.field || !usedFields.has(option.key),
            )
            return (
              <div key={`${level.field}-${index}`} className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-500/15 text-xs font-bold text-sky-500">
                  {index + 1}
                </span>
                <select
                  value={level.field}
                  onChange={(event) => setLevelField(index, event.target.value)}
                  aria-label={`Sort column for level ${index + 1}`}
                  className={SELECT_CLASS_NAME}
                >
                  {fieldOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => toggleLevelDirection(index)}
                  aria-label={`Toggle direction for ${labelByField.get(level.field) ?? level.field}`}
                  className={DIRECTION_CLASS_NAME}
                >
                  {level.direction === "asc" ? (
                    <>
                      <ArrowUp size={13} strokeWidth={2.5} aria-hidden="true" /> Asc
                    </>
                  ) : (
                    <>
                      <ArrowDown size={13} strokeWidth={2.5} aria-hidden="true" /> Desc
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => removeLevel(index)}
                  aria-label={`Remove ${labelByField.get(level.field) ?? level.field} from sort`}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--foreground)]/55 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)]"
                >
                  <X size={14} strokeWidth={2.5} aria-hidden="true" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {canAddLevel ? (
        <button
          type="button"
          onClick={addLevel}
          className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-[var(--panel-border)] px-2 py-1.5 text-xs font-semibold text-[var(--foreground)]/70 transition hover:border-sky-500/45 hover:text-[var(--foreground)]"
        >
          + Add level ({value.length}/{maxLevels})
        </button>
      ) : null}
    </div>
  )
}
