"use client"

import { type ReactNode, useState } from "react"
import { ChevronDown, ChevronRight, Plus } from "lucide-react"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function useCollapsibleSection(defaultOpen = true) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return {
    isOpen,
    toggle: () => setIsOpen((current) => !current),
    setIsOpen,
  }
}

export function useInlineCreateRow(defaultOpen = false) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((current) => !current),
  }
}

export function InlineAddRowButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--panel-border)] text-[var(--foreground)]/70 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)]"
    >
      <Plus size={16} />
    </button>
  )
}

export function CollapsibleTableSection({
  title,
  defaultOpen = true,
  children,
  className,
  actions,
  titleMeta,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
  className?: string
  actions?: ReactNode
  titleMeta?: ReactNode
}) {
  const { isOpen, toggle } = useCollapsibleSection(defaultOpen)

  return (
    <section className={joinClasses("space-y-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="text-base font-semibold">{title}</h3>
            {titleMeta ? <div className="text-sm font-medium text-[var(--foreground)]/70">{titleMeta}</div> : null}
          </div>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          {actions}
          <button
            type="button"
            onClick={toggle}
            aria-expanded={isOpen}
            aria-label={isOpen ? `Collapse ${title}` : `Expand ${title}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--panel-border)] text-[var(--foreground)]/70 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)]"
          >
            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </div>

      {isOpen ? children : null}
    </section>
  )
}
