import { markInviteAcceptedByEmail } from "@builders/db"

// Marks the consumed invite accepted after a successful signup. Called from the
// Better Auth `user.create.after` hook (post-creation side effect).
export async function markSignupInviteAccepted(email: string): Promise<void> {
  await markInviteAcceptedByEmail(email.trim().toLowerCase(), new Date())
}
