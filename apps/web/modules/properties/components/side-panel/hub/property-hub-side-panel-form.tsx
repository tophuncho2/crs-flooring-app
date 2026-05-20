"use client"

import type { PropertyHubSidePanelController } from "@/modules/properties/controllers/property-hub-side-panel"
import { PropertyHubManagementCompanySection } from "./property-hub-management-company-section"
import { PropertyHubPropertySection } from "./property-hub-property-section"

export function PropertyHubSidePanelForm({
  controller,
}: {
  controller: PropertyHubSidePanelController
}) {
  return (
    <div className="flex flex-col gap-5">
      <PropertyHubManagementCompanySection controller={controller} />
      <PropertyHubPropertySection controller={controller} />
    </div>
  )
}
