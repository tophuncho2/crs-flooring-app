"use client"

/**
 * The Property record view's §1 placeholder shown in place of
 * `LinkedManagementCompanySection` when the property has no linked management
 * company (an orphan). The action hands off to the create-MC flow, which links
 * this property on save.
 */
export function EmptyManagementCompanySection({ onLink }: { onLink: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-[var(--panel-border)] bg-[var(--subpanel-background)] px-4 py-3 text-sm text-[var(--foreground)]/70">
      <span>No management company linked.</span>
      <button
        type="button"
        onClick={onLink}
        className="shrink-0 rounded-md border border-[var(--panel-border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]/80 transition hover:border-sky-500/45 hover:text-[var(--foreground)]"
      >
        Add management company
      </button>
    </div>
  )
}
