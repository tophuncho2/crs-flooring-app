"use client"

import {
  HubSidePanelPickerTrigger,
  HubSidePanelViewSwitcher,
} from "@/components/hub-side-panel"
import { SidePanelPreviewNewButton } from "@/components/side-panel-preview"
import { TemplateSyncItemsSubHeader } from "@/modules/template-sync/components/header/template-sync-items-sub-header"
import { TemplateSyncClearButton } from "@/modules/template-sync/components/toolbar-controls/template-sync-clear-button"
import { TemplateSyncNewButton } from "@/modules/template-sync/components/toolbar-controls/template-sync-new-button"
import { TemplateSyncOpenButton } from "@/modules/template-sync/components/toolbar-controls/template-sync-open-button"
import { TemplateSyncSyncButton } from "@/modules/template-sync/components/toolbar-controls/template-sync-sync-button"
import type { TemplateSyncController } from "@/modules/template-sync/controllers/use-template-sync-controller"

const PICKER_LABEL_CLASS =
  "text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65"

/**
 * Sticky top-toolbar for the template-sync side panel. Composes (top to
 * bottom): view-switcher arrows, the three cascade picker triggers, the
 * preview items sub-header (when applicable), and the right-aligned action
 * button row.
 */
export function TemplateSyncTopToolbar({ controller }: { controller: TemplateSyncController }) {
  const {
    arrowsEnabled,
    isSyncing,
    handleArrowPrev,
    handleArrowNext,
    expandedPicker,
    togglePicker,
    selectedManagementCompanyLabel,
    selectedPropertyLabel,
    selectedTemplateLabel,
    propertyId,
    managementCompanyTriggerRef,
    propertyTriggerRef,
    templateTriggerRef,
    itemsController,
    headerCollapsed,
    toggleHeaderCollapsed,
    hasSelections,
    canCreateForProperty,
    canActOnTemplate,
    errorMessage,
    resetSelections,
    handleCreateHub,
    handleCreate,
    handleOpen,
    handleSync,
  } = controller

  return (
    <div className="flex flex-col gap-3">
      <HubSidePanelViewSwitcher
        label="Template sync"
        prevDisabled={!arrowsEnabled || isSyncing}
        nextDisabled={!arrowsEnabled || isSyncing}
        onGoPrev={handleArrowPrev}
        onGoNext={handleArrowNext}
        prevAriaLabel="Open properties hub view"
        nextAriaLabel="Open templates hub view"
      />

      <label className="flex flex-col gap-1.5">
        <span className={PICKER_LABEL_CLASS}>Management company</span>
        <HubSidePanelPickerTrigger
          ref={managementCompanyTriggerRef}
          expanded={expandedPicker === "managementCompany"}
          onToggle={() => togglePicker("managementCompany")}
          selectedLabel={selectedManagementCompanyLabel}
          placeholder="Any management company (optional)"
          ariaLabel="Management company"
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
        />
      </label>

      {expandedPicker === null && itemsController.showSubHeader ? (
        <TemplateSyncItemsSubHeader
          controller={itemsController}
          headerCollapsed={headerCollapsed}
          onToggleHeader={toggleHeaderCollapsed}
        />
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <TemplateSyncClearButton
            disabled={!hasSelections || isSyncing}
            onClick={resetSelections}
          />
          <SidePanelPreviewNewButton
            disabled={isSyncing}
            onClick={handleCreateHub}
            label="Create hub"
          />
          <TemplateSyncNewButton
            disabled={!canCreateForProperty || isSyncing}
            onClick={handleCreate}
          />
          <TemplateSyncOpenButton
            disabled={!canActOnTemplate || isSyncing}
            onClick={handleOpen}
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
    </div>
  )
}
