"use client"

import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import { useRouter } from "next/navigation"
import type {
  ManagementCompanyOption,
  PropertyOption,
  TemplateListRow,
  TemplateOption,
} from "@builders/domain"
import { syncTemplateRequest } from "@/modules/template-sync/data/sync-template-request"
import {
  useTemplateSyncItems,
  type TemplateSyncItemsController,
} from "@/modules/template-sync/controllers/use-template-sync-items"
import {
  usePropertyHubSidePanel,
  type PropertyHubSidePanelController,
} from "@/modules/properties/controllers/property-hub-side-panel"

export type ExpandedPicker = "managementCompany" | "property" | "template" | null

export type TemplateSyncController = {
  // ===== Panel open state =====
  open: boolean
  setOpen: (open: boolean) => void
  handleClose: () => void

  // ===== Cascade selections =====
  managementCompanyId: string | null
  selectedManagementCompanyLabel: string | null
  propertyId: string | null
  selectedPropertyLabel: string | null
  templateId: string | null
  selectedTemplateLabel: string | null
  expandedPicker: ExpandedPicker
  isSyncing: boolean
  errorMessage: string | null
  headerCollapsed: boolean

  // ===== Picker focus refs =====
  managementCompanyTriggerRef: RefObject<HTMLButtonElement | null>
  propertyTriggerRef: RefObject<HTMLButtonElement | null>
  templateTriggerRef: RefObject<HTMLButtonElement | null>

  // ===== Picker toggles + selection handlers =====
  togglePicker: (picker: Exclude<ExpandedPicker, null>) => void
  handleManagementCompanySelect: (option: ManagementCompanyOption | null) => void
  handlePropertySelect: (option: PropertyOption | null) => void
  handleTemplateSelect: (option: TemplateOption | null) => void
  handleCancelExpanded: () => void

  // ===== Reset =====
  resetSelections: () => void

  // ===== Toolbar action handlers =====
  handleOpen: () => void
  handleCreate: () => void
  handleCreateHub: () => void
  handleOpenHubView: () => void
  handleSync: () => Promise<void>
  toggleHeaderCollapsed: () => void

  // ===== Cross-panel orchestration =====
  hubPanel: PropertyHubSidePanelController
  handleOpenTemplateRow: (row: TemplateListRow) => void

  // ===== Items preview pagination =====
  itemsController: TemplateSyncItemsController

  // ===== Derived flags =====
  canActOnTemplate: boolean
  canCreateForProperty: boolean
  hasSelections: boolean
  canOpenHubView: boolean
}

/**
 * Single controller for the template-sync side panel. Owns the cascade
 * selection state (Management Company → Property → Template), drives the
 * inline picker expand/collapse, and runs every toolbar action — including
 * the arrow handoff back into the hub view and the row-click handoff coming
 * the other direction.
 */
export function useTemplateSyncController(): TemplateSyncController {
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
  const hasSelections =
    managementCompanyId !== null || propertyId !== null || templateId !== null
  const resolvedHubMcId =
    managementCompanyId ?? selectedPropertyOption?.managementCompanyId ?? null
  // "Open hub view" is enabled whenever we know which MC's hub to open —
  // either an explicit mgmt-co pick or one carried by the selected property.
  const canOpenHubView = resolvedHubMcId !== null

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

  // Open the unified hub view at the resolved mgmt-co's Properties tab.
  // Replaces the (briefly-tried) two-arrow design with one button — enabled
  // whenever a mgmt-co is resolvable from the current selections.
  const handleOpenHubView = useCallback(() => {
    if (!resolvedHubMcId) return
    setOpen(false)
    resetSelections()
    hubPanel.openForView(resolvedHubMcId)
  }, [resolvedHubMcId, resetSelections, hubPanel])

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

  return {
    open,
    setOpen,
    handleClose,
    managementCompanyId,
    selectedManagementCompanyLabel,
    propertyId,
    selectedPropertyLabel,
    templateId,
    selectedTemplateLabel,
    expandedPicker,
    isSyncing,
    errorMessage,
    headerCollapsed,
    managementCompanyTriggerRef,
    propertyTriggerRef,
    templateTriggerRef,
    togglePicker,
    handleManagementCompanySelect,
    handlePropertySelect,
    handleTemplateSelect,
    handleCancelExpanded,
    resetSelections,
    handleOpen,
    handleCreate,
    handleCreateHub,
    handleOpenHubView,
    handleSync,
    toggleHeaderCollapsed,
    hubPanel,
    handleOpenTemplateRow,
    itemsController,
    canActOnTemplate,
    canCreateForProperty,
    hasSelections,
    canOpenHubView,
  }
}
