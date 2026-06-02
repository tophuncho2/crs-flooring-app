import { findUserByEmail } from "@builders/db"

export type AuthAccountStatus = "needs-password" | "needs-setup"

/**
 * Resolves the next login step for an email *without* attempting authentication.
 *
 * This replaces the previous "sign in with an empty password and read the
 * failure code" probe. That probe forced NextAuth's credentials provider to
 * throw on every login, which logged a CREDENTIALS_SIGNIN_ERROR (with a stack
 * trace) for an expected, benign control-flow step.
 *
 * Enumeration parity: an unknown email returns "needs-password" — identical to
 * an existing account that already has a password — so this endpoint reveals no
 * more about account existence than the prior flow did.
 */
export async function getAuthAccountStatusUseCase(input: {
  email: string
}): Promise<{ status: AuthAccountStatus }> {
  const email = input.email.trim().toLowerCase()

  const user = await findUserByEmail(email)

  if (!user || user.password !== null) {
    return { status: "needs-password" }
  }

  return { status: "needs-setup" }
}
