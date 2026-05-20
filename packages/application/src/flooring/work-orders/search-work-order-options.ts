import {
  searchWorkOrderMaterialItemOptions as searchWorkOrderMaterialItemOptionsRepo,
  searchWorkOrderOptions as searchWorkOrderOptionsRepo,
  type SearchWorkOrderMaterialItemOptionsInput,
  type SearchWorkOrderOptionsInput,
} from "@builders/db"
import type {
  WorkOrderMaterialItemOption,
  WorkOrderOption,
} from "@builders/domain"

/**
 * Async-picker search use cases for the cut-log relink dropdowns. Thin
 * wrappers over the read-repo: the repo enforces filter shape; the use
 * case is the canonical entry point so routes never reach into `@builders/db`
 * directly.
 */
export async function searchWorkOrderOptionsUseCase(
  input: SearchWorkOrderOptionsInput,
): Promise<WorkOrderOption[]> {
  return searchWorkOrderOptionsRepo(input)
}

export async function searchWorkOrderMaterialItemOptionsUseCase(
  input: SearchWorkOrderMaterialItemOptionsInput,
): Promise<WorkOrderMaterialItemOption[]> {
  return searchWorkOrderMaterialItemOptionsRepo(input)
}
