"use client"

import { useCallback, useMemo, useState } from "react"
import {
  type ManagementCompanyListRow,
  type PropertyListRow,
} from "@builders/domain"
import {
  deriveCanSave,
  deriveIsDirty,
  deriveValidationError,
} from "./derive-hub-mode-flags"
import { buildMcFormFromRow, buildPropertyFormFromRow } from "./form"
import { useHubCreateForm } from "./use-hub-create-form"
import { useHubMcEdit } from "./use-hub-mc-edit"
import { useHubPickerTakeover } from "./use-hub-picker-takeover"
import { useHubPropertyEdit } from "./use-hub-property-edit"
import { useHubSectionTransitions } from "./use-hub-section-transitions"
import { useHubViewFilter } from "./use-hub-view-filter"
import {
  usePropertyHubDetailQuery,
  usePropertyHubPropertiesQuery,
  usePropertyHubTemplatesQuery,
  type PropertyHubPropertiesController,
  type PropertyHubTemplatesController,
} from "./queries"
import type { PropertyHubCreateResult } from "./mutations"
import type { HubMode } from "./types"

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
  const { onCreated } = options

  const [mode, setMode] = useState<HubMode>({ kind: "closed" })
  const [error, setError] = useState<string | null>(null)
  const clearError = useCallback(() => setError(null), [])
  const setErrorMessage = useCallback((message: string) => setError(message), [])

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

  // Combined isPending across all slice-owned mutations.
  const isSaving = createForm.isPending || mcEdit.isPending || propertyEdit.isPending

  const resetAll = useCallback(() => {
    createForm.resetCreate()
    mcEdit.reset()
    propertyEdit.reset()
    view.resetView()
    setError(null)
  }, [createForm, mcEdit, propertyEdit, view])

  // ===== Mode-dispatched derivations (pure fns in derive-hub-mode-flags) =====
  const isDirty = useMemo(
    () =>
      deriveIsDirty(
        mode.kind,
        createForm.hasAnyCreateInteraction,
        mcEdit.isDirty,
        propertyEdit.isDirty,
      ),
    [
      mode.kind,
      createForm.hasAnyCreateInteraction,
      mcEdit.isDirty,
      propertyEdit.isDirty,
    ],
  )

  const canSave = useMemo(
    () =>
      deriveCanSave(
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
      ),
    [
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
    ],
  )

  const validationError = useMemo<string | null>(
    () =>
      deriveValidationError(
        mode.kind,
        createForm.hasAnyCreateInteraction,
        createForm.createValidationRaw,
        mcEdit.validation,
        propertyEdit.validation,
      ),
    [
      mode.kind,
      createForm.hasAnyCreateInteraction,
      createForm.createValidationRaw,
      mcEdit.validation,
      propertyEdit.validation,
    ],
  )

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

  // ===== Section transitions (panel-internal nav) =====
  const { enterMcEditFromContext, enterPropertyEditFromContext, exitToView } =
    useHubSectionTransitions({
      contextMcId,
      mcDetail: detailQuery.data,
      setMode,
      setError,
      mcEdit,
      propertyEdit,
      resetAll,
      openForPropertyEdit,
    })

  // ===== Picker takeover =====
  const {
    openPicker,
    closePicker,
    mcLinkSelectedId,
    mcLinkSelectedLabel,
    commitMcLink,
  } = useHubPickerTakeover({ mode, setMode, createForm, propertyEdit })

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

  // ===== Save / Discard / Delete — thin mode-switched dispatch =====
  // Each slice owns its mutation + the server-snapshot apply. The
  // coordinator only decides what mode to land in on success.
  const save = useCallback(() => {
    if (!canSave) return
    if (mode.kind === "create") {
      createForm.commitCreate({
        onSuccess: (result) => {
          setMode({ kind: "closed" })
          resetAll()
          onCreated?.(result)
        },
        onError: setErrorMessage,
      })
      return
    }
    if (mode.kind === "section-edit-mc") {
      mcEdit.commitUpdate(mode.mcId, {
        onSuccess: (detail) => {
          setError(null)
          // Stay open: pop back to view for the same MC.
          setMode({ kind: "view", mcId: detail.id, tab: "properties" })
        },
        onError: setErrorMessage,
      })
      return
    }
    if (mode.kind === "section-edit-property") {
      const fallbackMcId = mode.mcId
      propertyEdit.commitUpdate(mode.propertyId, {
        onSuccess: (detail) => {
          setError(null)
          // Stay open: pop back to the hub view that owns this property,
          // if known; otherwise close.
          const mcId = detail.managementCompany?.id ?? fallbackMcId
          if (mcId) {
            setMode({ kind: "view", mcId, tab: "properties" })
          } else {
            setMode({ kind: "closed" })
            resetAll()
          }
        },
        onError: setErrorMessage,
      })
      return
    }
  }, [canSave, mode, createForm, mcEdit, propertyEdit, onCreated, resetAll, setErrorMessage])

  const discard = useCallback(() => {
    if (isSaving) return
    if (mode.kind === "create") createForm.resetCreate()
    else if (mode.kind === "section-edit-mc") mcEdit.resetToBaseline()
    else if (mode.kind === "section-edit-property") propertyEdit.resetToBaseline()
    setError(null)
  }, [isSaving, mode.kind, createForm, mcEdit, propertyEdit])

  const deleteMc = useCallback(() => {
    if (mode.kind !== "section-edit-mc" || isSaving) return
    mcEdit.commitDelete(mode.mcId, {
      onSuccess: () => {
        setMode({ kind: "closed" })
        resetAll()
      },
      onError: setErrorMessage,
    })
  }, [mode, isSaving, mcEdit, resetAll, setErrorMessage])

  const deleteProperty = useCallback(() => {
    if (mode.kind !== "section-edit-property" || isSaving) return
    const fallbackMcId = mode.mcId
    propertyEdit.commitDelete(mode.propertyId, {
      onSuccess: () => {
        // After deleting, return to view if we know the parent hub.
        if (fallbackMcId) {
          setMode({ kind: "view", mcId: fallbackMcId, tab: "properties" })
          propertyEdit.reset()
        } else {
          setMode({ kind: "closed" })
          resetAll()
        }
      },
      onError: setErrorMessage,
    })
  }, [mode, isSaving, propertyEdit, resetAll, setErrorMessage])

  const isOpen = mode.kind !== "closed"

  return {
    // ===== Modal state =====
    isOpen,
    mode,

    // ===== Openers =====
    open,
    openForCreate,
    openForView,
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
