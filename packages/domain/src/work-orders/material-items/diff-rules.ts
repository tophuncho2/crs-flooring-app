import type { SectionDiff } from "../../shared/section-diff.js"
import type {
  WorkOrderMaterialItemCreateForm,
  WorkOrderMaterialItemUpdateForm,
} from "./types.js"

export type WorkOrderMaterialItemsDiff = SectionDiff<
  WorkOrderMaterialItemCreateForm,
  WorkOrderMaterialItemUpdateForm
>
