"use client"

export type ClearAllFiltersButtonProps = {
  hasActive: boolean
  onClick: () => void
  label?: string
}

export function ClearAllFiltersButton({
  hasActive,
  onClick,
  label = "Clear all",
}: ClearAllFiltersButtonProps) {
  if (!hasActive) return null
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-semibold text-blue-600 hover:text-blue-700"
    >
      {label}
    </button>
  )
}
