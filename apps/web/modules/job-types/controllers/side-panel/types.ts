import type { JobTypeListRow } from "@builders/domain"

export type JobTypeSidePanelMode =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; id: string }

export type OpenForEditSpec = {
  row: JobTypeListRow
}
