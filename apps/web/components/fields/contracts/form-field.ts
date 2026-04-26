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
}
