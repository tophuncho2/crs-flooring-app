import { findOpenInviteByEmail } from "@builders/db"
import type { UserRank } from "@builders/domain"

// Returns the rank a brand-new Google signup should receive, or null if there is
// no open invite for the email. Read-only — the Better Auth `user.create.before`
// hook calls this to gate provisioning (invite-only) and to stamp the rank.
export async function resolveSignupInviteRank(email: string): Promise<UserRank | null> {
  const normalized = email.trim().toLowerCase()
  const invite = await findOpenInviteByEmail(normalized, new Date())
  return invite ? invite.rank : null
}
