"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { RecordHeaderActionButton } from "@/features/flooring/shared/ui/record-page/record-action-buttons"

type RecordOptionsMenuItem = {
  label: string
  onSelect?: () => void
  disabled?: boolean
}

export function RecordOptionsMenu({
  items,
  buttonLabel = "Options",
}: {
  items: RecordOptionsMenuItem[]
  buttonLabel?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <RecordHeaderActionButton
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((current) => !current)}
        className="pr-3"
      >
        <span>{buttonLabel}</span>
        <ChevronDown size={16} className={isOpen ? "rotate-180 transition" : "transition"} />
      </RecordHeaderActionButton>

      {isOpen ? (
        <div className="absolute right-0 top-full z-20 mt-2 min-w-[180px] rounded-lg border border-[var(--panel-border)] bg-[var(--panel-background)] p-1 shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled || !item.onSelect) return
                setIsOpen(false)
                item.onSelect()
              }}
              className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-[var(--foreground)] transition hover:bg-[var(--panel-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
