export function joinRecordSectionClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export const RECORD_SECTION_BORDER_CLASS_NAME = "border-[rgba(58,58,58,0.72)]"
/** Calm neutral header surface (replaces the old solid `bg-blue-500` bar). */
export const RECORD_SECTION_HEADER_SURFACE_CLASS_NAME = "bg-[var(--subpanel-background)]"
/** Thin identity accent spine on the header's left edge — square, so it stays
 *  flush against the section edge. */
export const RECORD_SECTION_HEADER_ACCENT_SPINE_CLASS_NAME = "bg-blue-500"
/** Hover treatment for the dedicated collapse chevron (no longer the whole bar). */
export const RECORD_SECTION_HEADER_HOVER_CLASS_NAME =
  "hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)]"
export const RECORD_SECTION_BODY_SURFACE_CLASS_NAME = "bg-[var(--panel-hover)]"
export const RECORD_SECTION_ITEM_SURFACE_CLASS_NAME = "bg-[var(--panel-hover)]"
export const RECORD_SECTION_SHELL_CLASS_NAME =
  "isolate overflow-hidden rounded-2xl border bg-[var(--subpanel-background)] shadow-[0_16px_34px_rgba(0,0,0,0.12)]"
/** Flush variant of the section shell: squared corners + no drop-shadow so a
 *  table section bleeds edge-to-edge (nav rail → viewport) like a list page. */
export const RECORD_SECTION_SHELL_FLUSH_CLASS_NAME =
  "isolate overflow-hidden border bg-[var(--subpanel-background)]"
