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
import type {
  HubMode,
  PropertyHubSidePanelController,
} from "@/modules/properties/controllers/property-hub-side-panel"
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

const PICKER_LABEL_CLASS =
  "text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65"

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
    mcMode,
    mcLinkLabel,
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
    pickerKind,
    openPicker,
  } = controller

  // Collapse picker-takeover onto its returnTo for chrome rendering — keeps
  // the trigger sticky and visible while the picker fills the body below,
  // and lets the trigger toggle the picker closed when fired again
  // (matches the inventory-hub cut-log relink header pattern).
  const effectiveMode: HubMode =
    mode.kind === "picker-takeover" ? mode.returnTo : mode
  const isPickerActive = mode.kind === "picker-takeover"

  const hasHubViewTarget = contextMcId !== null

  const errorMessage = validationError ?? error ?? null

  const title = useMemo<ReactNode>(() => {
    switch (effectiveMode.kind) {
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
      default:
        return "Hub"
    }
  }, [effectiveMode, managementCompany, propertyEditMcLabel])

  const topToolbar = useMemo<ReactNode>(() => {
    if (effectiveMode.kind === "create") {
      const linkDisabled = mcMode === "create" || isSaving
      return (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={PICKER_LABEL_CLASS}>Management company</span>
            <HubSidePanelPickerTrigger
              expanded={pickerKind === "mc-link"}
              onToggle={() => openPicker("mc-link")}
              selectedLabel={mcLinkLabel}
              placeholder="Link existing company"
              disabled={linkDisabled}
              ariaLabel="Link management company"
            />
          </label>
          {isPickerActive ? null : (
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
          )}
        </div>
      )
    }
    if (effectiveMode.kind === "section-edit-mc") {
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
    if (effectiveMode.kind === "section-edit-property") {
      return (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={PICKER_LABEL_CLASS}>Management company</span>
            <HubSidePanelPickerTrigger
              expanded={pickerKind === "mc-link"}
              onToggle={() => openPicker("mc-link")}
              selectedLabel={propertyEditMcLabel}
              placeholder="No management company"
              disabled={isSaving}
              ariaLabel="Link management company"
            />
          </label>
          {isPickerActive ? null : (
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
          )}
        </div>
      )
    }
    if (effectiveMode.kind === "view") {
      const tab = effectiveMode.tab
      const showPropertiesPagination =
        !isPickerActive && tab === "properties" && properties.hasData
      const showTemplatesPagination =
        !isPickerActive && tab === "templates" && templates.hasData
      const isTemplates = tab === "templates"
      return (
        <div className="flex flex-col gap-2">
          <HubSidePanelViewSwitcher
            label={tab === "properties" ? "Properties" : "Templates"}
            prevDisabled={tab === "properties"}
            nextDisabled={tab === "templates"}
            onGoPrev={goToProperties}
            onGoNext={goToTemplates}
            prevAriaLabel="Show properties"
            nextAriaLabel="Show templates"
          />
          {isTemplates ? (
            <HubSidePanelPickerTrigger
              expanded={pickerKind === "property-filter"}
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
    return null
  }, [
    effectiveMode,
    isPickerActive,
    pickerKind,
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
    propertyEditMcLabel,
    mcMode,
    mcLinkLabel,
    goToProperties,
    goToTemplates,
    openPicker,
  ])

  const handleOpenTemplate = onOpenTemplate ?? (() => {})

  return (
    <HubSidePanelShell open={isOpen} onClose={close} title={title} topToolbar={topToolbar}>
      {mode.kind === "create" ? (
        <div className="flex flex-col gap-5">
          <PropertyHubMcCreateSection controller={controller} />
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
