"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  PROPERTY_HUB_NO_ACTIONS_MESSAGE,
  toManagementCompanyForm,
  toPropertyPrimaryForm,
  validateCreatePropertyHubForm,
  validateManagementCompanyForm,
  validatePropertyPrimaryForm,
  type CreatePropertyHubForm,
  type ManagementCompanyForm,
  type ManagementCompanyListRow,
  type PropertyDetailRecord,
  type PropertyHubPropertyFields,
  type PropertyListRow,
  type PropertyPrimaryForm,
} from "@builders/domain"
import {
  PROPERTY_DETAIL_QUERY_KEY,
  getPropertyDetailRequest,
} from "@/modules/properties/data/property-detail-request"
import { MANAGEMENT_COMPANIES_LIST_QUERY_KEY } from "@/modules/management-companies/data/list-management-companies-request"
import { MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY } from "@/modules/management-companies/data/management-company-options-request"
import { PROPERTIES_LIST_QUERY_KEY } from "@/modules/properties/data/list-properties-request"
import {
  buildCreatePayload,
  buildMcFormFromRow,
  buildPropertyFormFromRow,
  deriveMcMode,
  EMPTY_MC_FORM,
  EMPTY_PROPERTY_HUB_PROPERTY_FIELDS,
  EMPTY_PROPERTY_PRIMARY_FORM,
  mcFormIsDirty,
  propertyFormIsDirty,
} from "./form"
import {
  usePropertyHubDetailQuery,
  usePropertyHubPropertiesQuery,
  usePropertyHubTemplatesQuery,
  type PropertyHubPropertiesController,
  type PropertyHubTemplatesController,
} from "./queries"
import {
  useCreatePropertyHubMutation,
  useDeleteMcMutation,
  useDeletePropertyMutation,
  useUpdateMcMutation,
  useUpdatePropertyMutation,
  type PropertyHubCreateResult,
} from "./mutations"
import type {
  HubActiveView,
  HubMode,
  HubPickerKind,
  PropertyHubMcMode,
} from "./types"

export type { PropertyHubCreateResult } from "./mutations"
export type { HubActiveView, HubMode, HubPickerKind, PropertyHubMcMode } from "./types"

export type UsePropertyHubSidePanelOptions = {
  onCreated?: (result: PropertyHubCreateResult) => void
}

/**
 * Single controller for every hub side-panel mode:
 *   - view     : MC card + paginated properties + templates tab (read-only)
 *   - create   : combined MC link/create + property create (the "+ Hub" flow)
 *   - section-edit-mc        : MC fields editable, properties below dimmed
 *   - section-edit-property  : property fields editable (replaces section)
 *   - picker-takeover        : panel body owned by the in-body picker
 *
 * Save / discard / delete dispatch off `mode.kind`. Saving never closes the
 * panel — sections reconcile from the server response and the mode returns
 * to `view` for the same hub.
 *
 * The legacy `open()` alias (= openForCreate) preserves the API used by
 * work-order and template record pages that mount this controller for an
 * inline "+ New property" affordance.
 */
