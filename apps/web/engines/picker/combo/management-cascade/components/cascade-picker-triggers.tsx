"use client"

import type { ReactNode } from "react"
import {
  PickerEditLayout,
  PickerTrigger,
} from "../../../chrome"
import type { CascadePickerController } from "../client/use-cascade-picker-controller"

const PICKER_LABEL_CLASS =
  "text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65"

export type CascadePickerTriggersProps = {
  controller: CascadePickerController
  /** Right-aligned action slot above the triggers (Clear, New template, …). */
  actions?: ReactNode
  /** Inline error rendered beneath the actions row. */
  error?: string | null
  /** Disables every trigger + open-linked arrow (e.g. while a record loads). */
  disabled?: boolean
  /** Open-linked arrow handlers — omit a step to hide its arrow. */
  onOpenManagementCompany?: (managementCompanyId: string) => void
  onOpenProperty?: (propertyId: string, managementCompanyId: string | null) => void
  onOpenTemplate?: (templateId: string) => void
}

/**
 * The three cascade trigger buttons (Management Company → Property → Template)
 * stacked vertically, with an optional right-aligned actions slot pinned above.
 * The Template trigger stays disabled until a Property is selected. Each
 * trigger optionally exposes an "open linked record" arrow wired by the host.
 */
export function CascadePickerTriggers({
  controller,
  actions,
  error,
  disabled = false,
  onOpenManagementCompany,
  onOpenProperty,
  onOpenTemplate,
}: CascadePickerTriggersProps) {
  const {
    expandedStep,
    toggleStep,
    managementCompanyId,
    managementCompanyLabel,
    propertyId,
    propertyLabel,
    templateId,
    templateLabel,
    managementCompanyTriggerRef,
    propertyTriggerRef,
    templateTriggerRef,
  } = controller

  return (
    <PickerEditLayout
      toolbar={
        actions || error ? (
          <div className="flex flex-col gap-2">
            {actions ? (
              <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
            ) : null}
            {error ? (
              <p className="text-xs text-rose-400" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        ) : undefined
      }
    >
      <label className="flex flex-col gap-1.5">
        <span className={PICKER_LABEL_CLASS}>Management company</span>
        <PickerTrigger
          ref={managementCompanyTriggerRef}
          expanded={expandedStep === "managementCompany"}
          onToggle={() => toggleStep("managementCompany")}
          selectedLabel={managementCompanyLabel}
          placeholder="Any management company (optional)"
          ariaLabel="Management company"
          onOpenLinked={
            onOpenManagementCompany
              ? () => {
                  if (managementCompanyId) onOpenManagementCompany(managementCompanyId)
                }
              : undefined
          }
          openLinkedAriaLabel="Open management company"
          openLinkedDisabled={disabled}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={PICKER_LABEL_CLASS}>Property</span>
        <PickerTrigger
          ref={propertyTriggerRef}
          expanded={expandedStep === "property"}
          onToggle={() => toggleStep("property")}
          selectedLabel={propertyLabel}
          placeholder="Select a property"
          ariaLabel="Property"
          onOpenLinked={
            onOpenProperty
              ? () => {
                  if (propertyId) onOpenProperty(propertyId, managementCompanyId)
                }
              : undefined
          }
          openLinkedAriaLabel="Open property"
          openLinkedDisabled={disabled}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={PICKER_LABEL_CLASS}>Template</span>
        <PickerTrigger
          ref={templateTriggerRef}
          expanded={expandedStep === "template"}
          onToggle={() => toggleStep("template")}
          selectedLabel={templateLabel}
          disabled={disabled || propertyId === null}
          placeholder="Select a template"
          disabledPlaceholder="Select a property first"
          ariaLabel="Template"
          onOpenLinked={
            onOpenTemplate
              ? () => {
                  if (templateId) onOpenTemplate(templateId)
                }
              : undefined
          }
          openLinkedAriaLabel="Open template"
          openLinkedDisabled={disabled}
        />
      </label>
    </PickerEditLayout>
  )
}
