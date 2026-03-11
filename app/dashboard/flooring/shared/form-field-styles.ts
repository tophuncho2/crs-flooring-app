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
      ? "border-rose-500 bg-rose-500/10 text-rose-700"
      : "border-[var(--panel-border)] bg-transparent"
  }

  return "border-amber-400/80 bg-amber-400/10"
}
