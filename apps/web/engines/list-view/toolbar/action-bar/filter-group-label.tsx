import type { ReactNode } from "react"

/**
 * Micro-label for a group of controls inside a toolbar menu — the uppercase
 * caption above a grouped column (e.g. Scope / Attributes in the work-order
 * Filter menu, or Identity / Product in a list's Search menu). Mirrors the popover
 * sticky-header treatment at a lighter weight so grouped columns read as
 * intentional structure rather than a flat stack.
 */
export function FilterGroupLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--foreground)]/60">
      {children}
    </span>
  )
}
