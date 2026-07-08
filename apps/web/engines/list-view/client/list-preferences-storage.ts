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
  try {
    window.localStorage.setItem(storageKey(tableKey), JSON.stringify(snapshot))
  } catch {
    // Best-effort persistence: a full quota (shared/kiosk browser) or disabled
    // storage must not throw out of the write-through effect. Drop the write
    // silently; the read layer self-heals and re-derives from URL/defaults.
  }
}

export function clearListPreferences(tableKey: string): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(storageKey(tableKey))
}

/**
 * Drop every OTHER user's saved list preferences from this browser profile,
 * keeping only the given user's namespace. Fired once at dashboard mount so a
 * departed user's `listprefs:v1:<theirId>:*` blobs can't accumulate toward the
 * ~5MB origin quota on a shared/kiosk browser.
 *
 * Prunes by userId (never by tableKey) and excludes the current namespace, so
 * it can't race the controller's mount-time hydration read for this user's
 * lists. Legacy bare keys (no userId segment) and non-prefs keys are left
 * untouched — an unparseable key could be a valid pref.
 */
export function prunePreferencesForUser(userId: string): void {
  if (typeof window === "undefined") return
  const prefix = "listprefs:v1:"
  // Collect first, delete second: removing mid-iteration shifts indices and
  // would skip entries.
  const stale: string[] = []
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i)
    if (!key || !key.startsWith(prefix)) continue
    const rest = key.slice(prefix.length)
    const colon = rest.indexOf(":")
    if (colon === -1) continue // legacy bare `listprefs:v1:<tableKey>` — leave it
    if (rest.slice(0, colon) !== userId) stale.push(key)
  }
  for (const key of stale) window.localStorage.removeItem(key)
}
