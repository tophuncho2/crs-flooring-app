import type { HubMode } from "./types"

/**
 * Pure mode-dispatched derivations consumed by the inventory hub
 * coordinator. Each answers a question about the current section's draft
 * state: is it dirty, can save fire. Args are positional primitives so
 * the call-site `useMemo` dep arrays match exactly and the React
 * Compiler can preserve the manual memoization.
 *
 * Mirrors `properties/.../derive-hub-mode-flags.ts`. Picker-takeover
 * mode is intentionally not handled here — its actions toolbar is
 * hidden, so the underlying derivation never reaches the UI and `false`
 * is the correct default for both functions.
 */

export type HubModeKind = HubMode["kind"]

export function deriveIsDirty(
  modeKind: HubModeKind,
  inventoryEditIsDirty: boolean,
  cutLogPanelIsDirty: boolean,
  inventoryDuplicateIsDirty: boolean,
): boolean {
  if (modeKind === "section-edit-inventory") return inventoryEditIsDirty
  if (modeKind === "section-edit-cut-log") return cutLogPanelIsDirty
  if (modeKind === "section-duplicate-inventory") return inventoryDuplicateIsDirty
  return false
}

export function deriveCanSave(
  isSaving: boolean,
  modeKind: HubModeKind,
  inventoryEditIsDirty: boolean,
  inventoryEditUpdatedAt: string | null,
  cutLogPanelIsDirty: boolean,
  inventoryDuplicateCanSubmit: boolean,
): boolean {
  if (isSaving) return false
  if (modeKind === "section-edit-inventory") {
    return inventoryEditIsDirty && inventoryEditUpdatedAt !== null
  }
  if (modeKind === "section-edit-cut-log") {
    return cutLogPanelIsDirty
  }
  if (modeKind === "section-duplicate-inventory") {
    // Create flow — no row revision; the only client gate is a non-empty
    // starting stock. The server runs full validation (positive number,
    // length caps) and returns a 422 on failure.
    return inventoryDuplicateCanSubmit
  }
  return false
}
