"use client"

import { useMemo } from "react"
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Plus, X } from "lucide-react"

/** How a column's values order — drives the direction control's labels. */
export type SortValueType = "text" | "number" | "date" | "time"

/** A sortable column offered by the menu. `key` is the backend sort field. */
export type SortMenuOption = { key: string; label: string; type?: SortValueType }

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

// Per-type direction labels. The control reads as plain English ("A → Z",
// "Newest") instead of the opaque "Asc/Desc", so the chosen order is legible at
// a glance. `text` is the fallback for an untyped column.
const DIRECTION_LABELS: Record<SortValueType, { asc: string; desc: string }> = {
  text: { asc: "A → Z", desc: "Z → A" },
  number: { asc: "Low → High", desc: "High → Low" },
  date: { asc: "Oldest", desc: "Newest" },
  time: { asc: "AM first", desc: "PM first" },
}

function directionLabels(type: SortValueType | undefined) {
  return DIRECTION_LABELS[type ?? "text"]
}

// Sensible starting direction when a column is first added: words read forward
// (A→Z, earliest), while dates and quantities lead with the most recent/largest.
function defaultDirectionForType(type: SortValueType | undefined): "asc" | "desc" {
  return type === "number" || type === "date" ? "desc" : "asc"
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
  "inline-flex shrink-0 items-center gap-1 rounded-md border border-[var(--panel-border)] px-2 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:border-sky-500/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
const REORDER_CLASS_NAME =
  "flex h-3.5 w-4 items-center justify-center text-[var(--foreground)]/45 transition hover:text-[var(--foreground)] disabled:pointer-events-none disabled:opacity-30 focus:outline-none focus-visible:text-sky-500"

/**
 * Multi-level sort builder body. The first level reads as the panel's "Sort by";
 * each later level is a "then by" tie-breaker. Every level picks a column +
 * direction, can be reordered (↑/↓) or removed, and an "Add" affordance appears
 * while under {@link SortMenuBodyProps.maxLevels} with unused columns left. The
 * direction control is labelled by the column's {@link SortValueType} (A→Z,
 * Newest, High→Low, AM first) rather than asc/desc.
 *
 * Pure UI — `value`/`onChange` wire straight to the list controller's `sorts` +
 * `onSortsChange`; column headers stay the quick single-sort path. Chrome-free:
 * hosts render this inside their own popover (the toolbar's `ToolbarMenuButton`
 * "Sort" tool, whose sticky header supplies the "Sort by" title). Returns null
 * when no columns are sortable.
 */
export function SortMenuBody({
  options,
  value,
  maxLevels,
  onChange,
  className,
}: SortMenuBodyProps) {
  const optionByField = useMemo(() => {
    const map = new Map<string, SortMenuOption>()
    for (const option of options) map.set(option.key, option)
    return map
  }, [options])

  const usedFields = useMemo(() => new Set(value.map((level) => level.field)), [value])
  const availableToAdd = options.filter((option) => !usedFields.has(option.key))
  const canAddLevel = value.length < maxLevels && availableToAdd.length > 0

  function setLevelField(index: number, field: string) {
    onChange(dedupeByField(value.map((level, i) => (i === index ? { ...level, field } : level))))
  }
  function setLevelDirection(index: number, direction: "asc" | "desc") {
    onChange(value.map((level, i) => (i === index ? { ...level, direction } : level)))
  }
  function removeLevel(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }
  function moveLevel(index: number, delta: -1 | 1) {
    const target = index + delta
    if (target < 0 || target >= value.length) return
    const next = [...value]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }
  function addLevel() {
    const first = availableToAdd[0]
    if (!first) return
    onChange([...value, { field: first.key, direction: defaultDirectionForType(first.type) }])
  }

  if (options.length === 0) return null

  return (
    <div className={joinClasses("w-[min(22rem,calc(100vw-2rem))]", className)}>
      {value.length === 0 ? (
        <button
          type="button"
          onClick={addLevel}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--panel-border)] px-3 py-3 text-sm font-semibold text-[var(--foreground)]/70 transition hover:border-sky-500/45 hover:text-[var(--foreground)]"
        >
          <Plus size={15} strokeWidth={2.5} aria-hidden="true" />
          Add a sort column
        </button>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--foreground)]/45">
              {value.length} of {maxLevels} columns
            </span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700"
            >
              Clear
            </button>
          </div>

          <div className="space-y-1.5">
            {value.map((level, index) => {
              const option = optionByField.get(level.field)
              const labels = directionLabels(option?.type)
              const activeLabel = level.direction === "asc" ? labels.asc : labels.desc
              // Offer this row's own field plus any not used by another row.
              const fieldOptions = options.filter(
                (candidate) => candidate.key === level.field || !usedFields.has(candidate.key),
              )
              const isLast = index === value.length - 1
              return (
                <div key={`${level.field}-${index}`}>
                  {index > 0 ? (
                    <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--foreground)]/40">
                      then by
                    </p>
                  ) : null}
                  <div className="flex items-center gap-1.5 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-background)] p-1.5">
                    {value.length > 1 ? (
                      <div className="flex shrink-0 flex-col">
                        <button
                          type="button"
                          onClick={() => moveLevel(index, -1)}
                          disabled={index === 0}
                          aria-label={`Move ${option?.label ?? level.field} up`}
                          className={REORDER_CLASS_NAME}
                        >
                          <ChevronUp size={13} strokeWidth={2.5} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveLevel(index, 1)}
                          disabled={isLast}
                          aria-label={`Move ${option?.label ?? level.field} down`}
                          className={REORDER_CLASS_NAME}
                        >
                          <ChevronDown size={13} strokeWidth={2.5} aria-hidden="true" />
                        </button>
                      </div>
                    ) : null}
                    <select
                      value={level.field}
                      onChange={(event) => setLevelField(index, event.target.value)}
                      aria-label={`Sort column ${index + 1}`}
                      className={SELECT_CLASS_NAME}
                    >
                      {fieldOptions.map((candidate) => (
                        <option key={candidate.key} value={candidate.key}>
                          {candidate.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setLevelDirection(index, level.direction === "asc" ? "desc" : "asc")
                      }
                      aria-label={`Direction for ${option?.label ?? level.field}: ${activeLabel}. Toggle.`}
                      title={`Sorting ${activeLabel} — click to flip`}
                      className={DIRECTION_CLASS_NAME}
                    >
                      {level.direction === "asc" ? (
                        <ArrowUp size={13} strokeWidth={2.5} aria-hidden="true" />
                      ) : (
                        <ArrowDown size={13} strokeWidth={2.5} aria-hidden="true" />
                      )}
                      {activeLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLevel(index)}
                      aria-label={`Remove ${option?.label ?? level.field} from sort`}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--foreground)]/55 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)]"
                    >
                      <X size={14} strokeWidth={2.5} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {canAddLevel ? (
            <button
              type="button"
              onClick={addLevel}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-[var(--panel-border)] px-2 py-1.5 text-xs font-semibold text-[var(--foreground)]/70 transition hover:border-sky-500/45 hover:text-[var(--foreground)]"
            >
              <Plus size={13} strokeWidth={2.5} aria-hidden="true" />
              Add another column
            </button>
          ) : null}
        </>
      )}
    </div>
  )
}
