"use client"

import {
  SidePanelPreviewReadonlyRow,
  SidePanelPreviewReadonlySection,
} from "@/components/side-panel-preview"
import { HubSidePanelSection } from "@/components/hub-side-panel"
import type { PropertyHubSidePanelController } from "@/modules/properties/controllers/property-hub-side-panel"

const EMPTY_VALUE = "—"

/**
 * Read-only MC summary card. Click anywhere on the card to transition the
 * panel into `section-edit-mc` mode (the top toolbar swaps to Save / Discard
 * / Delete). When another section owns the edit toolbar this section
 * renders dimmed; the consuming orchestrator passes the right state prop.
 */
export function PropertyHubMcViewSection({
  controller,
  state = "view",
}: {
  controller: PropertyHubSidePanelController
  state?: "view" | "disabled"
}) {
  const { managementCompany, isLoadingDetail, isErrorDetail, enterMcEditFromContext } = controller

  if (isLoadingDetail) {
    return (
      <HubSidePanelSection title="Management Company" state="disabled">
        <p className="text-xs text-[var(--foreground)]/55">Loading management company…</p>
      </HubSidePanelSection>
    )
  }

  if (isErrorDetail || !managementCompany) {
    return (
      <HubSidePanelSection title="Management Company" state="disabled">
        <p className="text-xs text-rose-700">Could not load management company.</p>
      </HubSidePanelSection>
    )
  }

  return (
    <HubSidePanelSection
      title="Management Company"
      state={state}
      onEnterEdit={enterMcEditFromContext}
    >
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
    </HubSidePanelSection>
  )
}
