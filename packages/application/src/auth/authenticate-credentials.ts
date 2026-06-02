import bcrypt from "bcrypt"
import { findUserByEmail, recordUserLoginActivity } from "@builders/db"

// Pre-computed hash compared against on the user-not-found path so authentication
// takes a similar amount of time whether or not the email exists, closing a
// user-enumeration timing oracle.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("invalid-password-placeholder", 10)

export type AuthenticatedUser = {
  id: string
  email: string
  role: string
  isVerified: boolean
}

export type AuthenticateCredentialsResult =
  | { outcome: "ok"; user: AuthenticatedUser }
  | { outcome: "invalid-credentials" }
  | { outcome: "account-restricted"; userId: string; userEmail: string }

/**
 * Verifies an email + password against the stored credentials.
 *
 * Returns a discriminated outcome rather than throwing — the calling adapter
 * (NextAuth `authorize`) owns HTTP concerns (rate limiting, logging, and the
 * mapping to NextAuth's thrown error codes).
 */
export async function authenticateCredentialsUseCase(input: {
  email: string
  password: string
}): Promise<AuthenticateCredentialsResult> {
  const email = input.email.trim().toLowerCase()

  const user = await findUserByEmail(email)
  const passwordMatches = await bcrypt.compare(input.password, user?.password ?? DUMMY_PASSWORD_HASH)

  if (!user || !user.password || !passwordMatches) {
    return { outcome: "invalid-credentials" }
  }

  if (!user.isVerified) {
    return { outcome: "account-restricted", userId: user.id, userEmail: user.email }
  }

  await recordUserLoginActivity({ userId: user.id, userEmail: user.email })

  return {
    outcome: "ok",
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    },
  }
}
