"use client"

import { createContext, useContext, type ReactNode } from "react"

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
  return (
    <ListPreferencesUserContext.Provider value={userId}>
      {children}
    </ListPreferencesUserContext.Provider>
  )
}

export function useListPreferencesUserId(): string | null {
  return useContext(ListPreferencesUserContext)
}
