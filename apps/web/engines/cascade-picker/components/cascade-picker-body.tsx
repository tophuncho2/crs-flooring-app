"use client"

import type {
  ManagementCompanyOption,
  PropertyOption,
  TemplateOption,
} from "@builders/domain"
import type { CascadePickerController } from "../client/use-cascade-picker-controller"
import type { CascadePickerStepConfig } from "../contracts/cascade-picker-contracts"
import { CascadePickerOptionsPanel } from "./cascade-picker-options-panel"

export type CascadePickerSteps = {
  managementCompany: CascadePickerStepConfig<ManagementCompanyOption>
  property: CascadePickerStepConfig<PropertyOption>
  template: CascadePickerStepConfig<TemplateOption>
}

/**
 * Renders the expanded options panel for whichever cascade step is open, wiring
 * each panel's selection back to the controller. Returns null when no step is
 * expanded (the host renders its own content below the triggers). The template
 * panel only mounts once a property is selected — its trigger is gated too.
 */
export function CascadePickerBody({
  controller,
  steps,
}: {
  controller: CascadePickerController
  steps: CascadePickerSteps
}) {
  const {
    expandedStep,
    managementCompanyId,
    managementCompanyLabel,
    propertyId,
    propertyLabel,
    templateId,
    templateLabel,
    selectManagementCompany,
    selectProperty,
    selectTemplate,
    cancelExpanded,
  } = controller

  if (expandedStep === "managementCompany") {
    return (
      <CascadePickerOptionsPanel<ManagementCompanyOption>
        step={steps.managementCompany}
        currentValue={managementCompanyId}
        currentLabel={managementCompanyLabel}
        onSelect={selectManagementCompany}
        onCancel={cancelExpanded}
      />
    )
  }

  if (expandedStep === "property") {
    return (
      <CascadePickerOptionsPanel<PropertyOption>
        step={steps.property}
        currentValue={propertyId}
        currentLabel={propertyLabel}
        onSelect={selectProperty}
        onCancel={cancelExpanded}
      />
    )
  }

  if (expandedStep === "template" && propertyId) {
    return (
      <CascadePickerOptionsPanel<TemplateOption>
        step={steps.template}
        currentValue={templateId}
        currentLabel={templateLabel}
        onSelect={selectTemplate}
        onCancel={cancelExpanded}
      />
    )
  }

  return null
}
