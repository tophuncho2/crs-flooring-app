"use client"

import { useCallback, useMemo, useState } from "react"
import {
  toManagementCompanyForm,
  toPropertyPrimaryForm,
  type ManagementCompanyDetail,
  type ManagementCompanyListRow,
  type PropertyDetailRecord,
  type PropertyListRow,
} from "@builders/domain"
import { getManagementCompanyDetailRequest } from "@/modules/management-companies/data/management-company-detail-request"
import { getPropertyDetailRequest } from "@/modules/properties/data/property-detail-request"
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

export type PropertyHubSaveResult =
  | { kind: "mc"; managementCompany: ManagementCompanyDetail }
  | { kind: "property"; property: PropertyDetailRecord }

export type UsePropertyHubSidePanelOptions = {
  onCreated?: (result: PropertyHubCreateResult) => void
  /**
   * Fires after an MC or Property edit-mode save commits server-side.
   * Host record-views use this to patch their locally-held detail
   * (joined picker labels, address, instructions) without a full
   * refetch. Identity-gate against the host record's bound id.
   */
  onSaved?: (result: PropertyHubSaveResult) => void
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
  const { onCreated, onSaved } = options

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

  // ID-only entry points, used by picker-adjacent shortcut buttons that
  // know only the selected id. Fetch the canonical detail, hydrate the
  // slice from it (so baseline + updatedAt match the server), then enter
  // edit mode in one shot.
  const openForMcEditById = useCallback(
    async (mcId: string) => {
      try {
        setError(null)
        const detail = await getManagementCompanyDetailRequest(mcId)
        mcEdit.hydrateFromRow(toManagementCompanyForm(detail), detail.updatedAt)
        setMode({ kind: "section-edit-mc", mcId: detail.id })
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : String(err))
      }
    },
    [mcEdit, setErrorMessage],
  )

  const openForPropertyEditById = useCallback(
    async (propertyId: string) => {
      try {
        setError(null)
        const detail = await getPropertyDetailRequest(propertyId)
        propertyEdit.hydrateFromRow(
          toPropertyPrimaryForm(detail),
          detail.updatedAt,
          detail.managementCompany?.name ?? null,
        )
        setMode({
          kind: "section-edit-property",
          propertyId: detail.id,
          mcId: detail.managementCompany?.id ?? null,
        })
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : String(err))
      }
    },
    [propertyEdit, setErrorMessage],
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
    pickerKind,
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

  // Per-property-row shortcut: jump straight to the templates tab pre-filtered
  // to the clicked property. Sets the property filter and flips the view tab in
  // one shot (same hub → contextMcId is unchanged, so the filter persists).
  const openTemplatesForProperty = useCallback(
    (row: PropertyListRow) => {
      view.setPropertyFilter(row.id, row.name)
      setMode((prev) => (prev.kind === "view" ? { ...prev, tab: "templates" } : prev))
    },
    [view],
  )

  // ===== Save / Discard / Delete — thin mode-switched dispatch =====
  // Each slice owns its mutation + the server-snapshot apply. The
  // coordinator only decides what mode to land in on success.
  const save = useCallback(() => {
    if (!canSave) return
    if (mode.kind === "create") {
      createForm.commitCreate({
        onSuccess: (result) => {
          setError(null)
          onCreated?.(result)
          // Stay open: transition to section-edit for the new record so
          // the operator can keep refining what they just authored.
          // Mirrors the cut-log create→edit precedent. Reset other slices
          // first so they're clean when re-activated; hydrate the target
          // slice with the just-created record so its baseline matches
          // the server state.
          if (result.property) {
            const property = result.property
            const mcLabel =
              result.managementCompany?.name ??
              property.managementCompany?.name ??
              null
            const mcId =
              result.managementCompany?.id ??
              property.managementCompany?.id ??
              null
            resetAll()
            propertyEdit.hydrateFromRow(
              toPropertyPrimaryForm(property),
              property.updatedAt,
              mcLabel,
            )
            setMode({
              kind: "section-edit-property",
              propertyId: property.id,
              mcId,
            })
          } else if (result.managementCompany) {
            const mc = result.managementCompany
            resetAll()
            mcEdit.hydrateFromRow(toManagementCompanyForm(mc), mc.updatedAt)
            setMode({ kind: "section-edit-mc", mcId: mc.id })
          } else {
            setMode({ kind: "closed" })
            resetAll()
          }
        },
        onError: setErrorMessage,
      })
      return
    }
    if (mode.kind === "section-edit-mc") {
      mcEdit.commitUpdate(mode.mcId, {
        onSuccess: (detail) => {
          setError(null)
          onSaved?.({ kind: "mc", managementCompany: detail })
          // Stay open in section-edit-mc; the slice already applied the
          // server snapshot to its form + baseline.
        },
        onError: setErrorMessage,
      })
      return
    }
    if (mode.kind === "section-edit-property") {
      const currentMcId = mode.mcId
      propertyEdit.commitUpdate(mode.propertyId, {
        onSuccess: (detail) => {
          setError(null)
          onSaved?.({ kind: "property", property: detail })
          // Stay open in section-edit-property; the slice already
          // applied the server snapshot. Re-set mode only if the
          // property was reparented to a different MC (rare; updates
          // contextMcId so the parent-MC detail query refetches).
          const nextMcId = detail.managementCompany?.id ?? currentMcId
          if (nextMcId !== currentMcId) {
            setMode({
              kind: "section-edit-property",
              propertyId: detail.id,
              mcId: nextMcId,
            })
          }
        },
        onError: setErrorMessage,
      })
      return
    }
  }, [canSave, mode, createForm, mcEdit, propertyEdit, onCreated, onSaved, resetAll, setErrorMessage])

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
    openForMcEditById,
    openForPropertyEditById,
    close,

    // ===== Transitions =====
    enterMcEditFromContext,
    enterPropertyEditFromContext,
    exitToView,
    pickerKind,
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
    openTemplatesForProperty,

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
