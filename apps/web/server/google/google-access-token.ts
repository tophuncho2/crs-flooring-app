import { headers } from "next/headers"
import { auth } from "@/server/auth/better-auth"

const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file"

/**
 * A valid, Drive-scoped Google access token for the current session user, or
 * `null` when the linked Google account can't produce one — i.e. the user hasn't
 * granted the `drive.file` scope yet (sign-in requests identity only, so Drive is
 * an on-demand incremental grant — no refresh token, or a token that predates the
 * scope). Better Auth's `getAccessToken` auto-refreshes using the stored refresh
 * token; a `null` return is the signal the route uses to ask the client to connect
 * Google Drive, not an error.
 */
export async function getGoogleAccessToken(): Promise<string | null> {
  try {
    const result = await auth.api.getAccessToken({
      body: { providerId: "google" },
      headers: await headers(),
    })
    if (!result?.accessToken) return null
    // A pre-scope SSO token may still be valid but lack Drive access — reject it so
    // we reconnect rather than fire a Drive call that 403s.
    if (!result.scopes?.includes(DRIVE_FILE_SCOPE)) return null
    return result.accessToken
  } catch {
    return null
  }
}
