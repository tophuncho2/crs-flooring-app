"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { TONE_ACTIVE_CLASS_NAME, type CellTone } from "@/engines/common"
import type { SegmentedDropdownOption } from "./contracts/segmented-dropdown-option"

const CONTAINER_BASE_CLASS_NAME =
  "inline-flex w-full divide-x divide-[var(--panel-border)] overflow-hidden rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)]"

const BUTTON_BASE_CLASS_NAME =
  "flex-1 px-3 py-1.5 text-sm font-medium outline-none transition focus-visible:relative focus-visible:z-10 focus-visible:ring-1 focus-visible:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-60"
const BUTTON_UNSELECTED_CLASS_NAME =
  "text-[var(--foreground)]/65 hover:bg-[var(--panel-border)]/15 hover:text-[var(--foreground)]"
const BUTTON_CLEAR_SELECTED_CLASS_NAME =
  "bg-[var(--panel-border)]/30 text-[var(--foreground)]/80"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

type Segment = {
  value: string | null
  label: string
  tone?: CellTone
  disabled: boolean
  isClear: boolean
}

export type SegmentedDropdownProps = {
  value: string | null
  onChange: (value: string | null) => void
  options: ReadonlyArray<SegmentedDropdownOption>
  /**
   * When true, appends a final segment that, when clicked, emits `null` to
   * clear the selection. Use for fields where "no value" is a meaningful third
   * state distinct from the listed options.
   */
  allowClear?: boolean
  /** Label for the clear segment when `allowClear` is true. Default: "None". */
  clearLabel?: string
  disabled?: boolean
  ariaLabel?: string
  className?: string
}

/**
 * Inline segmented-button picker. Designed for small enums (2–4 options) where
 * the affordance should be visible up-front rather than hidden behind a
 * trigger. With `allowClear`, exposes a third "None" segment that emits `null`.
 *
 * Behaviour:
 *   - Click a segment to set the value.
 *   - Click the currently-selected segment again to clear it (only when
 *     `allowClear` is true).
 *   - Arrow keys move focus left/right between segments; Enter/Space commits.
 *   - Roving tabindex: a single Tab stop for the whole group.
 */
export function SegmentedDropdown({
  value,
  onChange,
  options,
  allowClear = false,
  clearLabel = "None",
  disabled = false,
  ariaLabel,
  className,
}: SegmentedDropdownProps) {
  const segments = useMemo<ReadonlyArray<Segment>>(() => {
    const base: Segment[] = options.map((option) => ({
      value: option.value,
      label: option.label,
      tone: option.tone,
      disabled: Boolean(option.disabled),
      isClear: false,
    }))
    if (allowClear) {
      base.push({ value: null, label: clearLabel, disabled: false, isClear: true })
    }
    return base
  }, [options, allowClear, clearLabel])

  const checkedIndex = useMemo(
    () => segments.findIndex((segment) => segment.value === value),
    [segments, value],
  )

  const [focusIndex, setFocusIndex] = useState<number>(
    checkedIndex >= 0 ? checkedIndex : 0,
  )

  // Keep keyboard focus aligned with the checked segment when the selection
  // changes — derived during render; checkedIndex is a primitive so it can't loop.
  const [trackedCheckedIndex, setTrackedCheckedIndex] = useState(checkedIndex)
  if (trackedCheckedIndex !== checkedIndex) {
    setTrackedCheckedIndex(checkedIndex)
    if (checkedIndex >= 0) setFocusIndex(checkedIndex)
  }

  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([])

  const focusSegment = useCallback((index: number) => {
    const target = buttonRefs.current[index]
    if (target) target.focus()
  }, [])

  const moveFocus = useCallback(
    (delta: number) => {
      if (segments.length === 0) return
      let next = focusIndex
      for (let step = 0; step < segments.length; step += 1) {
        next = (next + delta + segments.length) % segments.length
        if (!segments[next].disabled) break
      }
      setFocusIndex(next)
      focusSegment(next)
    },
    [focusIndex, segments, focusSegment],
  )

  const commit = useCallback(
    (index: number) => {
      const segment = segments[index]
      if (!segment || segment.disabled) return
      // Clicking the already-selected segment of a clearable group clears the
      // value; otherwise pressing the same segment is a no-op.
      if (segment.value === value && allowClear) {
        onChange(null)
        return
      }
      onChange(segment.value)
    },
    [segments, value, allowClear, onChange],
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault()
          moveFocus(1)
          return
        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault()
          moveFocus(-1)
          return
        case "Home":
          event.preventDefault()
          setFocusIndex(0)
          focusSegment(0)
          return
        case "End":
          event.preventDefault()
          setFocusIndex(segments.length - 1)
          focusSegment(segments.length - 1)
          return
        case "Enter":
        case " ":
          event.preventDefault()
          commit(focusIndex)
          return
      }
    },
    [disabled, moveFocus, focusSegment, segments.length, commit, focusIndex],
  )

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
      className={joinClassNames(CONTAINER_BASE_CLASS_NAME, className)}
    >
      {segments.map((segment, index) => {
        const isChecked = segment.value === value
        const isFocusTarget = index === focusIndex
        const segmentDisabled = disabled || segment.disabled
        return (
          <button
            key={segment.isClear ? "__clear__" : (segment.value ?? "__none__")}
            ref={(node) => {
              buttonRefs.current[index] = node
            }}
            type="button"
            role="radio"
            aria-checked={isChecked}
            tabIndex={isFocusTarget ? 0 : -1}
            disabled={segmentDisabled}
            onClick={() => commit(index)}
            onFocus={() => setFocusIndex(index)}
            className={joinClassNames(
              BUTTON_BASE_CLASS_NAME,
              isChecked && segment.isClear ? BUTTON_CLEAR_SELECTED_CLASS_NAME : null,
              isChecked && !segment.isClear
                ? TONE_ACTIVE_CLASS_NAME[segment.tone ?? "default"]
                : null,
              !isChecked ? BUTTON_UNSELECTED_CLASS_NAME : null,
            )}
          >
            {segment.label}
          </button>
        )
      })}
    </div>
  )
}
