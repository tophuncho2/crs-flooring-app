"use client"

import { useRef } from "react"
import type { PropertyListRow, TemplateListRow } from "@builders/domain"
import { SidePanelPreview } from "@/components/side-panel-preview"
import type { PropertyHubViewSidePanelController } from "@/modules/properties/controllers/property-hub-view-side-panel"
import { PropertyHubViewManagementCompanySection } from "./property-hub-view-management-company-section"
import { PropertyHubViewPropertiesSection } from "./property-hub-view-properties-section"
import { PropertyHubViewPropertyFilterOptionsPanel } from "./property-hub-view-property-filter-options-panel"
import { PropertyHubViewPropertyFilterTrigger } from "./property-hub-view-property-filter-trigger"
import { PropertyHubViewTemplatesSection } from "./property-hub-view-templates-section"
import { PropertyHubViewViewSwitcher } from "./property-hub-view-view-switcher"
import { PropertyHubViewSidePanelPrevPageButton } from "./toolbar-controls/property-hub-view-side-panel-prev-page-button"
import { PropertyHubViewSidePanelNextPageButton } from "./toolbar-controls/property-hub-view-side-panel-next-page-button"
import { PropertyHubViewSidePanelPageIndicator } from "./toolbar-controls/property-hub-view-side-panel-page-indicator"
import { PropertyHubViewSidePanelTemplatesPrevPageButton } from "./toolbar-controls/property-hub-view-side-panel-templates-prev-page-button"
import { PropertyHubViewSidePanelTemplatesNextPageButton } from "./toolbar-controls/property-hub-view-side-panel-templates-next-page-button"
import { PropertyHubViewSidePanelTemplatesPageIndicator } from "./toolbar-controls/property-hub-view-side-panel-templates-page-indicator"

export type PropertyHubViewSidePanelProps = {
  controller: PropertyHubViewSidePanelController
  onOpenProperty: (row: PropertyListRow) => void
  onOpenTemplate?: (row: TemplateListRow) => void
}

/**
 * Right-anchored read-only side panel with two views: the picked management
 * company's properties (default) and the same hub's templates. A view
 * switcher sits in the sticky header below the title bar; the templates
 * view adds its own property-filter dropdown above its pagination row.
 * Row-click handlers are wired by the list-view caller (the panel does not
 * know about the property side panel or the future template preview).
 */
export function PropertyHubViewSidePanel({
  controller,
  onOpenProperty,
  onOpenTemplate,
}: PropertyHubViewSidePanelProps) {
  const {
    isOpen,
    managementCompany,
    managementCompanyId,
    properties,
    templates,
    activeView,
    selectedPropertyId,
    selectedPropertyLabel,
    propertyFilterExpanded,
    close,
    goToProperties,
    goToTemplates,
    togglePropertyFilter,
    cancelPropertyFilter,
    selectPropertyFilter,
    clearPropertyFilter,
  } = controller

  const title = managementCompany?.name ?? "Hub"
  const filterTriggerRef = useRef<HTMLButtonElement | null>(null)

  const showPropertiesPagination = activeView === "properties" && properties.hasData
  const showTemplatesPagination =
    activeView === "templates" && !propertyFilterExpanded && templates.hasData

  const stickyHeader = (
    <div className="flex flex-col gap-2">
      <PropertyHubViewViewSwitcher
        activeView={activeView}
        onGoToProperties={goToProperties}
        onGoToTemplates={goToTemplates}
      />

      {activeView === "templates" ? (
        <PropertyHubViewPropertyFilterTrigger
          ref={filterTriggerRef}
          expanded={propertyFilterExpanded}
          onToggle={togglePropertyFilter}
          selectedLabel={selectedPropertyLabel}
          ariaLabel="Filter templates by property"
        />
      ) : null}

      {showPropertiesPagination ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-1">
          <PropertyHubViewSidePanelPageIndicator controller={controller} />
          <div className="flex items-center gap-1">
            <PropertyHubViewSidePanelPrevPageButton controller={controller} />
            <PropertyHubViewSidePanelNextPageButton controller={controller} />
          </div>
        </div>
      ) : null}

      {showTemplatesPagination ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-1">
          <PropertyHubViewSidePanelTemplatesPageIndicator controller={controller} />
          <div className="flex items-center gap-1">
            <PropertyHubViewSidePanelTemplatesPrevPageButton controller={controller} />
            <PropertyHubViewSidePanelTemplatesNextPageButton controller={controller} />
          </div>
        </div>
      ) : null}
    </div>
  )

  const handleSelectFilter = (id: string, label: string) => {
    selectPropertyFilter(id, label)
    filterTriggerRef.current?.focus()
  }

  const handleClearFilter = () => {
    clearPropertyFilter()
    filterTriggerRef.current?.focus()
  }

  const handleCancelFilter = () => {
    cancelPropertyFilter()
    filterTriggerRef.current?.focus()
  }

  const handleOpenTemplate = onOpenTemplate ?? noop

  return (
    <SidePanelPreview
      open={isOpen}
      side="right"
      onClose={close}
      title={title}
      widthClassName="w-[34rem]"
      stickyHeader={stickyHeader}
    >
      {activeView === "properties" ? (
        <div className="flex flex-col gap-5">
          <PropertyHubViewManagementCompanySection controller={controller} />
          <PropertyHubViewPropertiesSection
            controller={controller}
            onOpenProperty={onOpenProperty}
          />
        </div>
      ) : propertyFilterExpanded && managementCompanyId ? (
        <PropertyHubViewPropertyFilterOptionsPanel
          managementCompanyId={managementCompanyId}
          selectedId={selectedPropertyId}
          selectedLabel={selectedPropertyLabel}
          onSelect={handleSelectFilter}
          onClear={handleClearFilter}
          onCancel={handleCancelFilter}
        />
      ) : (
        <PropertyHubViewTemplatesSection
          controller={controller}
          onOpenTemplate={handleOpenTemplate}
        />
      )}
    </SidePanelPreview>
  )
}

function noop() {
  /* placeholder until the template-preview wiring lands */
}
