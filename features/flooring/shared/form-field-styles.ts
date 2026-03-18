"use client"

export function getSharedFormFieldClass({
  isRequired,
  isEmpty,
}: {
  isRequired: boolean
  isEmpty: boolean
}) {
  if (isRequired) {
    return isEmpty
      ? "border-rose-500 bg-rose-500/10 text-rose-700 shadow-[0_0_0_1px_rgba(244,63,94,0.25),0_0_16px_rgba(244,63,94,0.18)]"
      : "border-[var(--panel-border)] bg-transparent shadow-[0_0_0_1px_rgba(244,63,94,0.12),0_0_14px_rgba(244,63,94,0.08)]"
  }

  return "border-amber-400/80 bg-amber-400/10 shadow-[0_0_0_1px_rgba(251,191,36,0.18),0_0_14px_rgba(251,191,36,0.12)]"
}
