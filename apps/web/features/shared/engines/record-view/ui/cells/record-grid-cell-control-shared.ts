export function joinGridCellClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export const RECORD_GRID_CELL_CONTROL_BASE_CLASS_NAME =
  "min-h-[2.5rem] w-full rounded-md border border-sky-500/35 bg-[var(--panel-background)] px-2.5 py-1.5 text-sm text-[var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/20 focus-visible:border-sky-400/70 disabled:cursor-not-allowed disabled:opacity-60"

export const RECORD_GRID_CELL_CONTROL_INVALID_CLASS_NAME = "border-rose-500/50 focus-visible:border-rose-500/60 focus-visible:ring-rose-500/20"

export function getRecordGridCellControlSizeClassName(size: "compact" | "regular" | "wide" = "regular") {
  if (size === "compact") {
    return "max-w-[6rem]"
  }

  if (size === "wide") {
    return "min-w-[10rem]"
  }

  return undefined
}

export function getRecordGridCellControlAlignClassName(align: "left" | "center" | "right" = "left") {
  if (align === "center") {
    return "text-center"
  }

  if (align === "right") {
    return "text-right"
  }

  return "text-left"
}
