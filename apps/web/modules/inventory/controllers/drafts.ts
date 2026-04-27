"use client"

import {
  isCutLogPendingEditable,
  type CutLogPendingForm,
  type CutLogRow,
} from "@builders/domain"

/**
 * Client-only draft shape for the cut-logs section. Each draft mirrors the
 * domain `CutLogPendingForm` (the user-editable subset for PENDING rows)
 * plus a `clientId` that doubles as the row key.
 *
 * `clientId` is either the server cut-log id (for rows that exist on the
 * server) OR a `local:*` prefix (for locally-added rows the user hasn't
 * saved yet — set by `createLocalRecordRowId`). The diff builder
 * (`buildCutLogsDiff`) keys server-vs-local detection on the `local:`
 * prefix, matching staged-inv's `isLocalDraftRow` convention.
 *
 * Drafts cover EVERY server row (PENDING, QUEUED, FINAL, VOID), plus any
 * locally-added unsaved rows. Locked rows (anything other than PENDING)
 * still ride in the drafts list so the section component can render them
 * inside the same `Grid` with `editable={false}` cells — same column
 * layout, same chrome, just non-editable. The diff builder skips drafts
 * whose server row is locked so they never produce a modified or deleted
 * entry. Mirrors the staged-inv pattern (see
 * `apps/web/modules/imports/components/record/sections/import-staged-inventory-rows-section.tsx`).
 */
export type CutLogDraft = {
  clientId: string
  cut: string
  cost: string | null
  freight: string | null
  isWaste: boolean
  notes: string
}

const EMPTY_DRAFT: CutLogPendingForm = {
  cut: "",
  cost: null,
  freight: null,
  isWaste: false,
  notes: "",
}

export function createCutLogDraft(row?: CutLogRow): CutLogDraft {
  return {
    clientId: row?.id ?? crypto.randomUUID(),
    cut: row?.cut ?? EMPTY_DRAFT.cut,
    cost: row?.cost ?? EMPTY_DRAFT.cost,
    freight: row?.freight ?? EMPTY_DRAFT.freight,
    isWaste: row?.isWaste ?? EMPTY_DRAFT.isWaste,
    notes: row?.notes ?? EMPTY_DRAFT.notes,
  }
}

/**
 * Convert the server's full row list into drafts. Includes EVERY row
 * regardless of status — locked rows ride along so they stay visible in
 * the same grid; the section component flips per-cell editability via the
 * row's server status.
 */
export function toCutLogDrafts(rows: ReadonlyArray<CutLogRow>): CutLogDraft[] {
  return rows.map((row) => createCutLogDraft(row))
}

/**
 * Returns true for drafts whose `clientId` is a `local:*` placeholder —
 * i.e., a row the user added locally that hasn't been persisted yet.
 * Mirrors the `isLocalDraftRow` predicate in the staged-inv controller.
 */
export function isLocalCutLogDraft(draft: CutLogDraft): boolean {
  return draft.clientId.startsWith("local:")
}

/**
 * Per-row form-shape validation for the section's save flow. Returns the
 * first validation error string (matching staged-inv's
 * `validateImportStagedRowDrafts` signature) or null on pass.
 *
 * Drafts include every server row regardless of status, but only local
 * additions and pending-editable server rows actually appear in the diff
 * sent to the server. Locked rows (FINAL / VOID / QUEUED) ride along for
 * visual purposes only — their values are never sent and must not be
 * validated. VOID rows in particular store `cut = "0"` (per
 * `voidCutLogRecord`'s erase patch), which would falsely fail the
 * positive-cut check below if they weren't filtered out. Mirrors the
 * filter `buildCutLogsDiff` already applies.
 */
export function validateCutLogDrafts(
  drafts: ReadonlyArray<CutLogDraft>,
  serverRows: ReadonlyArray<CutLogRow>,
): string | null {
  const editableServerIds = new Set(
    serverRows.filter((row) => isCutLogPendingEditable(row)).map((row) => row.id),
  )
  for (const draft of drafts) {
    if (!isLocalCutLogDraft(draft) && !editableServerIds.has(draft.clientId)) {
      continue
    }
    const cutRaw = draft.cut.trim()
    if (cutRaw === "") return "Every cut log must have a cut value"
    const cut = Number(cutRaw)
    if (!Number.isFinite(cut)) return "Cut value must be a number"
    if (cut <= 0) return "Cut value must be greater than zero"
    const costRaw = (draft.cost ?? "").trim()
    if (costRaw !== "") {
      const cost = Number(costRaw)
      if (!Number.isFinite(cost)) return "Cost must be a number when provided"
      if (cost < 0) return "Cost cannot be negative"
    }
    const freightRaw = (draft.freight ?? "").trim()
    if (freightRaw !== "") {
      const freight = Number(freightRaw)
      if (!Number.isFinite(freight)) return "Freight must be a number when provided"
      if (freight < 0) return "Freight cannot be negative"
    }
  }
  return null
}
