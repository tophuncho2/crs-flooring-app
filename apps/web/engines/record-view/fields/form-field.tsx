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
 * - optional `{currentLength}/{maxLength}` counter on the label row
 * - optional hint text under the label
 * - optional error message under the control
 *
 *   <FormField label="Order Number">
 *     <TextCell editable={true} value={form.orderNumber} onChange={...} />
 *   </FormField>
 */
export function FormField({
  label,
  actions,
  hint,
  error,
  required,
  currentLength,
  maxLength,
  children,
  className,
}: FormFieldWrapperProps) {
  const showCounter = typeof currentLength === "number" && typeof maxLength === "number"
  const atMax = showCounter && (currentLength as number) >= (maxLength as number)
  // A <label> forwards a click anywhere inside it to its first labelable
  // descendant. When the cell hosts action buttons (e.g. `RecordOpenButton`),
  // that first labelable descendant is the action <button> — so clicking the
  // cell would fire "open record" instead of just clicking the icon. Drop to a
  // plain <div> when actions are present; keep <label> (click-label-to-focus the
  // control) otherwise.
  const Wrapper = actions ? "div" : "label"
  return (
    <Wrapper className={joinClassNames("flex min-w-0 flex-col gap-1 text-sm", className)}>
      <span className="flex items-center justify-between gap-2 text-[var(--foreground)]/80">
        <span className="flex items-center gap-1">
          {label}
          {required ? <span aria-hidden="true" className="text-base leading-none text-rose-600">*</span> : null}
        </span>
        {showCounter || actions ? (
          <span className="flex items-center gap-2">
            {showCounter ? (
              <span
                className={joinClassNames(
                  "text-[10px] tabular-nums",
                  atMax ? "text-rose-700" : "text-[var(--foreground)]/55",
                )}
              >
                {currentLength}/{maxLength}
              </span>
            ) : null}
            {actions ? <span className="flex items-center gap-1">{actions}</span> : null}
          </span>
        ) : null}
      </span>
      {hint ? <span className="text-xs text-[var(--foreground)]/55">{hint}</span> : null}
      {children}
      {error ? <span className="text-xs text-rose-700">{error}</span> : null}
    </Wrapper>
  )
}
