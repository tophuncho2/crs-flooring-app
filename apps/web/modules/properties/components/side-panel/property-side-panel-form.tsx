"use client"

import type { PropertySidePanelController } from "@/modules/properties/controllers/property-side-panel"
import { PropertySidePanelManagementCompanySection } from "./management-company-section"
import { PropertySidePanelPropertySection } from "./property-section"

export function PropertySidePanelForm({
  controller,
}: {
  controller: PropertySidePanelController
}) {
  return (
    <div className="flex flex-col gap-5">
      <PropertySidePanelManagementCompanySection controller={controller} />
      <PropertySidePanelPropertySection controller={controller} />
    </div>
  )
}
