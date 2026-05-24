// Props every FormField wrapper exposes. Pure UI metadata — no validation
// logic; consumers compute `error` and pass it in. `required` is visual-only
// (renders an asterisk on the label).

export type FormFieldProps = {
  label: string
  /** Optional help text rendered under the label. */
  hint?: string
  /** Optional error message rendered under the control. */
  error?: string
  /** Visually marks the label as required (asterisk). Pure UI; no validation. */
  required?: boolean
  /**
   * Current length of the control's value. When set together with `maxLength`,
   * a `{currentLength}/{maxLength}` counter renders on the label row (rose at
   * the limit). Pass `undefined` in read-only mode to hide the counter. Pure
   * UI — does not enforce the limit; the control's own `maxLength` does that.
   */
  currentLength?: number
  /** Max length paired with `currentLength` to render the label-row counter. */
  maxLength?: number
}
