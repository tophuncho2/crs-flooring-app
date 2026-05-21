"use client"

/**
 * Archive-status chip that sits in the Stock group header next to the
 * tab. Click toggles `value`. When disabled, renders as a static badge
 * (no click handler, no cursor affordance). Visual + placement match
 * `WorkOrderCompleteChip` — same palette, same chrome.
 */
export function InventoryArchiveChip({
  value,
  onChange,
  disabled,
}: {
  value: boolean
  onChange: (next: boolean) => void
  disabled: boolean
}) {
  const checkedClasses = "border-emerald-500/45 bg-emerald-500/15 text-emerald-800"
  const uncheckedClasses = "border-[var(--panel-border)] bg-transparent text-[var(--foreground)]/70"
  const label = value ? "Archived ✓" : "Active"

  if (disabled) {
    return (
      <span
        aria-label="Archive status"
        className={[
          "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium",
          value ? checkedClasses : uncheckedClasses,
        ].join(" ")}
      >
        {label}
      </span>
    )
  }

  return (
    <button
      type="button"
      aria-label="Toggle archived"
      aria-pressed={value}
      onClick={() => onChange(!value)}
      className={[
        "inline-flex cursor-pointer items-center rounded-md border px-2.5 py-1 text-xs font-medium transition",
        "focus:outline-none focus:ring-1 focus:ring-sky-500/40",
        value ? checkedClasses : `${uncheckedClasses} hover:bg-[var(--panel-border)]/30`,
      ].join(" ")}
    >
      {label}
    </button>
  )
}
