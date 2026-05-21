"use client"

import { useCallback, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  PROPERTY_HUB_NO_ACTIONS_MESSAGE,
  validateCreatePropertyHubForm,
  type CreatePropertyHubForm,
  type ManagementCompanyForm,
  type PropertyHubPropertyFields,
} from "@builders/domain"
import {
  EMPTY_MC_FORM,
  EMPTY_PROPERTY_HUB_PROPERTY_FIELDS,
  buildFormPayload,
  deriveMcMode,
} from "./form"
import {
  useCreatePropertyHubMutation,
  type PropertyHubCreateResult,
} from "./mutations"

/**
 * Owns the "+ Hub" side-panel lifecycle: creates a management company,
 * a property, or both (linking the property to a picked or freshly created
 * MC) — all in one transaction behind one idempotency key.
 *
 * Picker vs MC create fields are mutually exclusive: editing one auto-clears
 * the other. At least one of {create MC, create property} must be filled
 * before the save button enables.
 */
export function usePropertyHubSidePanel(options?: {
  onCreated?: (result: PropertyHubCreateResult) => void
}) {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [mcLinkId, setMcLinkId] = useState<string | null>(null)
  const [mcLinkLabel, setMcLinkLabel] = useState<string | null>(null)
  const [mcForm, setMcForm] = useState<ManagementCompanyForm>(EMPTY_MC_FORM)
  const [propertyTouched, setPropertyTouched] = useState(false)
  const [propertyForm, setPropertyForm] = useState<PropertyHubPropertyFields>(
    EMPTY_PROPERTY_HUB_PROPERTY_FIELDS,
  )
  const [error, setError] = useState<string | null>(null)

  const mcMode = deriveMcMode(mcLinkId, mcForm)

  const resetAll = useCallback(() => {
    setMcLinkId(null)
    setMcLinkLabel(null)
    setMcForm(EMPTY_MC_FORM)
    setPropertyTouched(false)
    setPropertyForm(EMPTY_PROPERTY_HUB_PROPERTY_FIELDS)
    setError(null)
  }, [])

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

  const formPayload: CreatePropertyHubForm = useMemo(
    () => buildFormPayload({ mcLinkId, mcForm, propertyTouched, propertyForm }),
    [mcLinkId, mcForm, propertyTouched, propertyForm],
  )

  const validationError = useMemo(
    () => validateCreatePropertyHubForm(formPayload),
    [formPayload],
  )

  const hasAnyInteraction = mcMode !== "none" || propertyTouched

  const createMutation = useCreatePropertyHubMutation({
    queryClient,
    setIsOpen,
    resetAll,
    setError,
    onCreated: options?.onCreated,
  })

  const isSaving = createMutation.isPending

  const canSave = !isSaving && hasAnyInteraction && validationError === ""

  const open = useCallback(() => {
    resetAll()
    setIsOpen(true)
  }, [resetAll])

  const close = useCallback(() => {
    if (isSaving) return
    setIsOpen(false)
    resetAll()
  }, [isSaving, resetAll])

  const discard = useCallback(() => {
    if (isSaving) return
    resetAll()
  }, [isSaving, resetAll])

  const save = useCallback(() => {
    if (!canSave) return
    createMutation.mutate(formPayload)
  }, [canSave, createMutation, formPayload])

  const visibleValidationError =
    !hasAnyInteraction || validationError === PROPERTY_HUB_NO_ACTIONS_MESSAGE
      ? null
      : validationError === ""
        ? null
        : validationError

  return {
    isOpen,
    mcMode,
    mcLinkId,
    mcLinkLabel,
    mcForm,
    propertyForm,
    propertyTouched,
    hasAnyInteraction,
    isSaving,
    canSave,
    validationError: visibleValidationError,
    error,
    open,
    close,
    setMcLink,
    setMcField,
    setPropertyField,
    save,
    discard,
  }
}

export type PropertyHubSidePanelController = ReturnType<typeof usePropertyHubSidePanel>
