import type {
  EntityOption,
  PropertyOption,
  TemplateOption,
} from "@builders/domain"

/**
 * A patch of the six cascade selection fields. An omitted key leaves that field
 * untouched; an explicit `null` clears it. This is the single source of truth
 * for the Entity → Property → Template cascade — consumed both by
 * the stateful `useCascadePickerController` (reference headers) and directly by
 * the record-view *form* groups, which apply it to their draft (ids) + label
 * snapshots. Pure data-in/data-out — no React, no fetching, no draft shape.
 */
export type CascadeSelectionPatch = {
  entityId?: string | null
  entityLabel?: string | null
  propertyId?: string | null
  propertyLabel?: string | null
  templateId?: string | null
  templateLabel?: string | null
}

/**
 * Selecting an Entity sets it and clears Property + Template — the
 * property filter changed, so every downstream selection is now stale.
 */
export function applyEntitySelection(
  option: EntityOption | null,
): CascadeSelectionPatch {
  return {
    entityId: option?.id ?? null,
    entityLabel: option?.entity ?? null,
    propertyId: null,
    propertyLabel: null,
    templateId: null,
    templateLabel: null,
  }
}

/**
 * Selecting a Property sets it, clears the Template, and **back-fills the
 * property's Entity when it has one** — users usually pick the
 * property first (or skip the entity entirely), so auto-linking saves a step. A
 * property with no linked entity omits the entity keys, leaving the prior entity untouched.
 */
export function applyPropertySelection(
  option: PropertyOption | null,
): CascadeSelectionPatch {
  return {
    propertyId: option?.id ?? null,
    propertyLabel: option?.name ?? null,
    ...(option?.entityId
      ? {
          entityId: option.entityId,
          entityLabel: option.entityName,
        }
      : {}),
    templateId: null,
    templateLabel: null,
  }
}

/**
 * Selecting a Template sets the leaf — it clears nothing downstream.
 */
export function applyTemplateSelection(
  option: TemplateOption | null,
): CascadeSelectionPatch {
  return {
    templateId: option?.id ?? null,
    templateLabel: option ? option.unitType || "—" : null,
  }
}
