import {
  searchWorkOrderOptions as searchWorkOrderOptionsRepo,
  type SearchWorkOrderOptionsInput,
  type WorkOrderOptionsSearchResult,
} from "@builders/db"

/**
 * Async-picker search use case for the inventory-adjustment "Work order"
 * relink dropdown. Thin wrapper over the read-repo: the repo enforces filter
 * shape; the use case is the canonical entry point so routes never reach into
 * `@builders/db` directly.
 */
export async function searchWorkOrderOptionsUseCase(
  input: SearchWorkOrderOptionsInput,
): Promise<WorkOrderOptionsSearchResult> {
  return searchWorkOrderOptionsRepo(input)
}