export function usePropertyHubSidePanel(options: UsePropertyHubSidePanelOptions = {}) {
  const queryClient = useQueryClient()
  const { onCreated } = options

  const [mode, setMode] = useState<HubMode>({ kind: "closed" })
  const [error, setError] = useState<string | null>(null)

  // ===== Create-mode state =====
  const [mcLinkId, setMcLinkId] = useState<string | null>(null)
  const [mcLinkLabel, setMcLinkLabel] = useState<string | null>(null)
  const [mcForm, setMcForm] = useState<ManagementCompanyForm>(EMPTY_MC_FORM)
  const [propertyTouched, setPropertyTouched] = useState(false)
  const [propertyForm, setPropertyForm] = useState<PropertyHubPropertyFields>(
    EMPTY_PROPERTY_HUB_PROPERTY_FIELDS,
  )

  // ===== MC edit-mode state =====
  const [mcEditForm, setMcEditForm] = useState<ManagementCompanyForm>(EMPTY_MC_FORM)
  const [mcEditBaseline, setMcEditBaseline] = useState<ManagementCompanyForm>(EMPTY_MC_FORM)
  const [mcEditUpdatedAt, setMcEditUpdatedAt] = useState<string | null>(null)

  // ===== Property edit-mode state =====
  const [propertyEditForm, setPropertyEditForm] =
    useState<PropertyPrimaryForm>(EMPTY_PROPERTY_PRIMARY_FORM)
  const [propertyEditBaseline, setPropertyEditBaseline] =
    useState<PropertyPrimaryForm>(EMPTY_PROPERTY_PRIMARY_FORM)
  const [propertyEditUpdatedAt, setPropertyEditUpdatedAt] = useState<string | null>(null)
  const [propertyEditMcLabel, setPropertyEditMcLabel] = useState<string | null>(null)

  // ===== View-mode auxiliary state (tab + property filter) =====
  const [activeView, setActiveView] = useState<HubActiveView>("properties")
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const [selectedPropertyLabel, setSelectedPropertyLabel] = useState<string | null>(null)
  // When openForTemplatesView pre-applies a property filter, the auto-reset
  // useEffect below will fire on contextMcId change and wipe it. The ref
  // carries the filter through that reset so it can be re-applied afterwards.
  const pendingPropertyFilterRef = useRef<{ id: string; label: string } | null>(null)

  const resetCreate = useCallback(() => {
    setMcLinkId(null)
    setMcLinkLabel(null)
    setMcForm(EMPTY_MC_FORM)
    setPropertyTouched(false)
    setPropertyForm(EMPTY_PROPERTY_HUB_PROPERTY_FIELDS)
  }, [])

  const resetMcEdit = useCallback(() => {
    setMcEditForm(EMPTY_MC_FORM)
    setMcEditBaseline(EMPTY_MC_FORM)
    setMcEditUpdatedAt(null)
  }, [])

  const resetPropertyEdit = useCallback(() => {
    setPropertyEditForm(EMPTY_PROPERTY_PRIMARY_FORM)
    setPropertyEditBaseline(EMPTY_PROPERTY_PRIMARY_FORM)
    setPropertyEditUpdatedAt(null)
    setPropertyEditMcLabel(null)
  }, [])

  const resetView = useCallback(() => {
    setActiveView("properties")
    setSelectedPropertyId(null)
    setSelectedPropertyLabel(null)
  }, [])

  const resetAll = useCallback(() => {
    resetCreate()
    resetMcEdit()
    resetPropertyEdit()
    resetView()
    setError(null)
  }, [resetCreate, resetMcEdit, resetPropertyEdit, resetView])

  // ===== Resolve the "context" management company id for the current mode.
  // Drives the read-only view queries and the property-edit MC chip. =====
  const contextMcId: string | null = useMemo(() => {
    switch (mode.kind) {
      case "view":
      case "section-edit-mc":
        return mode.mcId
      case "section-edit-property":
        return mode.mcId
      case "picker-takeover": {
        const r = mode.returnTo
        if (r.kind === "view" || r.kind === "section-edit-mc") return r.mcId
        if (r.kind === "section-edit-property") return r.mcId
        return null
      }
      default:
        return null
    }
  }, [mode])

  // ===== View-mode data =====
  const detailQuery = usePropertyHubDetailQuery(contextMcId)
  const properties = usePropertyHubPropertiesQuery(contextMcId)
  const templates = usePropertyHubTemplatesQuery(contextMcId, selectedPropertyId)

  // ===== Property-edit detail fetch (fills `instructions`, refreshes updatedAt). =====
  const editingPropertyId =
    mode.kind === "section-edit-property" ? mode.propertyId : null

  const propertyDetailQuery = useQuery<PropertyDetailRecord>({
    queryKey: [...PROPERTY_DETAIL_QUERY_KEY, editingPropertyId],
    queryFn: () => getPropertyDetailRequest(editingPropertyId as string),
    enabled: editingPropertyId !== null,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    const detail = propertyDetailQuery.data
    if (!detail || editingPropertyId === null) return
    const fromServer = toPropertyPrimaryForm(detail)
    setPropertyEditBaseline((previousBaseline) => {
      setPropertyEditForm((currentForm) => {
        if (propertyFormIsDirty(currentForm, previousBaseline)) return currentForm
        return fromServer
      })
      return fromServer
    })
    setPropertyEditUpdatedAt(detail.updatedAt)
    setPropertyEditMcLabel(detail.managementCompany?.name ?? null)
  }, [propertyDetailQuery.data, editingPropertyId])

  // ===== MC-edit detail fetch — reconciles only when user hasn't edited =====
  const mcDetailReconciled = detailQuery.data
  useEffect(() => {
    if (mode.kind !== "section-edit-mc") return
    if (!mcDetailReconciled) return
    const fromServer = toManagementCompanyForm(mcDetailReconciled)
    setMcEditBaseline((previousBaseline) => {
      setMcEditForm((currentForm) => {
        if (mcFormIsDirty(currentForm, previousBaseline)) return currentForm
        return fromServer
      })
      return fromServer
    })
    setMcEditUpdatedAt(mcDetailReconciled.updatedAt)
  }, [mcDetailReconciled, mode.kind])

  // ===== Derived =====
  const mcMode: PropertyHubMcMode = deriveMcMode(mcLinkId, mcForm)

  const createPayload: CreatePropertyHubForm = useMemo(
    () => buildCreatePayload({ mcLinkId, mcForm, propertyTouched, propertyForm }),
    [mcLinkId, mcForm, propertyTouched, propertyForm],
  )

  const createValidationRaw = useMemo(
    () => validateCreatePropertyHubForm(createPayload),
    [createPayload],
  )

  const hasAnyCreateInteraction = mcMode !== "none" || propertyTouched

  const mcEditIsDirty = useMemo(
    () => mcFormIsDirty(mcEditForm, mcEditBaseline),
    [mcEditForm, mcEditBaseline],
  )

  const mcEditValidation = useMemo(
    () => validateManagementCompanyForm(mcEditForm),
    [mcEditForm],
  )

  const propertyEditIsDirty = useMemo(
    () => propertyFormIsDirty(propertyEditForm, propertyEditBaseline),
    [propertyEditForm, propertyEditBaseline],
  )

  const propertyEditValidation = useMemo(
    () => validatePropertyPrimaryForm(propertyEditForm),
    [propertyEditForm],
  )

  // ===== Mutations =====
  const createMutation = useCreatePropertyHubMutation()
  const updatePropertyMutation = useUpdatePropertyMutation()
  const deletePropertyMutation = useDeletePropertyMutation()
  const updateMcMutation = useUpdateMcMutation()
  const deleteMcMutation = useDeleteMcMutation()

  const isSaving =
    createMutation.isPending ||
    updatePropertyMutation.isPending ||
    deletePropertyMutation.isPending ||
    updateMcMutation.isPending ||
    deleteMcMutation.isPending

  // ===== Mode-dispatched isDirty / canSave =====
  const isDirty = useMemo(() => {
    if (mode.kind === "create") return hasAnyCreateInteraction
    if (mode.kind === "section-edit-mc") return mcEditIsDirty
    if (mode.kind === "section-edit-property") return propertyEditIsDirty
    return false
  }, [mode.kind, hasAnyCreateInteraction, mcEditIsDirty, propertyEditIsDirty])

  const canSave = useMemo(() => {
    if (isSaving) return false
    if (mode.kind === "create") {
      return hasAnyCreateInteraction && createValidationRaw === ""
    }
    if (mode.kind === "section-edit-mc") {
      return mcEditIsDirty && mcEditValidation === "" && mcEditUpdatedAt !== null
    }
    if (mode.kind === "section-edit-property") {
      return (
        propertyEditIsDirty &&
        propertyEditValidation === "" &&
        propertyEditUpdatedAt !== null
      )
    }
    return false
  }, [
    isSaving,
    mode.kind,
    hasAnyCreateInteraction,
    createValidationRaw,
    mcEditIsDirty,
    mcEditValidation,
    mcEditUpdatedAt,
    propertyEditIsDirty,
    propertyEditValidation,
    propertyEditUpdatedAt,
  ])

  const validationError = useMemo<string | null>(() => {
    if (mode.kind === "create") {
      if (!hasAnyCreateInteraction || createValidationRaw === PROPERTY_HUB_NO_ACTIONS_MESSAGE) {
        return null
      }
      return createValidationRaw === "" ? null : createValidationRaw
    }
    if (mode.kind === "section-edit-mc") {
      return mcEditValidation === "" ? null : mcEditValidation
    }
    if (mode.kind === "section-edit-property") {
      return propertyEditValidation === "" ? null : propertyEditValidation
    }
    return null
  }, [
    mode.kind,
    hasAnyCreateInteraction,
    createValidationRaw,
    mcEditValidation,
    propertyEditValidation,
  ])

  // ===== Lifecycle / openers =====
  const openForCreate = useCallback(() => {
    resetAll()
    setMode({ kind: "create" })
  }, [resetAll])

  const open = openForCreate

  const openForView = useCallback(
    (mcId: string) => {
      resetView()
      setError(null)
      setMode({ kind: "view", mcId, tab: "properties" })
    },
    [resetView],
  )

  // Open hub view on the Templates tab, pre-filtered to a specific property.
  // Used by the template-sync panel's right arrow to "exit into" the hub at
  // the templates list for the currently selected template's property.
  const openForTemplatesView = useCallback(
    (mcId: string, propertyId: string, propertyLabel: string) => {
      pendingPropertyFilterRef.current = { id: propertyId, label: propertyLabel }
      setError(null)
      setSelectedPropertyId(propertyId)
      setSelectedPropertyLabel(propertyLabel)
      setMode({ kind: "view", mcId, tab: "templates" })
    },
    [],
  )

  const openForMcEdit = useCallback((row: ManagementCompanyListRow) => {
    const next = buildMcFormFromRow(row)
    setMcEditForm(next)
    setMcEditBaseline(next)
    setMcEditUpdatedAt(row.updatedAt)
    setError(null)
    setMode({ kind: "section-edit-mc", mcId: row.id })
  }, [])

  const openForPropertyEdit = useCallback((row: PropertyListRow) => {
    const next = buildPropertyFormFromRow(row)
    setPropertyEditForm(next)
    setPropertyEditBaseline(next)
    setPropertyEditUpdatedAt(row.updatedAt)
    setPropertyEditMcLabel(row.managementCompany?.name ?? null)
    setError(null)
    setMode({
      kind: "section-edit-property",
      propertyId: row.id,
      mcId: row.managementCompany?.id ?? null,
    })
  }, [])

  const close = useCallback(() => {
    if (isSaving) return
    setMode({ kind: "closed" })
    resetAll()
  }, [isSaving, resetAll])

  // ===== Section transitions =====
  const enterMcEditFromContext = useCallback(() => {
    if (contextMcId === null) return
    const detail = detailQuery.data
    if (detail) {
      const next = toManagementCompanyForm(detail)
      setMcEditForm(next)
      setMcEditBaseline(next)
      setMcEditUpdatedAt(detail.updatedAt)
    } else {
      setMcEditForm(EMPTY_MC_FORM)
      setMcEditBaseline(EMPTY_MC_FORM)
      setMcEditUpdatedAt(null)
    }
    setError(null)
    setMode({ kind: "section-edit-mc", mcId: contextMcId })
  }, [contextMcId, detailQuery.data])

  const enterPropertyEditFromContext = useCallback(
    (row: PropertyListRow) => {
      openForPropertyEdit(row)
    },
    [openForPropertyEdit],
  )

  const exitToView = useCallback(() => {
    if (contextMcId === null) {
      setMode({ kind: "closed" })
      resetAll()
      return
    }
    resetMcEdit()
    resetPropertyEdit()
    setError(null)
    setMode((prev) => {
      const tab = prev.kind === "view" ? prev.tab : "properties"
      return { kind: "view", mcId: contextMcId, tab }
    })
  }, [contextMcId, resetMcEdit, resetPropertyEdit])

  // ===== Picker takeover =====
  const openPicker = useCallback((pickerKind: HubPickerKind) => {
    setMode((prev) => {
      if (prev.kind === "picker-takeover") return prev
      if (prev.kind === "closed") return prev
      return { kind: "picker-takeover", returnTo: prev, pickerKind }
    })
  }, [])

  const closePicker = useCallback(() => {
    setMode((prev) => {
      if (prev.kind !== "picker-takeover") return prev
      return prev.returnTo
    })
  }, [])

  // ===== MC link picker surface (dispatched by returnTo) =====
  // The same inline MC link picker serves both the create flow (writes
  // mcLinkId / mcLinkLabel into the create draft) and the property-edit
  // flow (writes managementCompanyId into the property edit form). The
  // picker reads selectedId/Label from the appropriate state.
  const mcLinkPickerReturnTarget =
    mode.kind === "picker-takeover" ? mode.returnTo.kind : null

  const mcLinkSelectedId: string | null =
    mcLinkPickerReturnTarget === "section-edit-property"
      ? propertyEditForm.managementCompanyId.length > 0
        ? propertyEditForm.managementCompanyId
        : null
      : mcLinkId

  const mcLinkSelectedLabel: string | null =
    mcLinkPickerReturnTarget === "section-edit-property" ? propertyEditMcLabel : mcLinkLabel

  const commitMcLink = useCallback(
    (id: string | null, label: string | null) => {
      const returnTo = mode.kind === "picker-takeover" ? mode.returnTo : null
      if (returnTo?.kind === "section-edit-property") {
        setPropertyEditForm((prev) => ({ ...prev, managementCompanyId: id ?? "" }))
        setPropertyEditMcLabel(label)
        setError(null)
      } else {
        setMcLinkId(id)
        setMcLinkLabel(id === null ? null : label)
        if (id !== null) setMcForm(EMPTY_MC_FORM)
        setError(null)
      }
      closePicker()
    },
    [mode, closePicker],
  )

  // ===== View tab + property-filter handlers =====
  const goToProperties = useCallback(() => {
    setMode((prev) => (prev.kind === "view" ? { ...prev, tab: "properties" } : prev))
  }, [])

  const goToTemplates = useCallback(() => {
    setMode((prev) => (prev.kind === "view" ? { ...prev, tab: "templates" } : prev))
  }, [])

  const selectPropertyFilter = useCallback(
    (id: string, label: string) => {
      setSelectedPropertyId(id)
      setSelectedPropertyLabel(label)
      closePicker()
    },
    [closePicker],
  )

  const clearPropertyFilter = useCallback(() => {
    setSelectedPropertyId(null)
    setSelectedPropertyLabel(null)
    closePicker()
  }, [closePicker])

  // Reset view-aux state when the context MC changes — then re-apply any
  // filter the opener intentionally queued via pendingPropertyFilterRef.
  useEffect(() => {
    resetView()
    const pending = pendingPropertyFilterRef.current
    if (pending) {
      setSelectedPropertyId(pending.id)
      setSelectedPropertyLabel(pending.label)
      pendingPropertyFilterRef.current = null
    }
  }, [contextMcId, resetView])

  // ===== Create-mode setters =====
  const setMcLink = useCallback((id: string | null, label: string | null) => {
    setMcLinkId(id)
    setMcLinkLabel(id === null ? null : label)
    if (id !== null) setMcForm(EMPTY_MC_FORM)
    setError(null)
  }, [])

  const setMcField = useCallback(
    <K extends keyof ManagementCompanyForm>(field: K, value: ManagementCompanyForm[K]) => {
      setMcLinkId(null)
      setMcLinkLabel(null)
      setMcForm((prev) => ({ ...prev, [field]: value }))
      setError(null)
    },
    [],
  )

  const setPropertyField = useCallback(
    <K extends keyof PropertyHubPropertyFields>(
      field: K,
      value: PropertyHubPropertyFields[K],
    ) => {
      setPropertyTouched(true)
      setPropertyForm((prev) => ({ ...prev, [field]: value }))
      setError(null)
    },
    [],
  )

  // ===== MC-edit setters =====
  const setMcEditField = useCallback(
    <K extends keyof ManagementCompanyForm>(field: K, value: ManagementCompanyForm[K]) => {
      setMcEditForm((prev) => ({ ...prev, [field]: value }))
      setError(null)
    },
    [],
  )

  // ===== Property-edit setters =====
  const setPropertyEditField = useCallback(
    <K extends keyof PropertyPrimaryForm>(field: K, value: PropertyPrimaryForm[K]) => {
      setPropertyEditForm((prev) => ({ ...prev, [field]: value }))
      setError(null)
    },
    [],
  )

  const setPropertyEditManagementCompany = useCallback(
    (id: string | null, label: string | null) => {
      setPropertyEditForm((prev) => ({ ...prev, managementCompanyId: id ?? "" }))
      setPropertyEditMcLabel(label)
      setError(null)
    },
    [],
  )

  // ===== Save / Discard / Delete (mode-dispatched) =====
  const save = useCallback(() => {
    if (!canSave) return
    if (mode.kind === "create") {
      createMutation.mutate(createPayload, {
        onSuccess: (result) => {
          setMode({ kind: "closed" })
          resetAll()
          onCreated?.(result)
        },
        onError: (err: unknown) => {
          setError(err instanceof Error ? err.message : String(err))
        },
      })
      return
    }
    if (mode.kind === "section-edit-mc" && mcEditUpdatedAt !== null) {
      updateMcMutation.mutate(
        { id: mode.mcId, form: mcEditForm, revisionKey: mcEditUpdatedAt },
        {
          onSuccess: (response) => {
            const detail = response.managementCompany
            const next = toManagementCompanyForm(detail)
            setMcEditForm(next)
            setMcEditBaseline(next)
            setMcEditUpdatedAt(detail.updatedAt)
            setError(null)
            // Stay open: pop back to view for the same MC.
            setMode({ kind: "view", mcId: detail.id, tab: "properties" })
          },
          onError: (err: unknown) => {
            setError(err instanceof Error ? err.message : String(err))
          },
        },
      )
      return
    }
    if (mode.kind === "section-edit-property" && propertyEditUpdatedAt !== null) {
      updatePropertyMutation.mutate(
        {
          id: mode.propertyId,
          form: propertyEditForm,
          revisionKey: propertyEditUpdatedAt,
        },
        {
          onSuccess: (response) => {
            const detail = response.property
            const next = toPropertyPrimaryForm(detail)
            setPropertyEditForm(next)
            setPropertyEditBaseline(next)
            setPropertyEditUpdatedAt(detail.updatedAt)
            setPropertyEditMcLabel(detail.managementCompany?.name ?? null)
            setError(null)
            // Stay open: pop back to the hub view that owns this property,
            // if known; otherwise close.
            const mcId = detail.managementCompany?.id ?? mode.mcId
            if (mcId) {
              setMode({ kind: "view", mcId, tab: "properties" })
            } else {
              setMode({ kind: "closed" })
              resetAll()
            }
          },
          onError: (err: unknown) => {
            setError(err instanceof Error ? err.message : String(err))
          },
        },
      )
      return
    }
  }, [
    canSave,
    mode,
    createMutation,
    createPayload,
    onCreated,
    resetAll,
    updateMcMutation,
    mcEditForm,
    mcEditUpdatedAt,
    updatePropertyMutation,
    propertyEditForm,
    propertyEditUpdatedAt,
  ])

  const discard = useCallback(() => {
    if (isSaving) return
    if (mode.kind === "create") {
      resetCreate()
      setError(null)
      return
    }
    if (mode.kind === "section-edit-mc") {
      setMcEditForm(mcEditBaseline)
      setError(null)
      return
    }
    if (mode.kind === "section-edit-property") {
      setPropertyEditForm(propertyEditBaseline)
      setError(null)
      return
    }
  }, [isSaving, mode.kind, resetCreate, mcEditBaseline, propertyEditBaseline])

  const deleteMc = useCallback(() => {
    if (
      mode.kind !== "section-edit-mc" ||
      mcEditUpdatedAt === null ||
      isSaving
    ) {
      return
    }
    deleteMcMutation.mutate(
      { id: mode.mcId, updatedAt: mcEditUpdatedAt },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: [...MANAGEMENT_COMPANIES_LIST_QUERY_KEY],
          })
          void queryClient.invalidateQueries({
            queryKey: [...MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY],
          })
          setMode({ kind: "closed" })
          resetAll()
        },
        onError: (err: unknown) => {
          setError(err instanceof Error ? err.message : String(err))
        },
      },
    )
  }, [mode, mcEditUpdatedAt, isSaving, deleteMcMutation, queryClient, resetAll])

  const deleteProperty = useCallback(() => {
    if (
      mode.kind !== "section-edit-property" ||
      propertyEditUpdatedAt === null ||
      isSaving
    ) {
      return
    }
    deletePropertyMutation.mutate(
      { id: mode.propertyId, updatedAt: propertyEditUpdatedAt },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: [...PROPERTIES_LIST_QUERY_KEY],
          })
          // After deleting, return to view if we know the parent hub.
          const mcId = mode.mcId
          if (mcId) {
            setMode({ kind: "view", mcId, tab: "properties" })
            resetPropertyEdit()
          } else {
            setMode({ kind: "closed" })
            resetAll()
          }
        },
        onError: (err: unknown) => {
          setError(err instanceof Error ? err.message : String(err))
        },
      },
    )
  }, [
    mode,
    propertyEditUpdatedAt,
    isSaving,
    deletePropertyMutation,
    queryClient,
    resetAll,
    resetPropertyEdit,
  ])

  const isOpen = mode.kind !== "closed"

  return {
    // ===== Modal state =====
    isOpen,
    mode,

    // ===== Openers =====
    open,
    openForCreate,
    openForView,
    openForTemplatesView,
    openForMcEdit,
    openForPropertyEdit,
    close,

    // ===== Transitions =====
    enterMcEditFromContext,
    enterPropertyEditFromContext,
    exitToView,
    openPicker,
    closePicker,
    mcLinkSelectedId,
    mcLinkSelectedLabel,
    commitMcLink,

    // ===== Create-mode state + setters =====
    mcMode,
    mcLinkId,
    mcLinkLabel,
    mcForm,
    propertyForm,
    propertyTouched,
    setMcLink,
    setMcField,
    setPropertyField,

    // ===== MC-edit state + setters =====
    mcEditForm,
    mcEditBaseline,
    mcEditUpdatedAt,
    mcEditIsDirty,
    setMcEditField,
    deleteMc,

    // ===== Property-edit state + setters =====
    propertyEditForm,
    propertyEditBaseline,
    propertyEditUpdatedAt,
    propertyEditIsDirty,
    propertyEditMcLabel,
    setPropertyEditField,
    setPropertyEditManagementCompany,
    deleteProperty,

    // ===== View-mode data =====
    contextMcId,
    managementCompany: detailQuery.data ?? null,
    isLoadingDetail: detailQuery.isPending && contextMcId !== null,
    isErrorDetail: detailQuery.isError,
    properties,
    templates,
    activeView: mode.kind === "view" ? mode.tab : activeView,
    selectedPropertyId,
    selectedPropertyLabel,
    goToProperties,
    goToTemplates,
    selectPropertyFilter,
    clearPropertyFilter,

    // ===== Common =====
    isSaving,
    isDirty,
    canSave,
    validationError,
    error,
    save,
    discard,
  }
}

export type PropertyHubSidePanelController = ReturnType<typeof usePropertyHubSidePanel>

// Keep query controller types re-exported so component files can reference them.
export type {
  PropertyHubPropertiesController,
  PropertyHubTemplatesController,
}
