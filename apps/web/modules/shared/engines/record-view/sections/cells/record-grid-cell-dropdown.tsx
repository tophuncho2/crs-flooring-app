"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import {
  getRecordGridCellControlSizeClassName,
  joinGridCellClasses,
  RECORD_GRID_CELL_CONTROL_BASE_CLASS_NAME,
  RECORD_GRID_CELL_CONTROL_INVALID_CLASS_NAME,
} from "./record-grid-cell-control-shared"

export type RecordGridCellDropdownOption = {
  id: string
  label: string
}

export type RecordGridCellDropdownProps = {
  value: string | null
  onChange: (value: string | null) => void
  options: ReadonlyArray<RecordGridCellDropdownOption>
  placeholder?: string
  /**
   * When true, render a "— Clear —" sentinel at the top of the popover that,
   * when selected, passes `null` to `onChange`. Useful for optional filter
   * dropdowns. Default false.
   */
  allowClear?: boolean
  disabled?: boolean
  invalid?: boolean
  controlSize?: "compact" | "regular" | "wide"
  ariaLabel?: string
  className?: string
  /**
   * Reserved for a future pass. Turning this on enables an internal search
   * input at the top of the popover that filters options in place. Leaves
   * the component API stable so the flag can be flipped without rewriting.
   */
  searchable?: boolean
}

/**
 * Custom grid-cell dropdown — a styled replacement for native `<select>` with
 * a button trigger, popover listbox, click-outside dismiss, and full keyboard
 * navigation (up / down / home / end / enter / escape / typeahead).
 *
 * Use this for cells where the default select's styling can't carry the weight
 * (e.g. cells with richer visual tone, or future adornments like category
 * color dots). For plain text options with no styling needs, keep using
 * `RecordGridCellSelect` — it's lighter.
 *
 * Not yet: search input. The `searchable` prop is reserved so adoption can
 * flip on when consumers demand it without an API break.
 */
export function RecordGridCellDropdown({
  value,
  onChange,
  options,
  placeholder = "Select…",
  allowClear = false,
  disabled = false,
  invalid = false,
  controlSize = "regular",
  ariaLabel,
  className,
  searchable: _searchable = false,
}: RecordGridCellDropdownProps) {
  const listboxId = useId()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const listboxRef = useRef<HTMLDivElement | null>(null)

  // Clear sentinel + real options, ordered for keyboard nav.
  const keyedOptions = useMemo<ReadonlyArray<RecordGridCellDropdownOption & { isClear?: true }>>(() => {
    if (allowClear) {
      return [{ id: "__clear__", label: "— Clear —", isClear: true }, ...options]
    }
    return options
  }, [allowClear, options])

  const selected = useMemo(
    () => options.find((option) => option.id === value) ?? null,
    [options, value],
  )

  const closeAndReturnFocus = useCallback(() => {
    setOpen(false)
    setActiveIndex(-1)
    const trigger = containerRef.current?.querySelector<HTMLButtonElement>("button[data-record-dropdown-trigger]")
    trigger?.focus()
  }, [])

  const commitSelection = useCallback(
    (optionId: string) => {
      if (optionId === "__clear__") {
        onChange(null)
      } else {
        onChange(optionId)
      }
      closeAndReturnFocus()
    },
    [onChange, closeAndReturnFocus],
  )

  // Click-outside dismiss.
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  // Sync activeIndex to current value when opening.
  useEffect(() => {
    if (!open) return
    if (keyedOptions.length === 0) {
      setActiveIndex(-1)
      return
    }
    const currentIndex = keyedOptions.findIndex((option) => option.id === value)
    setActiveIndex(currentIndex >= 0 ? currentIndex : 0)
  }, [open, keyedOptions, value])

  // Keep the active option scrolled into view.
  useEffect(() => {
    if (!open || activeIndex < 0) return
    const node = listboxRef.current?.querySelector<HTMLElement>(`[data-option-index="${activeIndex}"]`)
    node?.scrollIntoView({ block: "nearest" })
  }, [open, activeIndex])

  // When opening, move focus into the listbox so keyboard nav works without
  // requiring a second interaction. When closing, caller handles returning
  // focus to the trigger via `closeAndReturnFocus`.
  useEffect(() => {
    if (!open) return
    listboxRef.current?.focus()
  }, [open])

  const handleTriggerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        setOpen(true)
      }
    },
    [disabled],
  )

  const handleListKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (keyedOptions.length === 0) return
      switch (event.key) {
        case "Escape":
          event.preventDefault()
          closeAndReturnFocus()
          return
        case "ArrowDown":
          event.preventDefault()
          setActiveIndex((prev) => (prev < keyedOptions.length - 1 ? prev + 1 : 0))
          return
        case "ArrowUp":
          event.preventDefault()
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : keyedOptions.length - 1))
          return
        case "Home":
          event.preventDefault()
          setActiveIndex(0)
          return
        case "End":
          event.preventDefault()
          setActiveIndex(keyedOptions.length - 1)
          return
        case "Enter":
        case " ":
          event.preventDefault()
          if (activeIndex >= 0) {
            commitSelection(keyedOptions[activeIndex].id)
          }
          return
      }
    },
    [keyedOptions, activeIndex, commitSelection, closeAndReturnFocus],
  )

  const triggerLabel = selected ? selected.label : placeholder

  return (
    <div ref={containerRef} className={joinGridCellClasses("relative", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        data-record-dropdown-trigger
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        className={joinGridCellClasses(
          RECORD_GRID_CELL_CONTROL_BASE_CLASS_NAME,
          "flex items-center justify-between gap-2 text-left",
          getRecordGridCellControlSizeClassName(controlSize),
          invalid ? RECORD_GRID_CELL_CONTROL_INVALID_CLASS_NAME : undefined,
        )}
      >
        <span className={joinGridCellClasses("truncate", !selected ? "text-[var(--foreground)]/60" : undefined)}>
          {triggerLabel}
        </span>
        <span aria-hidden="true" className="shrink-0 text-[var(--foreground)]/60">
          ▾
        </span>
      </button>
      {open ? (
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          onKeyDown={handleListKeyDown}
          className="absolute left-0 right-0 top-full z-40 mt-1 max-h-56 overflow-y-auto rounded-md border border-sky-500/35 bg-[var(--panel-background)] shadow-lg focus:outline-none"
        >
          {keyedOptions.length === 0 ? (
            <div className="px-2.5 py-1.5 text-sm text-[var(--foreground)]/60">No options</div>
          ) : (
            keyedOptions.map((option, index) => {
              const isActive = index === activeIndex
              const isSelected = option.id === value || (option.isClear && value === null)
              return (
                <div
                  key={option.id}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  data-option-index={index}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commitSelection(option.id)}
                  className={joinGridCellClasses(
                    "cursor-pointer px-2.5 py-1.5 text-sm",
                    isActive ? "bg-sky-500/20 text-[var(--foreground)]" : "text-[var(--foreground)]",
                    option.isClear ? "italic text-[var(--foreground)]/70" : undefined,
                  )}
                >
                  {option.label}
                </div>
              )
            })
          )}
        </div>
      ) : null}
    </div>
  )
}
