"use client"

import type { ReactNode } from "react"
import type { FormFieldProps } from "./contracts/form-field"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type FormFieldWrapperProps = FormFieldProps & {
  children: ReactNode
  className?: string
}

/**
 * Labelled-control wrapper. Place any cell from `cells/` inside as the
 * control. Adds:
 * - the label (with optional `*` when `required`)
 * - optional hint text under the label
 * - optional error message under the control
 *
 *   <FormField label="Order Number">
 *     <TextCell editable={true} value={form.orderNumber} onChange={...} />
 *   </FormField>
 */
export function FormField({
  label,
  hint,
  error,
  required,
  children,
  className,
}: FormFieldWrapperProps) {
  return (
    <label className={joinClassNames("flex min-w-0 flex-col gap-1 text-sm", className)}>
      <span className="flex items-center gap-1 text-[var(--foreground)]/80">
        {label}
        {required ? <span aria-hidden="true" className="text-rose-600">*</span> : null}
      </span>
      {hint ? <span className="text-xs text-[var(--foreground)]/55">{hint}</span> : null}
      {children}
      {error ? <span className="text-xs text-rose-700">{error}</span> : null}
    </label>
  )
}
