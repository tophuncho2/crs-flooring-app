import type { PropertyListRow } from "@builders/domain"

export type PropertySidePanelMode = "create" | "edit"

export type PropertySidePanelOpenSpec =
  | { mode: "create" }
  | { mode: "edit"; row: PropertyListRow }
