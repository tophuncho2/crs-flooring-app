/** A resolved picker selection: the id plus a pre-resolved display label. */
export type CascadeSelection = {
  id: string
  label: string | null
}

/**
 * Direct seed for the cascade selections (e.g. pre-setting the pickers from a
 * loaded parent record). An omitted key leaves that step untouched; an explicit
 * `null` clears it. No cascade side-effects (no downstream clear).
 */
export type CascadePickerSeed = {
  entity?: CascadeSelection | null
  property?: CascadeSelection | null
  template?: CascadeSelection | null
}
