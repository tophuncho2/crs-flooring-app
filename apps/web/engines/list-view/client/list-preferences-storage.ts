"use client"

import type { ListSort } from "@builders/application"
import type { ListFilterValueMap } from "./contracts/list-controller-output"

/**
 * The remembered tool-state for one list view. Persisted per `tableKey` so a
 * list reopens exactly how the user left it — search, sort, filters, and column
 * widths — until they press the action-bar "Clear All". Only NON-default state
 * is ever stored (the controller omits empty/default slices before writing), so
 * a present key always means "the user has customised this list".
 */
export type ListPreferencesSnapshot = {
  q?: string
  sorts?: ListSort[]
  filters?: ListFilterValueMap
  columnWidths?: Record<string, number>
}

// Versioned so a future shape change can invalidate old blobs cleanly.
function storageKey(tableKey: string): string {
  return `listprefs:v1:${tableKey}`
}

/**
 * Read a list's saved preferences. SSR-safe (returns null on the server) and
 * self-healing: a corrupt blob is dropped and treated as absent. Mirrors the
 * record-view draft helper's shape, but localStorage + list-scoped.
 */
export function readListPreferences(tableKey: string): ListPreferencesSnapshot | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(storageKey(tableKey))
  if (!raw) return null
  try {
    return JSON.parse(raw) as ListPreferencesSnapshot
  } catch {
    window.localStorage.removeItem(storageKey(tableKey))
    return null
  }
}

export function writeListPreferences(tableKey: string, snapshot: ListPreferencesSnapshot): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(storageKey(tableKey), JSON.stringify(snapshot))
}

export function clearListPreferences(tableKey: string): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(storageKey(tableKey))
}
