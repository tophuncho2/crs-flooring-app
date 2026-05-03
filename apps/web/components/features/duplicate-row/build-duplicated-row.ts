// Pure helper — produces a new row form by copying selected fields from a
// source row and filling everything else from a defaults object. The first
// consumer is the work-orders Material Items section (copy productId +
// categoryFilterId, blank quantity + notes), but the helper is intentionally
// domain-agnostic so any module with a row-form shape can adopt it.

export type DuplicateRowConfig<TForm> = {
  /** Field keys copied verbatim from `source` to the new row. */
  copy: ReadonlyArray<keyof TForm>
  /** Default values for fields not copied (typically blank/null). */
  defaults: TForm
}

/**
 * Build a new row form by copying selected fields from `source` and filling
 * everything else from `defaults`. Pure — no side effects, no mutation of
 * `source`. Field identity is by key; consumers who need transforms should
 * map after this call.
 */
export function buildDuplicatedRow<TForm extends object>(
  source: TForm,
  config: DuplicateRowConfig<TForm>,
): TForm {
  const result: TForm = { ...config.defaults }
  for (const key of config.copy) {
    result[key] = source[key]
  }
  return result
}
