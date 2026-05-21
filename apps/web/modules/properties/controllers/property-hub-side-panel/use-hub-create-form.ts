"use client"

import { useCallback, useMemo, useState } from "react"
import {
  validateCreatePropertyHubForm,
  type CreatePropertyHubForm,
  type ManagementCompanyForm,
  type PropertyHubPropertyFields,
} from "@builders/domain"
import {
  buildCreatePayload,
  deriveMcMode,
  EMPTY_MC_FORM,
  EMPTY_PROPERTY_HUB_PROPERTY_FIELDS,
} from "./form"
import {
  useCreatePropertyHubMutation,
  type PropertyHubCreateResult,
} from "./mutations"
import type { PropertyHubMcMode } from "./types"

export type CommitCreateCallbacks = {
  onSuccess?: (result: PropertyHubCreateResult) => void
  onError?: (message: string) => void
}

export type UseHubCreateFormArgs = {
  clearError: () => void
}

export type HubCreateFormSlice = {
  mcLinkId: string | null
  mcLinkLabel: string | null
  mcForm: ManagementCompanyForm
  propertyTouched: boolean
  propertyForm: PropertyHubPropertyFields
  mcMode: PropertyHubMcMode
  createPayload: CreatePropertyHubForm
  createValidationRaw: string
  hasAnyCreateInteraction: boolean
  setMcLink: (id: string | null, label: string | null) => void
  setMcField: <K extends keyof ManagementCompanyForm>(
    field: K,
    value: ManagementCompanyForm[K],
  ) => void
  setPropertyField: <K extends keyof PropertyHubPropertyFields>(
    field: K,
    value: PropertyHubPropertyFields[K],
  ) => void
  resetCreate: () => void
  isPending: boolean
  commitCreate: (callbacks: CommitCreateCallbacks) => void
}

/**
 * Create-mode slice for the property hub side panel. Owns the MC link/create
 * draft + the property-fields draft, derives the combined create payload, and
 * runs the create-form validation. Pure state — no mutation dispatch; the
 * coordinator hook fires `createMutation` against `createPayload`.
 */
export function useHubCreateForm({ clearError }: UseHubCreateFormArgs): HubCreateFormSlice {
  const [mcLinkId, setMcLinkId] = useState<string | null>(null)
  const [mcLinkLabel, setMcLinkLabel] = useState<string | null>(null)
  const [mcForm, setMcForm] = useState<ManagementCompanyForm>(EMPTY_MC_FORM)
  const [propertyTouched, setPropertyTouched] = useState(false)
  const [propertyForm, setPropertyForm] = useState<PropertyHubPropertyFields>(
    EMPTY_PROPERTY_HUB_PROPERTY_FIELDS,
  )

  const resetCreate = useCallback(() => {
    setMcLinkId(null)
    setMcLinkLabel(null)
    setMcForm(EMPTY_MC_FORM)
    setPropertyTouched(false)
    setPropertyForm(EMPTY_PROPERTY_HUB_PROPERTY_FIELDS)
  }, [])

  const setMcLink = useCallback(
    (id: string | null, label: string | null) => {
      setMcLinkId(id)
      setMcLinkLabel(id === null ? null : label)
      if (id !== null) setMcForm(EMPTY_MC_FORM)
      clearError()
    },
    [clearError],
  )

  const setMcField = useCallback(
    <K extends keyof ManagementCompanyForm>(field: K, value: ManagementCompanyForm[K]) => {
      setMcLinkId(null)
      setMcLinkLabel(null)
      setMcForm((prev) => ({ ...prev, [field]: value }))
      clearError()
    },
    [clearError],
  )

  const setPropertyField = useCallback(
    <K extends keyof PropertyHubPropertyFields>(
      field: K,
      value: PropertyHubPropertyFields[K],
    ) => {
      setPropertyTouched(true)
      setPropertyForm((prev) => ({ ...prev, [field]: value }))
      clearError()
    },
    [clearError],
  )

  const mcMode = useMemo<PropertyHubMcMode>(
    () => deriveMcMode(mcLinkId, mcForm),
    [mcLinkId, mcForm],
  )

  const createPayload = useMemo<CreatePropertyHubForm>(
    () => buildCreatePayload({ mcLinkId, mcForm, propertyTouched, propertyForm }),
    [mcLinkId, mcForm, propertyTouched, propertyForm],
  )

  const createValidationRaw = useMemo(
    () => validateCreatePropertyHubForm(createPayload),
    [createPayload],
  )

  const hasAnyCreateInteraction = mcMode !== "none" || propertyTouched

  const createMutation = useCreatePropertyHubMutation()

  const commitCreate = useCallback(
    ({ onSuccess, onError }: CommitCreateCallbacks) => {
      createMutation.mutate(createPayload, {
        onSuccess: (result) => onSuccess?.(result),
        onError: (err) =>
          onError?.(err instanceof Error ? err.message : String(err)),
      })
    },
    [createMutation, createPayload],
  )

  return {
    mcLinkId,
    mcLinkLabel,
    mcForm,
    propertyTouched,
    propertyForm,
    mcMode,
    createPayload,
    createValidationRaw,
    hasAnyCreateInteraction,
    setMcLink,
    setMcField,
    setPropertyField,
    resetCreate,
    isPending: createMutation.isPending,
    commitCreate,
  }
}
