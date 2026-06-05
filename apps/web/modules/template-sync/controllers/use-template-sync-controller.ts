"use client"

import { useCallback, useRef, useState, type RefObject } from "react"
import { useRouter } from "next/navigation"
import type {
  ManagementCompanyOption,
  PropertyOption,
  TemplateOption,
} from "@builders/domain"
import { syncTemplateRequest } from "@/modules/template-sync/data/sync-template-request"
import {
  useTemplateSyncItems,
  type TemplateSyncItemsController,
} from "@/modules/template-sync/controllers/use-template-sync-items"

export type ExpandedPicker = "managementCompany" | "property" | "template" | null

/**
 * Optional cascade preset, threaded in from the template-sync page's search
 * params (deep links + the hub view's template-row handoff). Each id/label
 * pair seeds the matching picker so the page opens pre-selected.
 */
export type TemplateSyncInitialSelections = {
  managementCompanyId?: string | null
  selectedManagementCompanyLabel?: string | null
  propertyId?: string | null
  selectedPropertyLabel?: string | null
  templateId?: string | null
  selectedTemplateLabel?: string | null
}

export type TemplateSyncController = {
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
  handleSync: () => Promise<void>
  toggleHeaderCollapsed: () => void

  // ===== Items preview pagination =====
  itemsController: TemplateSyncItemsController

  // ===== Derived flags =====
  canActOnTemplate: boolean
  hasSelections: boolean
}

/**
 * Controller for the template-sync page. Owns the cascade selection state
 * (Management Company → Property → Template), drives the inline picker
 * expand/collapse, and runs every toolbar action (sync / clear / open /
 * create). It is a pure page controller — navigation is handled via the
 * router and there is no panel open/close state. Picker "open linked record"
 * arrows are wired by the page (router navigation), not here.
 */
export function useTemplateSyncController(
  options: { initialSelections?: TemplateSyncInitialSelections } = {},
): TemplateSyncController {
  const { initialSelections } = options
  const router = useRouter()
  const [managementCompanyId, setManagementCompanyId] = useState<string | null>(
    initialSelections?.managementCompanyId ?? null,
  )
  const [selectedManagementCompanyLabel, setSelectedManagementCompanyLabel] =
    useState<string | null>(initialSelections?.selectedManagementCompanyLabel ?? null)
  const [propertyId, setPropertyId] = useState<string | null>(
    initialSelections?.propertyId ?? null,
  )
  const [selectedPropertyLabel, setSelectedPropertyLabel] = useState<string | null>(
    initialSelections?.selectedPropertyLabel ?? null,
  )
  const [templateId, setTemplateId] = useState<string | null>(
    initialSelections?.templateId ?? null,
  )
  const [selectedTemplateLabel, setSelectedTemplateLabel] = useState<string | null>(
    initialSelections?.selectedTemplateLabel ?? null,
  )
  const [expandedPicker, setExpandedPicker] = useState<ExpandedPicker>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  const itemsController = useTemplateSyncItems(templateId)

  const managementCompanyTriggerRef = useRef<HTMLButtonElement | null>(null)
  const propertyTriggerRef = useRef<HTMLButtonElement | null>(null)
  const templateTriggerRef = useRef<HTMLButtonElement | null>(null)

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
    setTemplateId(null)
    setSelectedTemplateLabel(null)
    setExpandedPicker(null)
    setErrorMessage(null)
  }, [])

  // No defensive effect is needed to collapse the template picker when the
  // cascade clears: every path that nulls `propertyId`
  // (handleManagementCompanySelect / handlePropertySelect / resetSelections)
  // also nulls `expandedPicker`, and both consumers gate the template branch
  // on `propertyId` (TemplateSyncBody's `&& propertyId`, the trigger's
  // `disabled={propertyId === null}`).

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

  const canActOnTemplate = templateId !== null
  const hasSelections =
    managementCompanyId !== null || propertyId !== null || templateId !== null

  const handleOpen = useCallback(() => {
    if (!templateId) return
    router.push(`/dashboard/templates/${templateId}`)
  }, [templateId, router])

  // Always available: opens a raw new-template form with no property/MC
  // pre-linkage.
  const handleCreate = useCallback(() => {
    router.push("/dashboard/templates/new")
  }, [router])

  const handleSync = useCallback(async () => {
    if (!templateId || isSyncing) return
    setIsSyncing(true)
    setErrorMessage(null)
    try {
      const result = await syncTemplateRequest({ templateId })
      const newId = result.workOrder.id
      router.push(`/dashboard/work-orders/${newId}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed. Try again."
      setErrorMessage(message)
      setIsSyncing(false)
    }
  }, [templateId, isSyncing, router])

  return {
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
    handleSync,
    toggleHeaderCollapsed,
    itemsController,
    canActOnTemplate,
    hasSelections,
  }
}
