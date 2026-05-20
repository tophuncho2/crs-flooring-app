"use client"

import type { PropertyListRow } from "@builders/domain"
import { SidePanelPreview } from "@/components/side-panel-preview"
import type { PropertyHubViewSidePanelController } from "@/modules/properties/controllers/property-hub-view-side-panel"
import { PropertyHubViewManagementCompanySection } from "./property-hub-view-management-company-section"
import { PropertyHubViewPropertiesSection } from "./property-hub-view-properties-section"
import { PropertyHubViewSidePanelPrevPageButton } from "./toolbar-controls/property-hub-view-side-panel-prev-page-button"
import { PropertyHubViewSidePanelNextPageButton } from "./toolbar-controls/property-hub-view-side-panel-next-page-button"
import { PropertyHubViewSidePanelPageIndicator } from "./toolbar-controls/property-hub-view-side-panel-page-indicator"

export type PropertyHubViewSidePanelProps = {
  controller: PropertyHubViewSidePanelController
  onOpenProperty: (row: PropertyListRow) => void
}

/**
 * Right-anchored read-only side panel: shows the picked management company's
 * fields at the top and a paginated list of its properties below. Property
 * rows are clickable — the row-click handler is wired by the list-view
 * caller (the panel does not know about the property side panel).
 */
export function PropertyHubViewSidePanel({
  controller,
  onOpenProperty,
}: PropertyHubViewSidePanelProps) {
  const { isOpen, managementCompany, properties, close } = controller

  const title = managementCompany?.name ?? "Hub"

  const stickyHeader = properties.hasData ? (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-1">
      <PropertyHubViewSidePanelPageIndicator controller={controller} />
      <div className="flex items-center gap-1">
        <PropertyHubViewSidePanelPrevPageButton controller={controller} />
        <PropertyHubViewSidePanelNextPageButton controller={controller} />
      </div>
    </div>
  ) : undefined

  return (
    <SidePanelPreview
      open={isOpen}
      side="right"
      onClose={close}
      title={title}
      widthClassName="w-[34rem]"
      stickyHeader={stickyHeader}
    >
      <div className="flex flex-col gap-5">
        <PropertyHubViewManagementCompanySection controller={controller} />
        <PropertyHubViewPropertiesSection
          controller={controller}
          onOpenProperty={onOpenProperty}
        />
      </div>
    </SidePanelPreview>
  )
}
