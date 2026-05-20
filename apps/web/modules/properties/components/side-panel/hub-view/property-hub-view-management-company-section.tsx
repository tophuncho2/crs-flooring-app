"use client"

import {
  SidePanelPreviewReadonlyRow,
  SidePanelPreviewReadonlySection,
  SidePanelPreviewSection,
} from "@/components/side-panel-preview"
import type { PropertyHubViewSidePanelController } from "@/modules/properties/controllers/property-hub-view-side-panel"

const EMPTY_VALUE = "—"

export function PropertyHubViewManagementCompanySection({
  controller,
}: {
  controller: PropertyHubViewSidePanelController
}) {
  const { managementCompany, isLoadingDetail, isErrorDetail } = controller

  if (isLoadingDetail) {
    return (
      <SidePanelPreviewSection title="Management Company">
        <p className="text-xs text-[var(--foreground)]/55">Loading management company…</p>
      </SidePanelPreviewSection>
    )
  }

  if (isErrorDetail || !managementCompany) {
    return (
      <SidePanelPreviewSection title="Management Company">
        <p className="text-xs text-rose-700">Could not load management company.</p>
      </SidePanelPreviewSection>
    )
  }

  return (
    <SidePanelPreviewSection title="Management Company">
      <SidePanelPreviewReadonlySection>
        <SidePanelPreviewReadonlyRow label="Name" value={managementCompany.name} />
        <SidePanelPreviewReadonlyRow label="Phone" value={managementCompany.phone || EMPTY_VALUE} />
        <SidePanelPreviewReadonlyRow label="Email" value={managementCompany.email || EMPTY_VALUE} />
        <SidePanelPreviewReadonlyRow
          label="Address"
          value={managementCompany.fullAddress || EMPTY_VALUE}
          multiline
        />
      </SidePanelPreviewReadonlySection>
    </SidePanelPreviewSection>
  )
}
