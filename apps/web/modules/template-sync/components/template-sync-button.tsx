"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import type {
  ManagementCompanyOption,
  PropertyOption,
  TemplateListRow,
  TemplateOption,
} from "@builders/domain"
import {
  HubSidePanelPickerTrigger,
  HubSidePanelShell,
  HubSidePanelViewSwitcher,
} from "@/components/hub-side-panel"
import { SidePanelPreviewNewButton } from "@/components/side-panel-preview"
import { PropertyHubSidePanel } from "@/modules/properties/components/side-panel/hub"
import { usePropertyHubSidePanel } from "@/modules/properties/controllers/property-hub-side-panel"
import { syncTemplateRequest } from "@/modules/template-sync/data/sync-template-request"
import { TemplateSyncPreviewBody } from "@/modules/template-sync/components/template-sync-preview-body"
import { TemplateSyncItemsSubHeader } from "@/modules/template-sync/components/header/template-sync-items-sub-header"
import { TemplateSyncManagementCompanyOptionsPanel } from "@/modules/template-sync/components/options/template-sync-management-company-options-panel"
import { TemplateSyncPropertyOptionsPanel } from "@/modules/template-sync/components/options/template-sync-property-options-panel"
import { TemplateSyncTemplateOptionsPanel } from "@/modules/template-sync/components/options/template-sync-template-options-panel"
import { TemplateSyncClearButton } from "@/modules/template-sync/components/toolbar-controls/template-sync-clear-button"
import { TemplateSyncNewButton } from "@/modules/template-sync/components/toolbar-controls/template-sync-new-button"
import { TemplateSyncOpenButton } from "@/modules/template-sync/components/toolbar-controls/template-sync-open-button"
import { TemplateSyncSyncButton } from "@/modules/template-sync/components/toolbar-controls/template-sync-sync-button"
import { useTemplateSyncItems } from "@/modules/template-sync/controllers/use-template-sync-items"

// Cascade: Management Company (optional) → Property → Template.
// All three pickers are body-mode: their triggers in the sticky top-toolbar
// toggle the side-panel body between the options surface and the template
// preview. Only one picker may be expanded at a time — switching collapses
// the others.

type ExpandedPicker = "managementCompany" | "property" | "template" | null

const PICKER_LABEL_CLASS = "text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65"

