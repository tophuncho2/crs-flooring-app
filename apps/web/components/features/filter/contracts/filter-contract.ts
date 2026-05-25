// Controlled-component contract for filter UI. The list controller
// (`useFetchListController`) owns the values map; standalone consumers
// can pass anything that matches this shape directly to a FilterControl.
//
// Each field declares its options + label; values are a multi-value map
// keyed by field key. Toggling a value calls `onChange(key, nextValues)`.

export type FilterOption = {
  value: string
  label: string
}

export type FilterFieldDef = {
  /** URL param key + state-map key. Must be unique within `fields`. */
  key: string
  /** Display label shown above the toggle group. */
  label: string
  /** Label shown for the per-field clear button. Defaults to "Any". */
  clearLabel?: string
  options: FilterOption[]
}

export type FilterContract = {
  fields: FilterFieldDef[]
  values: Record<string, string[]>
  onChange: (key: string, values: string[]) => void
  onClearAll?: () => void
  /**
   * Optional shared identity for the open/closed panel state. Each
   * FilterControl panel is normally module-scoped; supply distinct
   * `panelKey` values if multiple FilterControls render on the same page.
   */
  panelKey?: string
  ariaLabel?: string
}
