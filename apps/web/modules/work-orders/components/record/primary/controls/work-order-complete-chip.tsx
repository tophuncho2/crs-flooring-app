"use client"

/**
 * Complete-status chip that sits in the Notes group header next to the
 * tab. Click toggles `value`. When disabled, renders as a static badge
 * (no click handler, no cursor affordance).
 */
export function WorkOrderCompleteChip({
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
  const label = value ? "Complete ✓" : "Incomplete"

  if (disabled) {
    return (
      <span
        aria-label="Complete status"
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
      aria-label="Toggle complete"
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
