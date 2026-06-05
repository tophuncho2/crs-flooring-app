"use client"

import { useCallback, useRef, useState, type RefObject } from "react"
import type {
  ManagementCompanyOption,
  PropertyOption,
  TemplateOption,
} from "@builders/domain"
import type { CascadeStep } from "../contracts/cascade-picker-contracts"

/**
 * Optional preset seeding each step's id + label (deep links / row hand-offs).
 */
export type CascadePickerInitialSelections = {
  managementCompanyId?: string | null
  managementCompanyLabel?: string | null
  propertyId?: string | null
  propertyLabel?: string | null
  templateId?: string | null
  templateLabel?: string | null
}

export type CascadePickerController = {
  // ===== Selections =====
  managementCompanyId: string | null
  managementCompanyLabel: string | null
  propertyId: string | null
  propertyLabel: string | null
  templateId: string | null
  templateLabel: string | null
  expandedStep: CascadeStep | null

  // ===== Focus refs (re-focus the trigger after a selection) =====
  managementCompanyTriggerRef: RefObject<HTMLButtonElement | null>
  propertyTriggerRef: RefObject<HTMLButtonElement | null>
  templateTriggerRef: RefObject<HTMLButtonElement | null>

  // ===== Toggles + selection handlers =====
  toggleStep: (step: CascadeStep) => void
  selectManagementCompany: (option: ManagementCompanyOption | null) => void
  selectProperty: (option: PropertyOption | null) => void
  selectTemplate: (option: TemplateOption | null) => void
  cancelExpanded: () => void
  reset: () => void

  // ===== Derived =====
  hasSelections: boolean
}

/**
 * Cascade selection controller for the Management Company → Property → Template
 * pickers. Owns the three id+label selections, the inline expand/collapse
 * state, and the cascade rules:
 *
 * - Selecting a Management Company clears Property + Template (the property
 *   filter changed).
 * - Selecting a Property clears the Template, and **auto-links the property's
 *   Management Company** when it has one — users usually pick the property first
 *   (or skip the MC entirely), so back-filling the MC saves a step. A property
 *   with no linked MC leaves the MC selection untouched.
 * - Selecting a Template clears nothing (it is the leaf).
 *
 * Pure selection state only — no data fetching, navigation, or record loading;
 * those belong to the consumer.
 */
export function useCascadePickerController(
  options: { initialSelections?: CascadePickerInitialSelections } = {},
): CascadePickerController {
  const { initialSelections } = options

  const [managementCompanyId, setManagementCompanyId] = useState<string | null>(
    initialSelections?.managementCompanyId ?? null,
  )
  const [managementCompanyLabel, setManagementCompanyLabel] = useState<string | null>(
    initialSelections?.managementCompanyLabel ?? null,
  )
  const [propertyId, setPropertyId] = useState<string | null>(
    initialSelections?.propertyId ?? null,
  )
  const [propertyLabel, setPropertyLabel] = useState<string | null>(
    initialSelections?.propertyLabel ?? null,
  )
  const [templateId, setTemplateId] = useState<string | null>(
    initialSelections?.templateId ?? null,
  )
  const [templateLabel, setTemplateLabel] = useState<string | null>(
    initialSelections?.templateLabel ?? null,
  )
  const [expandedStep, setExpandedStep] = useState<CascadeStep | null>(null)

  const managementCompanyTriggerRef = useRef<HTMLButtonElement | null>(null)
  const propertyTriggerRef = useRef<HTMLButtonElement | null>(null)
  const templateTriggerRef = useRef<HTMLButtonElement | null>(null)

  const toggleStep = useCallback((step: CascadeStep) => {
    setExpandedStep((current) => (current === step ? null : step))
  }, [])

  const selectManagementCompany = useCallback(
    (option: ManagementCompanyOption | null) => {
      setManagementCompanyId(option?.id ?? null)
      setManagementCompanyLabel(option?.name ?? null)
      // Changing the MC invalidates the property filter — clear downstream.
      setPropertyId(null)
      setPropertyLabel(null)
      setTemplateId(null)
      setTemplateLabel(null)
      setExpandedStep(null)
      managementCompanyTriggerRef.current?.focus()
    },
    [],
  )

  const selectProperty = useCallback((option: PropertyOption | null) => {
    setPropertyId(option?.id ?? null)
    setPropertyLabel(option?.name ?? null)
    // Auto-link the property's management company when it has one. (When an MC
    // filter was already applied the picked property carries that same MC, so
    // this is a no-op; when no MC was selected it back-fills the first picker.)
    if (option?.managementCompanyId) {
      setManagementCompanyId(option.managementCompanyId)
      setManagementCompanyLabel(option.managementCompanyName)
    }
    // Changing the property invalidates the template filter — clear it.
    setTemplateId(null)
    setTemplateLabel(null)
    setExpandedStep(null)
    propertyTriggerRef.current?.focus()
  }, [])

  const selectTemplate = useCallback((option: TemplateOption | null) => {
    setTemplateId(option?.id ?? null)
    setTemplateLabel(option ? option.unitType || "—" : null)
    setExpandedStep(null)
    templateTriggerRef.current?.focus()
  }, [])

  const cancelExpanded = useCallback(() => {
    setExpandedStep((current) => {
      if (current === "managementCompany") managementCompanyTriggerRef.current?.focus()
      else if (current === "property") propertyTriggerRef.current?.focus()
      else if (current === "template") templateTriggerRef.current?.focus()
      return null
    })
  }, [])

  const reset = useCallback(() => {
    setManagementCompanyId(null)
    setManagementCompanyLabel(null)
    setPropertyId(null)
    setPropertyLabel(null)
    setTemplateId(null)
    setTemplateLabel(null)
    setExpandedStep(null)
  }, [])

  const hasSelections =
    managementCompanyId !== null || propertyId !== null || templateId !== null

  return {
    managementCompanyId,
    managementCompanyLabel,
    propertyId,
    propertyLabel,
    templateId,
    templateLabel,
    expandedStep,
    managementCompanyTriggerRef,
    propertyTriggerRef,
    templateTriggerRef,
    toggleStep,
    selectManagementCompany,
    selectProperty,
    selectTemplate,
    cancelExpanded,
    reset,
    hasSelections,
  }
}
