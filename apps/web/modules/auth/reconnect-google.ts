"use client"

import { authClient } from "./auth-client"

// The Drive scope the Sheets export needs. Per-file (only files WE create),
// non-sensitive. Mirrors the server-side guard in
// `server/google/google-access-token.ts` — keep the two in sync.
const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file"

/**
 * Grant the Google Drive scope the Sheets export needs, on demand — this is the
 * incremental-authorization step. Sign-in requests identity only (see
 * `server/auth/better-auth.ts`), so a user has no `drive.file` grant until the
 * first time they export. `linkSocial` with the explicit scope re-runs Google
 * OAuth for the already-linked account to add just that scope; `accessType:
 * "offline"` (provider config) makes Google return a refresh token, stored on the
 * Account row, so every export after this is silent. Returns the user to the page
 * they were on. Wired into `ListExportButton`'s `onReauthRequired` from the list
 * clients, and triggered by the 409 `google_reauth_required` the export route
 * returns when the token lacks the Drive scope.
 */
export function reconnectGoogleForSheets(): void {
  const callbackURL =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/dashboard"
  void authClient.linkSocial({ provider: "google", scopes: [DRIVE_FILE_SCOPE], callbackURL })
}
