import type { DiffExistingStagedInventoryRow } from "@builders/domain"
import { db } from "../../../client.js"
import { type StagedInventoryDbClient } from "../staged-inventory-rows/shared.js"

/**
 * Lightweight pre-read used by the combined section use case to feed
 * the staged-rows diff validator. Returns only the columns the domain
 * validator needs — keeps the round-trip narrow vs. the full
 * `listStagedInventoryByImport` payload.
 *
 * Mirrors `listFilterRowDiffSummariesByImport` on the filter-rows
 * slice.
 */
export async function listStagedInventoryRowDiffSummariesByImport(
  importEntryId: string,
  client: StagedInventoryDbClient = db,
): Promise<DiffExistingStagedInventoryRow[]> {
  const rows = await client.flooringImportStagedInventoryRow.findMany({
    where: { importEntryId },
    select: {
      id: true,
      status: true,
    },
  })
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
  }))
}
