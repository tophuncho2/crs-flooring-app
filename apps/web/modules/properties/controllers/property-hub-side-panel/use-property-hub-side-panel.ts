"use client"

import { useCallback, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  PROPERTY_HUB_NO_ACTIONS_MESSAGE,
  toManagementCompanyForm,
  toPropertyPrimaryForm,
  type ManagementCompanyListRow,
  type PropertyListRow,
} from "@builders/domain"
import { MANAGEMENT_COMPANIES_LIST_QUERY_KEY } from "@/modules/management-companies/data/list-management-companies-request"
import { MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY } from "@/modules/management-companies/data/management-company-options-request"
import { PROPERTIES_LIST_QUERY_KEY } from "@/modules/properties/data/list-properties-request"
import { buildMcFormFromRow, buildPropertyFormFromRow } from "./form"
import { useHubCreateForm } from "./use-hub-create-form"
import { useHubMcEdit } from "./use-hub-mc-edit"
import { useHubPropertyEdit } from "./use-hub-property-edit"
import { useHubViewFilter } from "./use-hub-view-filter"
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
import type { HubMode, HubPickerKind } from "./types"

export type { PropertyHubCreateResult } from "./mutations"
export type { HubActiveView, HubMode, HubPickerKind, PropertyHubMcMode } from "./types"

export type UsePropertyHubSidePanelOptions = {
  onCreated?: (result: PropertyHubCreateResult) => void
}

