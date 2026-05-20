"use client"

export function WorkOrderFilesGenerateButton({
  disabled,
  isGenerating,
  onClick,
}: {
  disabled: boolean
  isGenerating: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isGenerating ? "Generating…" : "Generate File"}
    </button>
  )
}
