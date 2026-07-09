import type { ReactNode } from "react"

/**
 * Micro-label for a group of controls inside the work-order Filter menu — the
 * uppercase caption above the Scope / Attributes columns and the Scheduled-for
 * section. Mirrors the popover sticky-header treatment at a lighter weight so the
 * groups read as intentional structure rather than a flat stack. Module-local by
 * design (only the WO Filter menu is grouped today).
 */
export function FilterGroupLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--foreground)]/60">
      {children}
    </span>
  )
}
