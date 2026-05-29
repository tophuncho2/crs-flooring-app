import {
  PROPERTY_HUB_LINK_REQUIRES_PROPERTY_MESSAGE,
  PROPERTY_HUB_NO_ACTIONS_MESSAGE,
} from "@builders/domain"
import type { HubMode } from "./types"

/**
 * Pure mode-dispatched derivations consumed by the hub coordinator. Each
 * answers a question about the current section's draft state: is it
 * dirty, is the save button enabled, and what (if any) validation message
 * to show.
 *
 * Args are positional primitives (not slice objects) so the call-site
 * `useMemo` dep arrays match exactly and the React Compiler can preserve
 * the manual memoization.
 */

export type HubModeKind = HubMode["kind"]

export function deriveIsDirty(
  modeKind: HubModeKind,
  hasAnyCreateInteraction: boolean,
  mcEditIsDirty: boolean,
  propertyEditIsDirty: boolean,
): boolean {
  if (modeKind === "create") return hasAnyCreateInteraction
  if (modeKind === "section-edit-mc") return mcEditIsDirty
  if (modeKind === "section-edit-property") return propertyEditIsDirty
  return false
}

export function deriveCanSave(
  isSaving: boolean,
  modeKind: HubModeKind,
  hasAnyCreateInteraction: boolean,
  createValidationRaw: string,
  mcEditIsDirty: boolean,
  mcEditValidation: string,
  mcEditUpdatedAt: string | null,
  propertyEditIsDirty: boolean,
  propertyEditValidation: string,
  propertyEditUpdatedAt: string | null,
): boolean {
  if (isSaving) return false
  if (modeKind === "create") {
    return hasAnyCreateInteraction && createValidationRaw === ""
  }
  if (modeKind === "section-edit-mc") {
    return mcEditIsDirty && mcEditValidation === "" && mcEditUpdatedAt !== null
  }
  if (modeKind === "section-edit-property") {
    return (
      propertyEditIsDirty &&
      propertyEditValidation === "" &&
      propertyEditUpdatedAt !== null
    )
  }
  return false
}

export function deriveValidationError(
  modeKind: HubModeKind,
  hasAnyCreateInteraction: boolean,
  createValidationRaw: string,
  mcEditValidation: string,
  propertyEditValidation: string,
): string | null {
  if (modeKind === "create") {
    // NO_ACTIONS and LINK_REQUIRES_PROPERTY are incomplete-form guards, not
    // errors — they already disable the create button (deriveCanSave), so
    // surfacing them as a live notice is noise. Only real validation failures
    // (blank required field, etc.) show in the banner.
    if (
      !hasAnyCreateInteraction ||
      createValidationRaw === PROPERTY_HUB_NO_ACTIONS_MESSAGE ||
      createValidationRaw === PROPERTY_HUB_LINK_REQUIRES_PROPERTY_MESSAGE
    ) {
      return null
    }
    return createValidationRaw === "" ? null : createValidationRaw
  }
  if (modeKind === "section-edit-mc") {
    return mcEditValidation === "" ? null : mcEditValidation
  }
  if (modeKind === "section-edit-property") {
    return propertyEditValidation === "" ? null : propertyEditValidation
  }
  return null
}
