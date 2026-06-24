"use client"

import { useCallback, useState } from "react"
import type {
  EntityOption,
  PropertyOption,
  TemplateOption,
} from "@builders/domain"
import type { CascadePickerSeed } from "../contracts/cascade-picker-contracts"
import {
  applyEntitySelection,
  applyPropertySelection,
  applyTemplateSelection,
  type CascadeSelectionPatch,
} from "./cascade-rules"

/**
 * Optional preset seeding each step's id + label (deep links / row hand-offs).
 */
export type CascadePickerInitialSelections = {
  entityId?: string | null
  entityLabel?: string | null
  propertyId?: string | null
  propertyLabel?: string | null
  templateId?: string | null
  templateLabel?: string | null
}

export type CascadePickerController = {
  // ===== Selections =====
  entityId: string | null
  entityLabel: string | null
  propertyId: string | null
  propertyLabel: string | null
  templateId: string | null
  templateLabel: string | null

  // ===== Selection handlers =====
  selectEntity: (option: EntityOption | null) => void
  selectProperty: (option: PropertyOption | null) => void
  selectTemplate: (option: TemplateOption | null) => void
  reset: () => void
  /** Set selections directly (no cascade side-effects) — e.g. pre-set from a loaded record. */
  seed: (selections: CascadePickerSeed) => void

  // ===== Derived =====
  hasSelections: boolean
}

/**
 * Stateful cascade selection controller for the Entity → Property →
 * Template pickers. Owns the three id+label selections and applies the shared
 * cascade rules (`cascade-rules.ts`) on each selection. Used where the cascade
 * itself is the source of truth (the templates reference header); record-view
 * *forms* apply the same rules directly to their draft instead.
 *
 * Pure selection state only — no data fetching, navigation, or record loading;
 * those belong to the consumer.
 */
export function useCascadePickerController(
  options: { initialSelections?: CascadePickerInitialSelections } = {},
): CascadePickerController {
  const { initialSelections } = options

  const [entityId, setEntityId] = useState<string | null>(
    initialSelections?.entityId ?? null,
  )
  const [entityLabel, setEntityLabel] = useState<string | null>(
    initialSelections?.entityLabel ?? null,
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

  // Apply a cascade patch to the selection state — an omitted key leaves its
  // field untouched (how property→entity auto-link skips back-filling when absent).
  const applyPatch = useCallback((patch: CascadeSelectionPatch) => {
    if (patch.entityId !== undefined) setEntityId(patch.entityId)
    if (patch.entityLabel !== undefined)
      setEntityLabel(patch.entityLabel)
    if (patch.propertyId !== undefined) setPropertyId(patch.propertyId)
    if (patch.propertyLabel !== undefined) setPropertyLabel(patch.propertyLabel)
    if (patch.templateId !== undefined) setTemplateId(patch.templateId)
    if (patch.templateLabel !== undefined) setTemplateLabel(patch.templateLabel)
  }, [])

  const selectEntity = useCallback(
    (option: EntityOption | null) => {
      applyPatch(applyEntitySelection(option))
    },
    [applyPatch],
  )

  const selectProperty = useCallback(
    (option: PropertyOption | null) => {
      applyPatch(applyPropertySelection(option))
    },
    [applyPatch],
  )

  const selectTemplate = useCallback(
    (option: TemplateOption | null) => {
      applyPatch(applyTemplateSelection(option))
    },
    [applyPatch],
  )

  const seed = useCallback((selections: CascadePickerSeed) => {
    if (selections.entity !== undefined) {
      setEntityId(selections.entity?.id ?? null)
      setEntityLabel(selections.entity?.label ?? null)
    }
    if (selections.property !== undefined) {
      setPropertyId(selections.property?.id ?? null)
      setPropertyLabel(selections.property?.label ?? null)
    }
    if (selections.template !== undefined) {
      setTemplateId(selections.template?.id ?? null)
      setTemplateLabel(selections.template?.label ?? null)
    }
  }, [])

  const reset = useCallback(() => {
    setEntityId(null)
    setEntityLabel(null)
    setPropertyId(null)
    setPropertyLabel(null)
    setTemplateId(null)
    setTemplateLabel(null)
  }, [])

  const hasSelections =
    entityId !== null || propertyId !== null || templateId !== null

  return {
    entityId,
    entityLabel,
    propertyId,
    propertyLabel,
    templateId,
    templateLabel,
    selectEntity,
    selectProperty,
    selectTemplate,
    reset,
    seed,
    hasSelections,
  }
}
