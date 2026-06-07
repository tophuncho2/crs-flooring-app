"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import type { DropdownOption } from "../contracts/dropdown-option"

const TRIGGER_BASE_CLASS_NAME =
  "flex w-full items-center justify-between gap-2 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2.5 py-1.5 text-left text-sm text-[var(--foreground)] outline-none transition focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-60"

const TRIGGER_INVALID_CLASS_NAME = "border-rose-500/60 focus:border-rose-500/70 focus:ring-rose-500/40"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type SelectDropdownProps = {
  value: string | null
  onChange: (value: string | null) => void
  options: ReadonlyArray<DropdownOption>
  placeholder?: string
  /**
   * When true, renders a "— Clear —" sentinel at the top of the popover that
   * emits `null` to `onChange` on selection.
   */
  allowClear?: boolean
  disabled?: boolean
  invalid?: boolean
  ariaLabel?: string
  className?: string
}

/**
 * Standalone keyboard-accessible dropdown. Used directly by consumers that
 * want a styled `<select>` replacement, and wrapped by `cells/dropdown-cell`
 * for grid usage.
 */
export function SelectDropdown({
  value,
  onChange,
  options,
  placeholder = "Select…",
  allowClear = false,
  disabled = false,
  invalid = false,
  ariaLabel,
  className,
}: SelectDropdownProps) {
  const listboxId = useId()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const listboxRef = useRef<HTMLDivElement | null>(null)

  const keyedOptions = useMemo<ReadonlyArray<DropdownOption & { isClear?: true }>>(() => {
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
    const trigger = containerRef.current?.querySelector<HTMLButtonElement>("button[data-dropdown-trigger]")
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

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      if (listboxRef.current?.contains(target)) return
      setOpen(false)
      setActiveIndex(-1)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    function updateRect() {
      const trigger = containerRef.current?.querySelector<HTMLButtonElement>(
        "button[data-dropdown-trigger]",
      )
      if (trigger) setTriggerRect(trigger.getBoundingClientRect())
    }
    updateRect()
    window.addEventListener("resize", updateRect)
    // Capture-phase scroll listener catches scrolls inside any ancestor (the
    // grid's `overflow-x-auto` wrapper, the page itself, modals, etc.).
    window.addEventListener("scroll", updateRect, true)
    return () => {
      window.removeEventListener("resize", updateRect)
      window.removeEventListener("scroll", updateRect, true)
    }
  }, [open])

  // Reset active index when the dropdown opens or the option list / value
  // changes; preserve the selected option's position when present. Derived
  // during render (keyed on option ids so an unstable `options` prop can't loop it).
  const optionsKey = keyedOptions.map((option) => option.id).join(",")
  const [activeReset, setActiveReset] = useState({ open, optionsKey, value })
  if (
    activeReset.open !== open ||
    activeReset.optionsKey !== optionsKey ||
    activeReset.value !== value
  ) {
    setActiveReset({ open, optionsKey, value })
    if (open) {
      if (keyedOptions.length === 0) {
        setActiveIndex(-1)
      } else {
        const currentIndex = keyedOptions.findIndex((option) => option.id === value)
        setActiveIndex(currentIndex >= 0 ? currentIndex : 0)
      }
    }
  }

  useEffect(() => {
    if (!open || activeIndex < 0) return
    const node = listboxRef.current?.querySelector<HTMLElement>(`[data-option-index="${activeIndex}"]`)
    node?.scrollIntoView({ block: "nearest" })
  }, [open, activeIndex])

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
            const option = keyedOptions[activeIndex]
            if (!option.disabled) {
              commitSelection(option.id)
            }
          }
          return
      }
    },
    [keyedOptions, activeIndex, commitSelection, closeAndReturnFocus],
  )

  const triggerLabel = selected ? selected.label : placeholder

  return (
    <div ref={containerRef} className={joinClassNames("relative", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        data-dropdown-trigger
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        className={joinClassNames(
          TRIGGER_BASE_CLASS_NAME,
          invalid ? TRIGGER_INVALID_CLASS_NAME : undefined,
        )}
      >
        <span className={joinClassNames("truncate", !selected ? "text-[var(--foreground)]/60" : undefined)}>
          {triggerLabel}
        </span>
        <span aria-hidden="true" className="shrink-0 text-[var(--foreground)]/60">
          ▾
        </span>
      </button>
      {open && triggerRect && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={listboxRef}
              id={listboxId}
              role="listbox"
              tabIndex={-1}
              aria-activedescendant={
                activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
              }
              onKeyDown={handleListKeyDown}
              style={{
                position: "fixed",
                top: triggerRect.bottom + 4,
                left: triggerRect.left,
                // The popup grows to fit its widest option (no fixed `width`),
                // but never below the trigger width and never past the viewport.
                minWidth: triggerRect.width,
                maxWidth: `min(40rem, calc(100vw - ${Math.max(triggerRect.left, 0) + 8}px))`,
                zIndex: 1000,
              }}
              className="max-h-56 overflow-y-auto rounded-md border border-sky-500/35 bg-[var(--panel-background)] shadow-lg focus:outline-none"
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
                      aria-disabled={option.disabled || undefined}
                      data-option-index={index}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => !option.disabled && commitSelection(option.id)}
                      className={joinClassNames(
                        "cursor-pointer px-2.5 py-1.5 text-sm",
                        isActive ? "bg-sky-500/20 text-[var(--foreground)]" : "text-[var(--foreground)]",
                        option.isClear ? "italic text-[var(--foreground)]/70" : undefined,
                        option.disabled ? "cursor-not-allowed opacity-50" : undefined,
                      )}
                    >
                      <div className="whitespace-nowrap">{option.label}</div>
                      {option.hint ? (
                        <div className="whitespace-nowrap text-[11px] text-[var(--foreground)]/55">
                          {option.hint}
                        </div>
                      ) : null}
                    </div>
                  )
                })
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
