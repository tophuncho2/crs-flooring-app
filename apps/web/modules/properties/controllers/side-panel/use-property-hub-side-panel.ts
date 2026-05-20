"use client"

import { useCallback, useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  EMPTY_PROPERTY_HUB_PROPERTY_FIELDS,
  PROPERTY_HUB_NO_ACTIONS_MESSAGE,
  validateCreatePropertyHubForm,
  type CreatePropertyHubForm,
  type ManagementCompanyForm,
  type PropertyHubMcSelection,
  type PropertyHubPropertyFields,
  type PropertyHubPropertySelection,
} from "@builders/domain"
import {
  MANAGEMENT_COMPANIES_LIST_QUERY_KEY,
} from "@/modules/management-companies/data/list-management-companies-request"
import { MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY } from "@/modules/management-companies/data/management-company-options-request"
import { PROPERTIES_LIST_QUERY_KEY } from "@/modules/properties/data/list-properties-request"
import { createPropertyHubRequest } from "@/modules/properties/data/mutations"

const EMPTY_MC_FORM: ManagementCompanyForm = {
  name: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
}

function mcFieldsHaveAnyValue(form: ManagementCompanyForm): boolean {
  return Boolean(
    form.name ||
      form.streetAddress ||
      form.city ||
      form.state ||
      form.zip ||
      form.phone ||
      form.email,
  )
}

/**
 * Owns the "+ Hub" side-panel lifecycle: creates a management company,
 * a property, or both (linking the property to a picked or freshly created
 * MC) — all in one transaction behind one idempotency key.
 *
 * Picker vs MC create fields are mutually exclusive: editing one auto-clears
 * the other. At least one of {create MC, create property} must be filled
 * before the save button enables.
 */
export function usePropertyHubSidePanel() {
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

  const mcMode: "none" | "link" | "create" = mcLinkId
    ? "link"
    : mcFieldsHaveAnyValue(mcForm)
      ? "create"
      : "none"

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

  const formPayload: CreatePropertyHubForm = useMemo(() => {
    let managementCompany: PropertyHubMcSelection
    if (mcLinkId) {
      managementCompany = { mode: "link", id: mcLinkId }
    } else if (mcFieldsHaveAnyValue(mcForm)) {
      managementCompany = { mode: "create", fields: mcForm }
    } else {
      managementCompany = { mode: "none" }
    }

    let property: PropertyHubPropertySelection
    if (propertyTouched && propertyForm.name.trim()) {
      property = { mode: "create", fields: propertyForm }
    } else {
      property = { mode: "none" }
    }

    return { managementCompany, property }
  }, [mcLinkId, mcForm, propertyTouched, propertyForm])

  const validationError = useMemo(
    () => validateCreatePropertyHubForm(formPayload),
    [formPayload],
  )

  const hasAnyInteraction = mcMode !== "none" || propertyTouched

  const createMutation = useMutation({
    mutationFn: () => createPropertyHubRequest(formPayload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...PROPERTIES_LIST_QUERY_KEY] })
      void queryClient.invalidateQueries({
        queryKey: [...MANAGEMENT_COMPANIES_LIST_QUERY_KEY],
      })
      void queryClient.invalidateQueries({
        queryKey: [...MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY],
      })
      setIsOpen(false)
      resetAll()
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })

  const isSaving = createMutation.isPending

  const canSave =
    !isSaving && hasAnyInteraction && validationError === ""

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
    createMutation.mutate()
  }, [canSave, createMutation])

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
