/**
 * Primary/field sections are read-only while a sibling drilldown has a child
 * drilled in (the operator is reading the parent record, not editing it) — and
 * while the section itself is saving. Shared by inventory ⇄ adjustments and
 * management-company ⇄ properties so both record views lock identically.
 */
export function recordPrimaryEditable(opts: {
  isSaving: boolean
  /** A drilldown child is open: the consumer's `selectedChildId !== null`. */
  drilldownOpen: boolean
}): boolean {
  return !opts.isSaving && !opts.drilldownOpen
}
