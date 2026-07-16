import { z } from "zod"
import { DEFAULT_PALETTE_COLOR, type PaletteColor } from "../shared/palette.js"
import {
  WORK_ORDER_ADJUSTMENT_COLUMN_KEYS,
  WORK_ORDER_MATERIAL_COLUMN_KEYS,
  WORK_ORDER_SECTION_KEYS,
  WORK_ORDER_TOP_FIELD_KEYS,
  type WorkOrderStoredPrintConfig,
} from "../work-orders/file-generation/index.js"

/**
 * A work-order print/export DOCUMENT TYPE — a user-managed lookup row whose
 * `printConfig` carries the per-doc-type default checkbox visibilities the
 * configurator seeds from. `name` doubles as the printed document tag.
 */
export type WorkOrderDocumentType = {
  id: string
  workOrderDocumentTypeNumber: string
  name: string
  color: PaletteColor
  printConfig: WorkOrderStoredPrintConfig
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
}

export type WorkOrderDocumentTypeListRow = WorkOrderDocumentType

/** Slim shape the doc-type picker / configurator selector renders. */
export type WorkOrderDocumentTypeOption = {
  id: string
  name: string
  color: PaletteColor
  printConfig: WorkOrderStoredPrintConfig
}

export type WorkOrderDocumentTypeForm = {
  name: string
  color: PaletteColor
  printConfig: WorkOrderStoredPrintConfig
}

export const EMPTY_WORK_ORDER_DOCUMENT_TYPE_FORM: WorkOrderDocumentTypeForm = {
  name: "",
  color: DEFAULT_PALETTE_COLOR,
  printConfig: {},
}

export function toWorkOrderDocumentTypeForm(
  documentType: WorkOrderDocumentType,
): WorkOrderDocumentTypeForm {
  return {
    name: documentType.name,
    color: documentType.color,
    printConfig: documentType.printConfig,
  }
}

// --- printConfig payload schema -------------------------------------------
// Each visibility map is a PARTIAL of optional booleans, derived from the ONE
// key list in file-generation/types.ts. Partial + strip-unknown means a config
// saved before a new print column existed still parses; the missing key falls
// back to the code base default on read (resolvePrintConfig).

function partialBooleanMap<const Keys extends readonly string[]>(keys: Keys) {
  return z
    .object(Object.fromEntries(keys.map((key) => [key, z.boolean()])))
    .partial()
}

export const workOrderPrintConfigSchema = z
  .object({
    sections: partialBooleanMap(WORK_ORDER_SECTION_KEYS).optional(),
    topFields: partialBooleanMap(WORK_ORDER_TOP_FIELD_KEYS).optional(),
    adjustmentColumns: partialBooleanMap(WORK_ORDER_ADJUSTMENT_COLUMN_KEYS).optional(),
    materialColumns: partialBooleanMap(WORK_ORDER_MATERIAL_COLUMN_KEYS).optional(),
  })
  .strip()

/** Parse an unknown value (e.g. a jsonb column) into a valid stored config. */
export function parseWorkOrderPrintConfig(value: unknown): WorkOrderStoredPrintConfig {
  const result = workOrderPrintConfigSchema.safeParse(value ?? {})
  return result.success ? (result.data as WorkOrderStoredPrintConfig) : {}
}
