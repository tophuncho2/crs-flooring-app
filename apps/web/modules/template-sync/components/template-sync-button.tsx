"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import type { PropertyListRow, PropertyOption, TemplateListRow } from "@builders/domain"
import {
  SidePanelPreview,
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
import { syncTemplateRequest } from "@/modules/template-sync/data/sync-template-request"
import { TemplateSyncPreviewBody } from "@/modules/template-sync/components/template-sync-preview-body"
import { TemplateSyncItemsSubHeader } from "@/modules/template-sync/components/header/template-sync-items-sub-header"
import { TemplateSyncTemplateTrigger } from "@/modules/template-sync/components/template-sync-template-trigger"
import { TemplateSyncOptionsPanel } from "@/modules/template-sync/components/template-sync-options-panel"
import { TemplateSyncClearButton } from "@/modules/template-sync/components/toolbar-controls/template-sync-clear-button"
import { TemplateSyncNewButton } from "@/modules/template-sync/components/toolbar-controls/template-sync-new-button"
import { TemplateSyncOpenButton } from "@/modules/template-sync/components/toolbar-controls/template-sync-open-button"
import { TemplateSyncSyncButton } from "@/modules/template-sync/components/toolbar-controls/template-sync-sync-button"
import { useTemplateSyncItems } from "@/modules/template-sync/controllers/use-template-sync-items"

// Cascade: Management Company (optional) → Property → Template.
// Property has a direct managementCompanyId FK; Template has a propertyId FK.
// Each picker fetches its own server-side options via React Query;
// the bucket key folds in the parent filter so caches reset on parent change.

export function TemplateSyncButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [managementCompanyId, setManagementCompanyId] = useState<string | null>(null)
  const [propertyId, setPropertyId] = useState<string | null>(null)
  const [selectedPropertyOption, setSelectedPropertyOption] = useState<PropertyOption | null>(
    null,
  )
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [selectedTemplateLabel, setSelectedTemplateLabel] = useState<string | null>(null)
  const [templatePickerExpanded, setTemplatePickerExpanded] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  const itemsController = useTemplateSyncItems(templateId)
  const templateTriggerRef = useRef<HTMLButtonElement | null>(null)

  const hubViewPanel = usePropertyHubViewSidePanel()
  const hubCreatePanel = usePropertyHubSidePanel()
  const propertyPanel = usePropertySidePanel()

  const toggleHeaderCollapsed = useCallback(() => {
    setHeaderCollapsed((value) => !value)
  }, [])

  const handleManagementCompanyChange = useCallback((value: string | null) => {
    setManagementCompanyId(value)
    setPropertyId(null)
    setSelectedPropertyOption(null)
    setTemplateId(null)
    setSelectedTemplateLabel(null)
    setTemplatePickerExpanded(false)
  }, [])

  const handlePropertyChange = useCallback((value: string | null) => {
    setPropertyId(value)
    if (value === null) setSelectedPropertyOption(null)
    setTemplateId(null)
    setSelectedTemplateLabel(null)
    setTemplatePickerExpanded(false)
  }, [])

  const handlePropertyOptionSelected = useCallback((option: PropertyOption | null) => {
    setSelectedPropertyOption(option)
  }, [])

  const resetSelections = useCallback(() => {
    setManagementCompanyId(null)
    setPropertyId(null)
    setSelectedPropertyOption(null)
    setTemplateId(null)
    setSelectedTemplateLabel(null)
    setTemplatePickerExpanded(false)
    setErrorMessage(null)
  }, [])

  // Defensive: if the property cascade clears propertyId while the options
  // panel is open, collapse — the trigger becomes disabled in that state.
  useEffect(() => {
    if (propertyId === null && templatePickerExpanded) {
      setTemplatePickerExpanded(false)
    }
  }, [propertyId, templatePickerExpanded])

  const handleToggleTemplatePicker = useCallback(() => {
    setTemplatePickerExpanded((value) => !value)
  }, [])

  const handleTemplateOptionSelect = useCallback(
    (id: string | null, label: string | null) => {
      setTemplateId(id)
      setSelectedTemplateLabel(label)
      setTemplatePickerExpanded(false)
      templateTriggerRef.current?.focus()
    },
    [],
  )

  const handleTemplateOptionCancel = useCallback(() => {
    setTemplatePickerExpanded(false)
    templateTriggerRef.current?.focus()
  }, [])

  const handleClose = useCallback(() => {
    if (isSyncing) return
    setOpen(false)
  }, [isSyncing])

  const canActOnTemplate = templateId !== null
  const canCreateForProperty = propertyId !== null
  const hasSelections = managementCompanyId !== null || propertyId !== null || templateId !== null
  const resolvedHubManagementCompanyId =
    selectedPropertyOption?.managementCompanyId ?? managementCompanyId
  const canOpenHubView = resolvedHubManagementCompanyId !== null

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

  const handleOpenHubView = useCallback(() => {
    if (!resolvedHubManagementCompanyId) return
    setOpen(false)
    resetSelections()
    hubViewPanel.open(resolvedHubManagementCompanyId)
  }, [resolvedHubManagementCompanyId, resetSelections, hubViewPanel])

  const handleCreateHub = useCallback(() => {
    setOpen(false)
    resetSelections()
    hubCreatePanel.open()
  }, [resetSelections, hubCreatePanel])

  const handleHubViewOpenProperty = useCallback(
    (row: PropertyListRow) => {
      hubViewPanel.close()
      propertyPanel.openPanel({ mode: "edit", row })
    },
    [hubViewPanel, propertyPanel],
  )

  const handleHubViewOpenTemplate = useCallback(
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

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65">
          Template
        </span>
        <TemplateSyncTemplateTrigger
          ref={templateTriggerRef}
          propertyId={propertyId}
          expanded={templatePickerExpanded}
          onToggle={handleToggleTemplatePicker}
          selectedLabel={selectedTemplateLabel}
          ariaLabel="Template"
        />
      </label>

      {!templatePickerExpanded && itemsController.showSubHeader ? (
        <TemplateSyncItemsSubHeader
          controller={itemsController}
          headerCollapsed={headerCollapsed}
          onToggleHeader={toggleHeaderCollapsed}
        />
      ) : null}
    </div>
  )

  const footer = (
    <div className="flex flex-col gap-3">
      {errorMessage ? (
        <p className="text-xs text-rose-400" role="alert">
          {errorMessage}
        </p>
      ) : null}
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
        <SidePanelPreviewOpenButton
          disabled={!canOpenHubView || isSyncing}
          onClick={handleOpenHubView}
          label="Open hub view"
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

      <SidePanelPreview
        open={open}
        side="right"
        onClose={handleClose}
        title="Hub & template sync"
        widthClassName="w-[34rem]"
        stickyHeader={stickyHeader}
        footer={footer}
      >
        {templatePickerExpanded && propertyId ? (
          <TemplateSyncOptionsPanel
            propertyId={propertyId}
            currentValue={templateId}
            currentLabel={selectedTemplateLabel}
            onSelect={handleTemplateOptionSelect}
            onCancel={handleTemplateOptionCancel}
          />
        ) : templateId ? (
          <TemplateSyncPreviewBody
            templateId={templateId}
            itemsController={itemsController}
            headerCollapsed={headerCollapsed}
          />
        ) : null}
      </SidePanelPreview>

      <PropertyHubViewSidePanel
        controller={hubViewPanel}
        onOpenProperty={handleHubViewOpenProperty}
        onOpenTemplate={handleHubViewOpenTemplate}
      />
      <PropertyHubSidePanel controller={hubCreatePanel} />
      <PropertySidePanel
        controller={propertyPanel}
        onOpenHubView={handlePropertyPanelOpenHubView}
      />
    </>
  )
}
