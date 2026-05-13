"use client"

import { useEffect, useRef, useState } from "react"

export type EnumFilterChipOption = {
  value: string
  label: string
}

export type EnumFilterChipProps = {
  label: string
  value: string
  options: ReadonlyArray<EnumFilterChipOption>
  onChange: (next: string) => void
  ariaLabel?: string
}

export function EnumFilterChip({
  label,
  value,
  options,
  onChange,
  ariaLabel,
}: EnumFilterChipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKey)
    }
  }, [open])

  const activeLabel = options.find((option) => option.value === value)?.label ?? value
  const isDefault = options[0]?.value === value

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ?? `${label}: ${activeLabel}`}
        className={[
          "rounded-md border px-3 py-1.5 text-sm transition",
          isDefault
            ? "border-[var(--panel-border)] bg-[var(--panel-background)] text-[var(--foreground)] hover:border-[var(--panel-border-strong)]"
            : "border-amber-500/50 bg-amber-500/10 text-amber-700",
        ].join(" ")}
      >
        {label}: {activeLabel}
      </button>
      {open ? (
        <div
          role="listbox"
          className="absolute z-20 mt-1 min-w-[12rem] rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] p-1 shadow-lg"
        >
          {options.map((option) => {
            const selected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={[
                  "block w-full rounded px-2 py-1.5 text-left text-sm transition",
                  selected
                    ? "bg-blue-500/15 text-blue-700"
                    : "text-[var(--foreground)] hover:bg-[var(--panel-border)]/30",
                ].join(" ")}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
