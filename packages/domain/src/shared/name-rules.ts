/**
 * A name is "blank" when it is missing, empty, or only whitespace.
 * Single source of truth for the name-required rule shared by Properties and
 * Entities (form validators and create/update use cases).
 */
export function isBlankName(value: string | null | undefined): boolean {
  return !value || !value.trim()
}
