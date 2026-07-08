"use client"

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react"

import { prunePreferencesForUser } from "./list-preferences-storage"

/**
 * The current user's id, seeded once (server-side) by the dashboard layout so it
 * is available synchronously on the first client render — no async session
 * fetch. The list controller reads it to namespace each list's saved
 * preferences per user (`listprefs:v1:<userId>:<tableKey>`), so a shared browser
 * profile doesn't leak one user's filters/search to the next. Absent (null) →
 * the key falls back to the bare `tableKey` (e.g. in tests with no provider).
 */
const ListPreferencesUserContext = createContext<string | null>(null)

export function ListPreferencesUserProvider({
  userId,
  children,
}: {
  userId: string | null
  children: ReactNode
}) {
  // Login-time cleanup: once per dashboard mount, drop every other user's saved
  // list-prefs namespace so departed users' blobs can't fill this shared
  // browser's quota. Runs in an effect (never during render) and is ref-gated so
  // React StrictMode's double-invoke doesn't trigger a second full scan.
  const prunedForRef = useRef<string | null>(null)
  useEffect(() => {
    if (!userId || prunedForRef.current === userId) return
    prunedForRef.current = userId
    prunePreferencesForUser(userId)
  }, [userId])

  return (
    <ListPreferencesUserContext.Provider value={userId}>
      {children}
    </ListPreferencesUserContext.Provider>
  )
}

export function useListPreferencesUserId(): string | null {
  return useContext(ListPreferencesUserContext)
}
