"use client"

import {
  HubSidePanelEditLayout,
  HubSidePanelPickerTrigger,
} from "@/components/hub-side-panel"
import { TemplateSyncItemsSubHeader } from "@/modules/template-sync/components/header/template-sync-items-sub-header"
import { TemplateSyncClearButton } from "@/modules/template-sync/components/toolbar-controls/template-sync-clear-button"
import { TemplateSyncSyncButton } from "@/modules/template-sync/components/toolbar-controls/template-sync-sync-button"
import type { TemplateSyncController } from "@/modules/template-sync/controllers/use-template-sync-controller"

const PICKER_LABEL_CLASS =
  "text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65"

/**
 * Sticky top-toolbar for the template-sync side panel. Composes (top to
 * bottom): the right-aligned action button row, then the three cascade
 * picker triggers and the preview items sub-header (when applicable).
 * `HubSidePanelEditLayout` pins the actions on top to match the read-only
 * hub view and the other hub edit panels.
 */
export function TemplateSyncTopToolbar({ controller }: { controller: TemplateSyncController }) {
  const {
    isSyncing,
    expandedPicker,
    togglePicker,
    managementCompanyId,
    selectedManagementCompanyLabel,
    selectedPropertyLabel,
    selectedTemplateLabel,
    propertyId,
    templateId,
    managementCompanyTriggerRef,
    propertyTriggerRef,
    templateTriggerRef,
    itemsController,
    headerCollapsed,
    toggleHeaderCollapsed,
    hasSelections,
    canActOnTemplate,
    errorMessage,
    resetSelections,
    hubPanel,
    handleOpen,
    handleSync,
  } = controller

  return (
    <HubSidePanelEditLayout
      toolbar={
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <TemplateSyncClearButton
              disabled={!hasSelections || isSyncing}
              onClick={resetSelections}
            />
            <TemplateSyncSyncButton
              disabled={!canActOnTemplate || isSyncing}
              isSyncing={isSyncing}
              onClick={handleSync}
            />
          </div>
          {errorMessage ? (
            <p className="text-xs text-rose-400" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
      }
    >
      <label className="flex flex-col gap-1.5">
        <span className={PICKER_LABEL_CLASS}>Management company</span>
        <HubSidePanelPickerTrigger
          ref={managementCompanyTriggerRef}
          expanded={expandedPicker === "managementCompany"}
          onToggle={() => togglePicker("managementCompany")}
          selectedLabel={selectedManagementCompanyLabel}
          placeholder="Any management company (optional)"
          ariaLabel="Management company"
          onOpenLinked={() => {
            if (managementCompanyId) hubPanel.openForMcEditById(managementCompanyId)
          }}
          openLinkedAriaLabel="Open management company"
          openLinkedDisabled={isSyncing}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={PICKER_LABEL_CLASS}>Property</span>
        <HubSidePanelPickerTrigger
          ref={propertyTriggerRef}
          expanded={expandedPicker === "property"}
          onToggle={() => togglePicker("property")}
          selectedLabel={selectedPropertyLabel}
          placeholder="Select a property"
          ariaLabel="Property"
          onOpenLinked={() => {
            if (propertyId) hubPanel.openForPropertyEditById(propertyId)
          }}
          openLinkedAriaLabel="Open property"
          openLinkedDisabled={isSyncing}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={PICKER_LABEL_CLASS}>Template</span>
        <HubSidePanelPickerTrigger
          ref={templateTriggerRef}
          expanded={expandedPicker === "template"}
          onToggle={() => togglePicker("template")}
          selectedLabel={selectedTemplateLabel}
          disabled={propertyId === null}
          placeholder="Select a template"
          disabledPlaceholder="Select a property first"
          ariaLabel="Template"
          onOpenLinked={() => {
            if (templateId) handleOpen()
          }}
          openLinkedAriaLabel="Open template"
          openLinkedDisabled={isSyncing}
        />
      </label>

      {expandedPicker === null && itemsController.showSubHeader ? (
        <TemplateSyncItemsSubHeader
          controller={itemsController}
          headerCollapsed={headerCollapsed}
          onToggleHeader={toggleHeaderCollapsed}
        />
      ) : null}
    </HubSidePanelEditLayout>
  )
}
