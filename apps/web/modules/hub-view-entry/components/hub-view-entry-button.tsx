"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2 } from "lucide-react"
import type { PropertyListRow, PropertyOption, TemplateListRow } from "@builders/domain"
import {
  SidePanelPreview,
  SidePanelPreviewClearButton,
  SidePanelPreviewNewButton,
  SidePanelPreviewOpenButton,
} from "@/components/side-panel-preview"
import { ManagementCompanyPicker } from "@/modules/management-companies/components/picker/management-company-picker"
import { PropertyPicker } from "@/modules/properties/components/picker/property-picker"
import { PropertyHubViewSidePanel } from "@/modules/properties/components/side-panel/hub-view"
import { PropertyHubSidePanel } from "@/modules/properties/components/side-panel/hub"
import { PropertySidePanel } from "@/modules/properties/components/side-panel"
import { usePropertyHubViewSidePanel } from "@/modules/properties/controllers/property-hub-view-side-panel"
import { usePropertyHubSidePanel } from "@/modules/properties/controllers/property-hub-side-panel"
import { usePropertySidePanel } from "@/modules/properties/controllers/property-side-panel"

// Global hub-view entry trigger. Owns its own MC + Property pickers, then
// hands off to the existing PropertyHubViewSidePanel / PropertyHubSidePanel
// controllers. Sibling-mounts both panels so the wrapper is self-contained
// and works wherever it's rendered (no neighbour-panel dependencies).
export function HubViewEntryButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [managementCompanyId, setManagementCompanyId] = useState<string | null>(null)
  const [propertyId, setPropertyId] = useState<string | null>(null)
  const [selectedPropertyOption, setSelectedPropertyOption] = useState<PropertyOption | null>(
    null,
  )

  const hubViewPanel = usePropertyHubViewSidePanel()
  const hubCreatePanel = usePropertyHubSidePanel()
  const propertyPanel = usePropertySidePanel()

  // A picked property's MC takes precedence — if the user only picked a
  // property, we still know which hub to open.
  const resolvedManagementCompanyId =
    selectedPropertyOption?.managementCompanyId ?? managementCompanyId
  const canOpenHubView = resolvedManagementCompanyId !== null
  const hasSelections = managementCompanyId !== null || propertyId !== null

  const handleManagementCompanyChange = useCallback((value: string | null) => {
    setManagementCompanyId(value)
    setPropertyId(null)
    setSelectedPropertyOption(null)
  }, [])

  const handlePropertyChange = useCallback((value: string | null) => {
    setPropertyId(value)
    if (value === null) setSelectedPropertyOption(null)
  }, [])

  const handlePropertyOptionSelected = useCallback((option: PropertyOption | null) => {
    setSelectedPropertyOption(option)
  }, [])

  const resetSelections = useCallback(() => {
    setManagementCompanyId(null)
    setPropertyId(null)
    setSelectedPropertyOption(null)
  }, [])

  const handleClose = useCallback(() => {
    setOpen(false)
  }, [])

  const handleOpenHubView = useCallback(() => {
    if (!resolvedManagementCompanyId) return
    setOpen(false)
    resetSelections()
    hubViewPanel.open(resolvedManagementCompanyId)
  }, [resolvedManagementCompanyId, resetSelections, hubViewPanel])

  const handleCreateHub = useCallback(() => {
    setOpen(false)
    resetSelections()
    hubCreatePanel.open()
  }, [resetSelections, hubCreatePanel])

  const handleOpenProperty = useCallback(
    (row: PropertyListRow) => {
      hubViewPanel.close()
      propertyPanel.openPanel({ mode: "edit", row })
    },
    [hubViewPanel, propertyPanel],
  )

  const handleOpenTemplate = useCallback(
    (row: TemplateListRow) => {
      hubViewPanel.close()
      router.push(`/dashboard/templates/${row.id}`)
    },
    [hubViewPanel, router],
  )

  const handlePropertyPanelOpenHubView = useCallback(
    (id: string) => {
      propertyPanel.close()
      hubViewPanel.open(id)
    },
    [propertyPanel, hubViewPanel],
  )

  const stickyHeader = (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65">
          Management company
        </span>
        <ManagementCompanyPicker
          value={managementCompanyId}
          onChange={handleManagementCompanyChange}
          placeholder="Any management company (optional)"
          ariaLabel="Management company"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65">
          Property
        </span>
        <PropertyPicker
          value={propertyId}
          onChange={handlePropertyChange}
          onOptionSelected={handlePropertyOptionSelected}
          managementCompanyId={managementCompanyId}
          ariaLabel="Property"
        />
      </label>
    </div>
  )

  const footer = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <SidePanelPreviewClearButton disabled={!hasSelections} onClick={resetSelections} />
      <SidePanelPreviewNewButton disabled={false} onClick={handleCreateHub} label="Create hub" />
      <SidePanelPreviewOpenButton
        disabled={!canOpenHubView}
        onClick={handleOpenHubView}
        label="Open hub view"
      />
    </div>
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open hub view"
        className="
          w-10 h-10 rounded-full
          bg-[var(--panel-background)]
          border border-[var(--panel-border)]
          flex items-center justify-center
          hover:bg-[var(--panel-hover)]
          transition
          shadow-[0_0_6px_rgba(99,102,241,0.30)]
        "
      >
        <Building2 size={18} className="text-indigo-500" />
      </button>

      <SidePanelPreview
        open={open}
        side="right"
        onClose={handleClose}
        title="Open hub"
        widthClassName="w-[34rem]"
        stickyHeader={stickyHeader}
        footer={footer}
      >
        {null}
      </SidePanelPreview>

      <PropertyHubViewSidePanel
        controller={hubViewPanel}
        onOpenProperty={handleOpenProperty}
        onOpenTemplate={handleOpenTemplate}
      />
      <PropertyHubSidePanel controller={hubCreatePanel} />
      <PropertySidePanel
        controller={propertyPanel}
        onOpenHubView={handlePropertyPanelOpenHubView}
      />
    </>
  )
}
