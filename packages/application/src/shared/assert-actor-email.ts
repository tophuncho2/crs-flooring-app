/**
 * Shared opener guard: every mutating use case requires a non-empty actorEmail
 * for actor-column stamping. Byte-identical to the inline check it replaces —
 * the thrown message keeps the substring `actorEmail` (asserted by tests).
 */
export function assertActorEmail(
  actorEmail: string | undefined | null,
  useCaseName: string,
): void {
  if (!actorEmail || !actorEmail.trim()) {
    throw new Error(`${useCaseName} requires a non-empty actorEmail`)
  }
}
