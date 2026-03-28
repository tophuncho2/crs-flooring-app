export function joinRecordSectionClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export const RECORD_SECTION_BORDER_CLASS_NAME = "border-[rgba(58,58,58,0.72)]"
export const RECORD_SECTION_HEADER_SURFACE_CLASS_NAME = "bg-[rgba(58,58,58,0.72)]"
export const RECORD_SECTION_HEADER_HOVER_CLASS_NAME =
  "hover:bg-[var(--panel-hover)]/55 hover:shadow-[0_0_22px_rgba(59,130,246,0.16)]"
export const RECORD_SECTION_BODY_SURFACE_CLASS_NAME = "bg-[var(--subpanel-background)]"
export const RECORD_SECTION_ITEM_SURFACE_CLASS_NAME = "bg-[var(--panel-background)]"
