"use client"

import { useMemo, type ReactNode } from "react"
import type { TemplateListRow } from "@builders/domain"
import {
  HubSidePanelEditToolbar,
  HubSidePanelPagination,
  HubSidePanelPickerTrigger,
  HubSidePanelShell,
  HubSidePanelViewSwitcher,
} from "@/components/hub-side-panel"
import type { PropertyHubSidePanelController } from "@/modules/properties/controllers/property-hub-side-panel"
import { PropertyHubMcCreateSection } from "./property-hub-mc-create-section"
import { PropertyHubMcEditSection } from "./property-hub-mc-edit-section"
import { PropertyHubMcViewSection } from "./property-hub-mc-view-section"
import { PropertyHubMcLinkPicker } from "./property-hub-mc-link-picker"
import { PropertyHubPropertiesListSection } from "./property-hub-properties-list-section"
import { PropertyHubPropertyCreateSection } from "./property-hub-property-create-section"
import { PropertyHubPropertyEditMcSection } from "./property-hub-property-edit-mc-section"
import { PropertyHubPropertyEditSection } from "./property-hub-property-edit-section"
import { PropertyHubPropertyFilterPicker } from "./property-hub-property-filter-picker"
import { PropertyHubTemplatesListSection } from "./property-hub-templates-list-section"

export type PropertyHubSidePanelProps = {
  controller: PropertyHubSidePanelController
  /**
   * Row-click handler for the templates list inside the hub view. List
   * clients pass a navigator (e.g. `router.push`) here; if omitted the
   * templates rows are no-ops.
   */
  onOpenTemplate?: (row: TemplateListRow) => void
}

/**
 * Right-anchored unified hub side panel. One component covers every mode
 * the hub now owns:
 *   - view: read-only MC + paginated properties or templates
 *   - create: combined "+ Hub" form (MC link/create + property create)
 *   - section-edit-mc: MC fields editable, properties list dimmed below
 *   - section-edit-property: property cells replace the list area
 *   - picker-takeover: inline-in-body picker (mc-link or property-filter)
 *
 * Save / Discard / Delete and the status pill live in the sticky-header
 * edit toolbar (no footer). The view mode swaps that header for the view
 * switcher + pagination row instead.
 */