export function TemplateSyncButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [managementCompanyId, setManagementCompanyId] = useState<string | null>(null)
  const [selectedManagementCompanyLabel, setSelectedManagementCompanyLabel] =
    useState<string | null>(null)
  const [propertyId, setPropertyId] = useState<string | null>(null)
  const [selectedPropertyLabel, setSelectedPropertyLabel] = useState<string | null>(null)
  // Carries the chosen property's mgmt-co id so the arrow handlers can open
  // the hub view even when the user skipped the (optional) mgmt-co picker.
  const [selectedPropertyOption, setSelectedPropertyOption] = useState<PropertyOption | null>(
    null,
  )
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [selectedTemplateLabel, setSelectedTemplateLabel] = useState<string | null>(null)
  const [expandedPicker, setExpandedPicker] = useState<ExpandedPicker>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  const itemsController = useTemplateSyncItems(templateId)

  const managementCompanyTriggerRef = useRef<HTMLButtonElement | null>(null)
  const propertyTriggerRef = useRef<HTMLButtonElement | null>(null)
  const templateTriggerRef = useRef<HTMLButtonElement | null>(null)

  // Single unified hub panel — covers Create hub, hub view, and property edit
  // (clicking a property row inside the hub view transitions in-place).
  const hubPanel = usePropertyHubSidePanel()

  const toggleHeaderCollapsed = useCallback(() => {
    setHeaderCollapsed((value) => !value)
  }, [])

  const togglePicker = useCallback((picker: Exclude<ExpandedPicker, null>) => {
    setExpandedPicker((current) => (current === picker ? null : picker))
  }, [])

  const handleManagementCompanySelect = useCallback(
    (option: ManagementCompanyOption | null) => {
      setManagementCompanyId(option?.id ?? null)
      setSelectedManagementCompanyLabel(option?.name ?? null)
      setPropertyId(null)
      setSelectedPropertyLabel(null)
      setSelectedPropertyOption(null)
      setTemplateId(null)
      setSelectedTemplateLabel(null)
      setExpandedPicker(null)
      managementCompanyTriggerRef.current?.focus()
    },
    [],
  )

  const handlePropertySelect = useCallback((option: PropertyOption | null) => {
    setPropertyId(option?.id ?? null)
    setSelectedPropertyLabel(option?.name ?? null)
    setSelectedPropertyOption(option)
    setTemplateId(null)
    setSelectedTemplateLabel(null)
    setExpandedPicker(null)
    propertyTriggerRef.current?.focus()
  }, [])

  const handleTemplateSelect = useCallback((option: TemplateOption | null) => {
    setTemplateId(option?.id ?? null)
    setSelectedTemplateLabel(option ? option.unitType || "—" : null)
    setExpandedPicker(null)
    templateTriggerRef.current?.focus()
  }, [])

  const resetSelections = useCallback(() => {
    setManagementCompanyId(null)
    setSelectedManagementCompanyLabel(null)
    setPropertyId(null)
    setSelectedPropertyLabel(null)
    setSelectedPropertyOption(null)
    setTemplateId(null)
    setSelectedTemplateLabel(null)
    setExpandedPicker(null)
    setErrorMessage(null)
  }, [])

  // Pre-populate all three pickers from a template row inside the hub view.
  // Drives the row-click handoff back into this panel.
  const presetFromTemplateRow = useCallback((row: TemplateListRow) => {
    setManagementCompanyId(row.managementCompanyId)
    setSelectedManagementCompanyLabel(row.managementCompanyName)
    setPropertyId(row.propertyId)
    setSelectedPropertyLabel(row.propertyName)
    setSelectedPropertyOption(null)
    setTemplateId(row.id)
    const unit = row.unitType.trim()
    setSelectedTemplateLabel(unit.length > 0 ? unit : "—")
    setExpandedPicker(null)
    setErrorMessage(null)
  }, [])

  // Defensive: template picker is gated on propertyId; if the cascade clears
  // it while the picker is expanded, collapse — the trigger becomes disabled.
  useEffect(() => {
    if (propertyId === null && expandedPicker === "template") {
      setExpandedPicker(null)
    }
  }, [propertyId, expandedPicker])

  const handleCancelExpanded = useCallback(() => {
    setExpandedPicker(null)
    if (expandedPicker === "managementCompany") {
      managementCompanyTriggerRef.current?.focus()
    } else if (expandedPicker === "property") {
      propertyTriggerRef.current?.focus()
    } else if (expandedPicker === "template") {
      templateTriggerRef.current?.focus()
    }
  }, [expandedPicker])

  const handleClose = useCallback(() => {
    if (isSyncing) return
    setOpen(false)
  }, [isSyncing])

  const canActOnTemplate = templateId !== null
  const canCreateForProperty = propertyId !== null
  const hasSelections = managementCompanyId !== null || propertyId !== null || templateId !== null
  const resolvedHubMcId =
    managementCompanyId ?? selectedPropertyOption?.managementCompanyId ?? null
  // Arrows mirror the hub's Properties ◂ ▸ Templates switcher — both are
  // enabled together once a template is selected (which guarantees a
  // resolvable mgmt-co + property pair).
  const arrowsEnabled = canActOnTemplate && resolvedHubMcId !== null

  const handleOpen = useCallback(() => {
    if (!templateId) return
    setOpen(false)
    resetSelections()
    router.push(`/dashboard/templates/${templateId}`)
  }, [templateId, resetSelections, router])

  const handleCreate = useCallback(() => {
    if (!propertyId) return
    const params = new URLSearchParams({ propertyId })
    if (managementCompanyId) params.set("managementCompanyId", managementCompanyId)
    setOpen(false)
    resetSelections()
    router.push(`/dashboard/templates/new?${params.toString()}`)
  }, [propertyId, managementCompanyId, resetSelections, router])

  const handleCreateHub = useCallback(() => {
    setOpen(false)
    resetSelections()
    hubPanel.openForCreate()
  }, [resetSelections, hubPanel])

  // Left arrow ◂ — open hub view at Properties tab for this template's mgmt-co.
  const handleArrowPrev = useCallback(() => {
    if (!arrowsEnabled || !resolvedHubMcId) return
    setOpen(false)
    resetSelections()
    hubPanel.openForView(resolvedHubMcId)
  }, [arrowsEnabled, resolvedHubMcId, resetSelections, hubPanel])

  // Right arrow ▸ — open hub view at Templates tab, pre-filtered to this
  // template's property under its mgmt-co.
  const handleArrowNext = useCallback(() => {
    if (!arrowsEnabled || !resolvedHubMcId || !propertyId || !selectedPropertyLabel) return
    setOpen(false)
    resetSelections()
    hubPanel.openForTemplatesView(resolvedHubMcId, propertyId, selectedPropertyLabel)
  }, [
    arrowsEnabled,
    resolvedHubMcId,
    propertyId,
    selectedPropertyLabel,
    resetSelections,
    hubPanel,
  ])

  const handleSync = useCallback(async () => {
    if (!templateId || isSyncing) return
    setIsSyncing(true)
    setErrorMessage(null)
    try {
      const result = await syncTemplateRequest({ templateId })
      const newId = result.workOrder.id
      setOpen(false)
      resetSelections()
      router.push(`/dashboard/work-orders/${newId}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed. Try again."
      setErrorMessage(message)
    } finally {
      setIsSyncing(false)
    }
  }, [templateId, isSyncing, resetSelections, router])

  // Row click inside the hub view's templates tab — close the hub and
  // re-open this panel preselected to the row's mgmt-co + property + template.
  const handleOpenTemplateRow = useCallback(
    (row: TemplateListRow) => {
      hubPanel.close()
      presetFromTemplateRow(row)
      setOpen(true)
    },
    [hubPanel, presetFromTemplateRow],
  )

  const topToolbar = (
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open template sync"
        className="
          w-10 h-10 rounded-full
          bg-[var(--panel-background)]
          border border-[var(--panel-border)]
          flex items-center justify-center
          hover:bg-[var(--panel-hover)]
          transition
          shadow-[0_0_6px_rgba(59,130,246,0.25)]
        "
      >
        <RefreshCw size={18} className="text-blue-500" />
      </button>

      <HubSidePanelShell
        open={open}
        onClose={handleClose}
        title="Hub & template sync"
        topToolbar={topToolbar}
      >
        {expandedPicker === "managementCompany" ? (
          <TemplateSyncManagementCompanyOptionsPanel
            currentValue={managementCompanyId}
            currentLabel={selectedManagementCompanyLabel}
            onSelect={handleManagementCompanySelect}
            onCancel={handleCancelExpanded}
          />
        ) : expandedPicker === "property" ? (
          <TemplateSyncPropertyOptionsPanel
            managementCompanyId={managementCompanyId}
            currentValue={propertyId}
            currentLabel={selectedPropertyLabel}
            onSelect={handlePropertySelect}
            onCancel={handleCancelExpanded}
          />
        ) : expandedPicker === "template" && propertyId ? (
          <TemplateSyncTemplateOptionsPanel
            propertyId={propertyId}
            currentValue={templateId}
            currentLabel={selectedTemplateLabel}
            onSelect={handleTemplateSelect}
            onCancel={handleCancelExpanded}
          />
        ) : templateId ? (
          <TemplateSyncPreviewBody
            templateId={templateId}
            itemsController={itemsController}
            headerCollapsed={headerCollapsed}
          />
        ) : null}
      </HubSidePanelShell>

      <PropertyHubSidePanel controller={hubPanel} onOpenTemplate={handleOpenTemplateRow} />
    </>
  )
}
