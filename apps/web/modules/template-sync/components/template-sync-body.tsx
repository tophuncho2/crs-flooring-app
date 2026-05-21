"use client"

import { TemplateSyncManagementCompanyOptionsPanel } from "@/modules/template-sync/components/options/template-sync-management-company-options-panel"
import { TemplateSyncPropertyOptionsPanel } from "@/modules/template-sync/components/options/template-sync-property-options-panel"
import { TemplateSyncTemplateOptionsPanel } from "@/modules/template-sync/components/options/template-sync-template-options-panel"
import { TemplateSyncPreviewBody } from "@/modules/template-sync/components/template-sync-preview-body"
import type { TemplateSyncController } from "@/modules/template-sync/controllers/use-template-sync-controller"

/**
 * Body content for the template-sync side panel. Renders the expanded
 * cascade picker (mgmt-co / property / template) when one is open;
 * otherwise renders the template preview body. Returns null when no
 * template is selected and no picker is expanded.
 */
export function TemplateSyncBody({ controller }: { controller: TemplateSyncController }) {
  const {
    expandedPicker,
    managementCompanyId,
    selectedManagementCompanyLabel,
    propertyId,
    selectedPropertyLabel,
    templateId,
    selectedTemplateLabel,
    handleManagementCompanySelect,
    handlePropertySelect,
    handleTemplateSelect,
    handleCancelExpanded,
    itemsController,
    headerCollapsed,
  } = controller

  if (expandedPicker === "managementCompany") {
    return (
      <TemplateSyncManagementCompanyOptionsPanel
        currentValue={managementCompanyId}
        currentLabel={selectedManagementCompanyLabel}
        onSelect={handleManagementCompanySelect}
        onCancel={handleCancelExpanded}
      />
    )
  }

  if (expandedPicker === "property") {
    return (
      <TemplateSyncPropertyOptionsPanel
        managementCompanyId={managementCompanyId}
        currentValue={propertyId}
        currentLabel={selectedPropertyLabel}
        onSelect={handlePropertySelect}
        onCancel={handleCancelExpanded}
      />
    )
  }

  if (expandedPicker === "template" && propertyId) {
    return (
      <TemplateSyncTemplateOptionsPanel
        propertyId={propertyId}
        currentValue={templateId}
        currentLabel={selectedTemplateLabel}
        onSelect={handleTemplateSelect}
        onCancel={handleCancelExpanded}
      />
    )
  }

  if (templateId) {
    return (
      <TemplateSyncPreviewBody
        templateId={templateId}
        itemsController={itemsController}
        headerCollapsed={headerCollapsed}
      />
    )
  }

  return null
}
