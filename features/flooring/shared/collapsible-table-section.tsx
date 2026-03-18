"use client"

import { type ReactNode, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

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

export function CollapsibleTableSection({
  title,
  description,
  defaultOpen = true,
  children,
  className,
}: {
  title: string
  description?: string
  defaultOpen?: boolean
  children: ReactNode
  className?: string
}) {
  const { isOpen, toggle } = useCollapsibleSection(defaultOpen)

  return (
    <section className={joinClasses("space-y-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          {description ? <p className="text-sm text-[var(--foreground)]/70">{description}</p> : null}
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          aria-label={isOpen ? `Collapse ${title}` : `Expand ${title}`}
          className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--panel-border)] text-[var(--foreground)]/70 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)]"
        >
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {isOpen ? children : null}
    </section>
  )
}