/**
 * Coordinator for the property hub side panel. Owns the mode state machine
 * and composes four slice hooks (create form, mc-edit, property-edit, view
 * filter) plus the query + mutation layers. Save / discard / delete are
 * dispatched here off `mode.kind`. Saving never closes the panel — sections
 * reconcile from the server response and the mode returns to `view` for the
 * same hub.
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
  const clearError = useCallback(() => setError(null), [])

  // ===== Mode-derived context =====
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

  const editingPropertyId = mode.kind === "section-edit-property" ? mode.propertyId : null
  const isMcEditActive = mode.kind === "section-edit-mc"

  // ===== View-aux slice (must precede the templates query that reads its filter) =====
  const view = useHubViewFilter({ contextMcId })

  // ===== View-mode queries =====
  const detailQuery = usePropertyHubDetailQuery(contextMcId)
  const properties = usePropertyHubPropertiesQuery(contextMcId)
  const templates = usePropertyHubTemplatesQuery(contextMcId, view.selectedPropertyId)

  // ===== Section-state slices =====
  const createForm = useHubCreateForm({ clearError })
  const mcEdit = useHubMcEdit({
    isActive: isMcEditActive,
    detail: detailQuery.data,
    clearError,
  })
  const propertyEdit = useHubPropertyEdit({ editingPropertyId, clearError })

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

  const resetAll = useCallback(() => {
    createForm.resetCreate()
    mcEdit.reset()
    propertyEdit.reset()
    view.resetView()
    setError(null)
  }, [createForm, mcEdit, propertyEdit, view])

  // ===== Mode-dispatched isDirty / canSave / validationError =====
  const isDirty = useMemo(() => {
    if (mode.kind === "create") return createForm.hasAnyCreateInteraction
    if (mode.kind === "section-edit-mc") return mcEdit.isDirty
    if (mode.kind === "section-edit-property") return propertyEdit.isDirty
    return false
  }, [
    mode.kind,
    createForm.hasAnyCreateInteraction,
    mcEdit.isDirty,
    propertyEdit.isDirty,
  ])

  const canSave = useMemo(() => {
    if (isSaving) return false
    if (mode.kind === "create") {
      return createForm.hasAnyCreateInteraction && createForm.createValidationRaw === ""
    }
    if (mode.kind === "section-edit-mc") {
      return mcEdit.isDirty && mcEdit.validation === "" && mcEdit.updatedAt !== null
    }
    if (mode.kind === "section-edit-property") {
      return (
        propertyEdit.isDirty &&
        propertyEdit.validation === "" &&
        propertyEdit.updatedAt !== null
      )
    }
    return false
  }, [
    isSaving,
    mode.kind,
    createForm.hasAnyCreateInteraction,
    createForm.createValidationRaw,
    mcEdit.isDirty,
    mcEdit.validation,
    mcEdit.updatedAt,
    propertyEdit.isDirty,
    propertyEdit.validation,
    propertyEdit.updatedAt,
  ])

  const validationError = useMemo<string | null>(() => {
    if (mode.kind === "create") {
      if (
        !createForm.hasAnyCreateInteraction ||
        createForm.createValidationRaw === PROPERTY_HUB_NO_ACTIONS_MESSAGE
      ) {
        return null
      }
      return createForm.createValidationRaw === "" ? null : createForm.createValidationRaw
    }
    if (mode.kind === "section-edit-mc") {
      return mcEdit.validation === "" ? null : mcEdit.validation
    }
    if (mode.kind === "section-edit-property") {
      return propertyEdit.validation === "" ? null : propertyEdit.validation
    }
    return null
  }, [
    mode.kind,
    createForm.hasAnyCreateInteraction,
    createForm.createValidationRaw,
    mcEdit.validation,
    propertyEdit.validation,
  ])

  // ===== Openers =====
  const openForCreate = useCallback(() => {
    resetAll()
    setMode({ kind: "create" })
  }, [resetAll])

  const open = openForCreate

  const openForView = useCallback(
    (mcId: string) => {
      view.resetView()
      setError(null)
      setMode({ kind: "view", mcId, tab: "properties" })
    },
    [view],
  )

  // Open hub view on the Templates tab, pre-filtered to a specific property.
  // Used by the template-sync panel's right arrow to "exit into" the hub at
  // the templates list for the currently selected template's property.
  const openForTemplatesView = useCallback(
    (mcId: string, propertyId: string, propertyLabel: string) => {
      view.queuePropertyFilter(propertyId, propertyLabel)
      view.setPropertyFilter(propertyId, propertyLabel)
      setError(null)
      setMode({ kind: "view", mcId, tab: "templates" })
    },
    [view],
  )

  const openForMcEdit = useCallback(
    (row: ManagementCompanyListRow) => {
      mcEdit.hydrateFromRow(buildMcFormFromRow(row), row.updatedAt)
      setError(null)
      setMode({ kind: "section-edit-mc", mcId: row.id })
    },
    [mcEdit],
  )

  const openForPropertyEdit = useCallback(
    (row: PropertyListRow) => {
      propertyEdit.hydrateFromRow(
        buildPropertyFormFromRow(row),
        row.updatedAt,
        row.managementCompany?.name ?? null,
      )
      setError(null)
      setMode({
        kind: "section-edit-property",
        propertyId: row.id,
        mcId: row.managementCompany?.id ?? null,
      })
    },
    [propertyEdit],
  )

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
      mcEdit.hydrateFromRow(toManagementCompanyForm(detail), detail.updatedAt)
    } else {
      mcEdit.reset()
    }
    setError(null)
    setMode({ kind: "section-edit-mc", mcId: contextMcId })
  }, [contextMcId, detailQuery.data, mcEdit])

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
    mcEdit.reset()
    propertyEdit.reset()
    setError(null)
    setMode((prev) => {
      const tab = prev.kind === "view" ? prev.tab : "properties"
      return { kind: "view", mcId: contextMcId, tab }
    })
  }, [contextMcId, mcEdit, propertyEdit, resetAll])

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

  // The same inline MC link picker serves both the create flow (writes
  // mcLinkId / mcLinkLabel into the create draft) and the property-edit
  // flow (writes managementCompanyId into the property edit form). The
  // picker reads selectedId/Label from the appropriate state.
  const mcLinkPickerReturnTarget =
    mode.kind === "picker-takeover" ? mode.returnTo.kind : null

  const mcLinkSelectedId: string | null =
    mcLinkPickerReturnTarget === "section-edit-property"
      ? propertyEdit.form.managementCompanyId.length > 0
        ? propertyEdit.form.managementCompanyId
        : null
      : createForm.mcLinkId

  const mcLinkSelectedLabel: string | null =
    mcLinkPickerReturnTarget === "section-edit-property"
      ? propertyEdit.managementCompanyLabel
      : createForm.mcLinkLabel

  const commitMcLink = useCallback(
    (id: string | null, label: string | null) => {
      const returnTo = mode.kind === "picker-takeover" ? mode.returnTo : null
      if (returnTo?.kind === "section-edit-property") {
        propertyEdit.setManagementCompany(id, label)
      } else {
        createForm.setMcLink(id, label)
      }
      closePicker()
    },
    [mode, propertyEdit, createForm, closePicker],
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
      view.setPropertyFilter(id, label)
      closePicker()
    },
    [view, closePicker],
  )

  const clearPropertyFilter = useCallback(() => {
    view.clearPropertyFilter()
    closePicker()
  }, [view, closePicker])

  // ===== Save / Discard / Delete (mode-dispatched) =====
  const save = useCallback(() => {
    if (!canSave) return
    if (mode.kind === "create") {
      createMutation.mutate(createForm.createPayload, {
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
    if (mode.kind === "section-edit-mc" && mcEdit.updatedAt !== null) {
      updateMcMutation.mutate(
        { id: mode.mcId, form: mcEdit.form, revisionKey: mcEdit.updatedAt },
        {
          onSuccess: (response) => {
            const detail = response.managementCompany
            mcEdit.applyServerSnapshot(toManagementCompanyForm(detail), detail.updatedAt)
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
    if (mode.kind === "section-edit-property" && propertyEdit.updatedAt !== null) {
      updatePropertyMutation.mutate(
        {
          id: mode.propertyId,
          form: propertyEdit.form,
          revisionKey: propertyEdit.updatedAt,
        },
        {
          onSuccess: (response) => {
            const detail = response.property
            propertyEdit.applyServerSnapshot(
              toPropertyPrimaryForm(detail),
              detail.updatedAt,
              detail.managementCompany?.name ?? null,
            )
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
    createForm.createPayload,
    onCreated,
    resetAll,
    updateMcMutation,
    mcEdit,
    updatePropertyMutation,
    propertyEdit,
  ])

  const discard = useCallback(() => {
    if (isSaving) return
    if (mode.kind === "create") {
      createForm.resetCreate()
      setError(null)
      return
    }
    if (mode.kind === "section-edit-mc") {
      mcEdit.resetToBaseline()
      setError(null)
      return
    }
    if (mode.kind === "section-edit-property") {
      propertyEdit.resetToBaseline()
      setError(null)
      return
    }
  }, [isSaving, mode.kind, createForm, mcEdit, propertyEdit])

  const deleteMc = useCallback(() => {
    if (mode.kind !== "section-edit-mc" || mcEdit.updatedAt === null || isSaving) return
    deleteMcMutation.mutate(
      { id: mode.mcId, updatedAt: mcEdit.updatedAt },
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
  }, [mode, mcEdit.updatedAt, isSaving, deleteMcMutation, queryClient, resetAll])

  const deleteProperty = useCallback(() => {
    if (
      mode.kind !== "section-edit-property" ||
      propertyEdit.updatedAt === null ||
      isSaving
    ) {
      return
    }
    deletePropertyMutation.mutate(
      { id: mode.propertyId, updatedAt: propertyEdit.updatedAt },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: [...PROPERTIES_LIST_QUERY_KEY],
          })
          // After deleting, return to view if we know the parent hub.
          const mcId = mode.mcId
          if (mcId) {
            setMode({ kind: "view", mcId, tab: "properties" })
            propertyEdit.reset()
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
  }, [mode, propertyEdit, isSaving, deletePropertyMutation, queryClient, resetAll])

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
    mcMode: createForm.mcMode,
    mcLinkId: createForm.mcLinkId,
    mcLinkLabel: createForm.mcLinkLabel,
    mcForm: createForm.mcForm,
    propertyForm: createForm.propertyForm,
    propertyTouched: createForm.propertyTouched,
    setMcLink: createForm.setMcLink,
    setMcField: createForm.setMcField,
    setPropertyField: createForm.setPropertyField,

    // ===== MC-edit state + setters =====
    mcEditForm: mcEdit.form,
    mcEditBaseline: mcEdit.baseline,
    mcEditUpdatedAt: mcEdit.updatedAt,
    mcEditIsDirty: mcEdit.isDirty,
    setMcEditField: mcEdit.setField,
    deleteMc,

    // ===== Property-edit state + setters =====
    propertyEditForm: propertyEdit.form,
    propertyEditBaseline: propertyEdit.baseline,
    propertyEditUpdatedAt: propertyEdit.updatedAt,
    propertyEditIsDirty: propertyEdit.isDirty,
    propertyEditMcLabel: propertyEdit.managementCompanyLabel,
    setPropertyEditField: propertyEdit.setField,
    setPropertyEditManagementCompany: propertyEdit.setManagementCompany,
    deleteProperty,

    // ===== View-mode data =====
    contextMcId,
    managementCompany: detailQuery.data ?? null,
    isLoadingDetail: detailQuery.isPending && contextMcId !== null,
    isErrorDetail: detailQuery.isError,
    properties,
    templates,
    activeView: mode.kind === "view" ? mode.tab : view.activeView,
    selectedPropertyId: view.selectedPropertyId,
    selectedPropertyLabel: view.selectedPropertyLabel,
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
export type { PropertyHubPropertiesController, PropertyHubTemplatesController }