export function PropertyHubSidePanel({
  controller,
  onOpenTemplate,
}: PropertyHubSidePanelProps) {
  const {
    isOpen,
    mode,
    contextMcId,
    managementCompany,
    selectedPropertyLabel,
    propertyEditMcLabel,
    properties,
    templates,
    isDirty,
    isSaving,
    canSave,
    validationError,
    error,
    save,
    discard,
    close,
    deleteMc,
    deleteProperty,
    exitToView,
    goToProperties,
    goToTemplates,
    openPicker,
  } = controller

  const hasHubViewTarget = contextMcId !== null

  const errorMessage = validationError ?? error ?? null

  const title = useMemo<ReactNode>(() => {
    switch (mode.kind) {
      case "create":
        return "New hub"
      case "section-edit-mc":
        return managementCompany?.name ?? "Management company"
      case "section-edit-property":
        return propertyEditMcLabel
          ? `${propertyEditMcLabel} — Property`
          : "Property"
      case "view":
        return managementCompany?.name ?? "Hub"
      case "picker-takeover":
        if (mode.pickerKind === "mc-link") return "Link management company"
        if (mode.pickerKind === "property-filter") return "Filter by property"
        return "Hub"
      default:
        return "Hub"
    }
  }, [mode, managementCompany, propertyEditMcLabel])

  const topToolbar = useMemo<ReactNode>(() => {
    if (mode.kind === "create") {
      return (
        <HubSidePanelEditToolbar
          isDirty={isDirty}
          isSaving={isSaving}
          canSave={canSave}
          onSave={save}
          onDiscard={discard}
          saveLabel="Create"
          savingLabel="Creating…"
          errorMessage={errorMessage}
        />
      )
    }
    if (mode.kind === "section-edit-mc") {
      return (
        <HubSidePanelEditToolbar
          isDirty={isDirty}
          isSaving={isSaving}
          canSave={canSave}
          onSave={save}
          onDiscard={discard}
          onDelete={deleteMc}
          onOpenHubView={hasHubViewTarget ? exitToView : undefined}
          errorMessage={errorMessage}
        />
      )
    }
    if (mode.kind === "section-edit-property") {
      return (
        <HubSidePanelEditToolbar
          isDirty={isDirty}
          isSaving={isSaving}
          canSave={canSave}
          onSave={save}
          onDiscard={discard}
          onDelete={deleteProperty}
          onOpenHubView={hasHubViewTarget ? exitToView : undefined}
          errorMessage={errorMessage}
        />
      )
    }
    if (mode.kind === "view") {
      const showPropertiesPagination = mode.tab === "properties" && properties.hasData
      const showTemplatesPagination = mode.tab === "templates" && templates.hasData
      const isTemplates = mode.tab === "templates"
      return (
        <div className="flex flex-col gap-2">
          <HubSidePanelViewSwitcher
            label={mode.tab === "properties" ? "Properties" : "Templates"}
            prevDisabled={mode.tab === "properties"}
            nextDisabled={mode.tab === "templates"}
            onGoPrev={goToProperties}
            onGoNext={goToTemplates}
            prevAriaLabel="Show properties"
            nextAriaLabel="Show templates"
          />
          {isTemplates ? (
            <HubSidePanelPickerTrigger
              expanded={false}
              onToggle={() => openPicker("property-filter")}
              selectedLabel={selectedPropertyLabel}
              placeholder="All properties"
              ariaLabel="Filter templates by property"
            />
          ) : null}
          {showPropertiesPagination ? (
            <HubSidePanelPagination
              page={properties.page}
              totalPages={properties.totalPages}
              total={properties.total}
              totalLabel="properties"
              canPrev={properties.canPrev}
              canNext={properties.canNext}
              onGoPrev={properties.goPrev}
              onGoNext={properties.goNext}
            />
          ) : null}
          {showTemplatesPagination ? (
            <HubSidePanelPagination
              page={templates.page}
              totalPages={templates.totalPages}
              total={templates.total}
              totalLabel="templates"
              canPrev={templates.canPrev}
              canNext={templates.canNext}
              onGoPrev={templates.goPrev}
              onGoNext={templates.goNext}
            />
          ) : null}
        </div>
      )
    }
    if (mode.kind === "picker-takeover") {
      // Picker takeover keeps a minimal sticky header: just an empty placeholder
      // so the panel's chrome doesn't jump. The body owns the picker UI.
      return null
    }
    return null
  }, [
    mode,
    isDirty,
    isSaving,
    canSave,
    save,
    discard,
    deleteMc,
    deleteProperty,
    exitToView,
    hasHubViewTarget,
    errorMessage,
    properties,
    templates,
    selectedPropertyLabel,
    goToProperties,
    goToTemplates,
    openPicker,
  ])

  const handleOpenTemplate = onOpenTemplate ?? (() => {})

  return (
    <HubSidePanelShell open={isOpen} onClose={close} title={title} topToolbar={topToolbar}>
      {mode.kind === "create" ? (
        <div className="flex flex-col gap-5">
          <PropertyHubMcCreateSection controller={controller} pickerExpanded={false} />
          <PropertyHubPropertyCreateSection controller={controller} />
        </div>
      ) : mode.kind === "section-edit-mc" ? (
        <div className="flex flex-col gap-5">
          <PropertyHubMcEditSection controller={controller} />
          <PropertyHubPropertiesListSection controller={controller} dimmed />
        </div>
      ) : mode.kind === "section-edit-property" ? (
        <div className="flex flex-col gap-5">
          <PropertyHubPropertyEditMcSection controller={controller} />
          <PropertyHubPropertyEditSection controller={controller} />
        </div>
      ) : mode.kind === "view" ? (
        mode.tab === "properties" ? (
          <div className="flex flex-col gap-5">
            <PropertyHubMcViewSection controller={controller} />
            <PropertyHubPropertiesListSection controller={controller} />
          </div>
        ) : (
          <PropertyHubTemplatesListSection
            controller={controller}
            onOpenTemplate={handleOpenTemplate}
          />
        )
      ) : mode.kind === "picker-takeover" ? (
        mode.pickerKind === "mc-link" ? (
          <PropertyHubMcLinkPicker controller={controller} />
        ) : (
          <PropertyHubPropertyFilterPicker controller={controller} />
        )
      ) : null}
    </HubSidePanelShell>
  )
}
