// EditabilityContract is the discriminated union every editable cell receives.
// Consumers declare `editable: false` with an optional reason so static-mode
// renderers can choose an icon, tooltip, or colour treatment.

export type EditabilityReason = "snapshot" | "locked" | "computed" | "archived"

export type EditabilityContract =
  | { editable: true }
  | { editable: false; reason?: EditabilityReason }
