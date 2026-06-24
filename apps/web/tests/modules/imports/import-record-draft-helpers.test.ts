// @vitest-environment jsdom

/**
 * Regression guards for the imports staged-inventory sync helpers (relocated
 * into `controllers/record/drafts.ts`). These pin the documented footgun: the
 * worker flips a staged row QUEUED → IMPORTED in the DB WITHOUT bumping the
 * parent import, so:
 *   - `createSectionRevisionKey` must NOT move on a status-only change (else the
 *     section rebases and clobbers in-progress DRAFT edits), but MUST move on a
 *     row count change or a parent `updatedAt` bump.
 *   - status displayed in the grid must come from the SERVER snapshot
 *     (`buildServerStatusMap` + `resolveEffectiveStatus`), never the editable
 *     draft, so a stale draft status can't mask the worker's flip.
 */

import { describe, expect, it } from "vitest"
import type {
  ImportDetail,
  StagedInventoryFilterRow,
  StagedInventoryRow,
} from "@builders/domain"
import {
  buildServerStatusMap,
  createSectionRevisionKey,
  resolveEffectiveStatus,
} from "@/modules/imports/controllers/record/drafts"

const record = (updatedAt: string) => ({ updatedAt }) as ImportDetail
const filterRows = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `f${i}` })) as StagedInventoryFilterRow[]
const stagedRows = (...rows: Array<{ id: string; status: string }>) =>
  rows as unknown as StagedInventoryRow[]

describe("createSectionRevisionKey", () => {
  it("is INVARIANT to a status-only change (so a poll tick never rebases drafts)", () => {
    const rec = record("2026-06-24T00:00:00.000Z")
    const before = createSectionRevisionKey(rec, {
      filterRows: filterRows(1),
      stagedRows: stagedRows({ id: "r1", status: "QUEUED" }),
    })
    const after = createSectionRevisionKey(rec, {
      filterRows: filterRows(1),
      stagedRows: stagedRows({ id: "r1", status: "IMPORTED" }),
    })
    expect(after).toBe(before)
  })

  it("MOVES when the parent updatedAt bumps", () => {
    const server = { filterRows: filterRows(1), stagedRows: stagedRows({ id: "r1", status: "DRAFT" }) }
    expect(createSectionRevisionKey(record("2026-06-24T00:00:00.000Z"), server)).not.toBe(
      createSectionRevisionKey(record("2026-06-24T00:05:00.000Z"), server),
    )
  })

  it("MOVES when filter-row or staged-row counts change", () => {
    const rec = record("2026-06-24T00:00:00.000Z")
    const base = createSectionRevisionKey(rec, {
      filterRows: filterRows(1),
      stagedRows: stagedRows({ id: "r1", status: "DRAFT" }),
    })
    expect(
      createSectionRevisionKey(rec, {
        filterRows: filterRows(2),
        stagedRows: stagedRows({ id: "r1", status: "DRAFT" }),
      }),
    ).not.toBe(base)
    expect(
      createSectionRevisionKey(rec, {
        filterRows: filterRows(1),
        stagedRows: stagedRows({ id: "r1", status: "DRAFT" }, { id: "r2", status: "DRAFT" }),
      }),
    ).not.toBe(base)
  })
})

describe("buildServerStatusMap", () => {
  it("maps each saved row id to its server status", () => {
    const map = buildServerStatusMap(
      stagedRows(
        { id: "r1", status: "DRAFT" },
        { id: "r2", status: "QUEUED" },
        { id: "r3", status: "IMPORTED" },
      ),
    )
    expect(map.get("r1")).toBe("DRAFT")
    expect(map.get("r2")).toBe("QUEUED")
    expect(map.get("r3")).toBe("IMPORTED")
    expect(map.size).toBe(3)
  })
})

describe("resolveEffectiveStatus", () => {
  it("returns the SERVER status even when the draft status is stale", () => {
    const map = buildServerStatusMap(stagedRows({ id: "r1", status: "IMPORTED" }))
    // Draft still thinks it's QUEUED; server has moved on to IMPORTED.
    expect(resolveEffectiveStatus(map, { clientId: "r1", status: "QUEUED" })).toBe("IMPORTED")
  })

  it("falls back to the draft status for a local-only row absent from the server map", () => {
    const map = buildServerStatusMap(stagedRows({ id: "r1", status: "IMPORTED" }))
    expect(resolveEffectiveStatus(map, { clientId: "local-temp", status: "DRAFT" })).toBe("DRAFT")
  })
})
