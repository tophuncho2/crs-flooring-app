"use client"

import type { CutLogRow } from "@builders/domain"

/**
 * Phase F scaffold controller for the inventory record view's cut-logs section.
 *
 * Save wiring, draft editing, and the parent-scoped save route
 * (`/api/inventory/[id]/cut-logs/section`) all land in Sweep 3 together with
 * `saveInventoryCutLogsUseCase`. Until then this hook exposes just the
 * read-through surface the section component needs — no controller state
 * machinery, no mutations.
 */
export function useInventoryCutLogsSection({
  cutLogs,
}: {
  cutLogs: CutLogRow[]
}) {
  return {
    cutLogs,
  }
}
