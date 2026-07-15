"use client"

import { authClient } from "./auth-client"

/**
 * Re-run Google sign-in to (re-)grant the Drive scope needed for Sheets export.
 * The provider is configured with `prompt: "consent"`, so this surfaces the Drive
 * permission for users who linked their account before the scope was added. Sends
 * them back to the page they were on. Wired into `ListExportButton`'s
 * `onReauthRequired` from the list clients.
 */
export function reconnectGoogleForSheets(): void {
  const callbackURL =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/dashboard"
  void authClient.signIn.social({ provider: "google", callbackURL })
}
