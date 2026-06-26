"use client"

import { useSyncExternalStore } from "react"

// The header slots live in the app-shell HeaderControls subtree, so they can
// only be located after mount. useSyncExternalStore reads the slot on the
// client (getServerSnapshot returns null, matching SSR) without a
// setState-in-effect cascade. getElementById returns the same node ref across
// renders, so this never loops. Shared by every list-view header portal —
// ListActionBar (tools slot), ListHeaderPortal (meta slot), and
// ListCreateButtonPortal (page-action slot) — so the SSR-safe lookup lives once.

function subscribe(): () => void {
  return () => {}
}

function getServerSlot(): HTMLElement | null {
  return null
}

/**
 * Resolve an app-shell header slot element by string id, SSR-safe. Returns null
 * on the server and until the slot mounts on the client; the portal callers gate
 * their `createPortal` on a non-null result.
 */
export function usePortalSlot(slotId: string): HTMLElement | null {
  return useSyncExternalStore(
    subscribe,
    () => document.getElementById(slotId),
    getServerSlot,
  )
}
