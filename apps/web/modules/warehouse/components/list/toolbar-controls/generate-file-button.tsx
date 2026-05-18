"use client"

/**
 * Placeholder action: fills a 2-row × 2-col `ListToolbarCell`. Wears the
 * same blue tint as the work-orders status segmented control's active
 * segment (`bg-blue-500/15 text-blue-700`). Permanently disabled until
 * the real generate-file flow lands.
 */
export function GenerateFileButton() {
  return (
    <button
      type="button"
      disabled
      className="flex h-full w-1/4 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/15 px-4 py-2 text-sm font-semibold tracking-tight text-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
    >
      Generate File
    </button>
  )
}
