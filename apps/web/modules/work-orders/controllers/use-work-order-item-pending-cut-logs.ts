/**
 * UI projection of a cut log row as displayed inside the WOMI section's
 * cut-log grid. Narrower than `@builders/domain`'s `CutLogRow` — drops
 * fields the section doesn't render (cost/freight/createdAt/void) and
 * pins `coverageCut` as a string (the SSR loader normalizes nulls to "").
 *
 * NOTE — file name is historical. The per-WOMI controller hook that used
 * to live here was retired in sweep 4c when cut-log dirty state was
 * lifted to the section-level `useWorkOrderCutLogSectionState`. Type-only
 * export retained at this path so existing imports across the WO module
 * keep resolving; the file should be renamed/relocated in a post-V1
 * cleanup pass.
 */
export type PendingCutLogRow = {
  id: string
  cutLogNumber: string
  status: "PENDING" | "QUEUED" | "FINAL" | "VOID"
  isFinal: boolean
  inventoryId: string
  before: string
  cut: string
  after: string
  coverageCut: string
  isWaste: boolean
  notes: string
  finalCutSequence: number | null
  updatedAt: string
}
