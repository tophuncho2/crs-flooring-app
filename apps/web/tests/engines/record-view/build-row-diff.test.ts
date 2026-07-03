import { describe, expect, it } from "vitest"

import { buildRowDiff } from "@/engines/record-view"

type Local = { id: string; value: string; extra?: string }
type Server = { id: string; value: string; status?: string }

const isLocalOnly = (id: string) => id.startsWith("temp:")

// Minimal opts shared by the material-items-style cases (id accessor, dirty
// check, and element mappers that mirror the real `{tempId, form}`/`{id, form}`
// shapes).
function diff(
  locals: Local[],
  serverRows: Server[],
  overrides: Partial<Parameters<typeof buildRowDiff<Local, Server, unknown, unknown>>[0]> = {},
) {
  return buildRowDiff<Local, Server, { tempId: string; value: string }, { id: string; value: string }>({
    locals,
    serverRows,
    getLocalId: (l) => l.id,
    isLocalOnly,
    differs: (l, s) => l.value !== s.value,
    toAdded: (l) => ({ tempId: l.id, value: l.value }),
    toModified: (l) => ({ id: l.id, value: l.value }),
    ...overrides,
  })
}

describe("buildRowDiff", () => {
  it("classifies local-only rows as added and changed rows as modified", () => {
    const result = diff(
      [
        { id: "temp:1", value: "new" },
        { id: "a", value: "changed" },
        { id: "b", value: "same" },
      ],
      [
        { id: "a", value: "original" },
        { id: "b", value: "same" },
      ],
    )

    expect(result.added).toEqual([{ tempId: "temp:1", value: "new" }])
    expect(result.modified).toEqual([{ id: "a", value: "changed" }])
    // "b" is unchanged, so it appears in neither added nor modified nor deleted.
    expect(result.deleted).toEqual([])
  })

  it("marks server rows absent from the local list as deleted", () => {
    const result = diff([{ id: "a", value: "a" }], [
      { id: "a", value: "a" },
      { id: "gone", value: "x" },
    ])

    expect(result.deleted).toEqual([{ id: "gone" }])
    expect(result.modified).toEqual([])
  })

  it("reverseAdded flips added order (top-add sections stamp oldest→newest)", () => {
    const locals: Local[] = [
      { id: "temp:2", value: "second-prepended" },
      { id: "temp:1", value: "first-prepended" },
    ]
    expect(diff(locals, []).added.map((a) => a.tempId)).toEqual(["temp:2", "temp:1"])
    expect(diff(locals, [], { reverseAdded: true }).added.map((a) => a.tempId)).toEqual([
      "temp:1",
      "temp:2",
    ])
  })

  it("onMissingServerRow defaults to skip: a non-local row with no server match vanishes", () => {
    const result = diff([{ id: "vanished", value: "v" }], [])
    expect(result.added).toEqual([])
    expect(result.modified).toEqual([])
    expect(result.deleted).toEqual([])
  })

  it("onMissingServerRow 'add' reconciles a non-local row whose server row is gone", () => {
    const result = diff([{ id: "vanished", value: "v" }], [], { onMissingServerRow: "add" })
    expect(result.added).toEqual([{ tempId: "vanished", value: "v" }])
  })

  it("isServerRowEligible gates BOTH modified detection and deletion", () => {
    const result = diff(
      [
        { id: "draft-row", value: "edited" }, // matches DRAFT server → modified
        { id: "locked-row", value: "edited" }, // matches non-DRAFT server → skipped
      ],
      [
        { id: "draft-row", value: "orig", status: "DRAFT" },
        { id: "locked-row", value: "orig", status: "QUEUED" },
        { id: "draft-gone", value: "orig", status: "DRAFT" }, // eligible + absent → deleted
        { id: "locked-gone", value: "orig", status: "IMPORTED" }, // ineligible + absent → NOT deleted
      ],
      { isServerRowEligible: (s) => s.status === "DRAFT" },
    )

    expect(result.modified).toEqual([{ id: "draft-row", value: "edited" }])
    expect(result.deleted).toEqual([{ id: "draft-gone" }])
  })

  it("toAdded carries extra fields beyond {tempId, form} (imports staged productId)", () => {
    const result = buildRowDiff<Local, Server, { tempId: string; productId: string }, never>({
      locals: [{ id: "temp:9", value: "v", extra: "prod-42" }],
      serverRows: [],
      getLocalId: (l) => l.id,
      isLocalOnly,
      differs: () => false,
      toAdded: (l) => ({ tempId: l.id, productId: l.extra ?? "" }),
      toModified: () => {
        throw new Error("unreachable")
      },
    })

    expect(result.added).toEqual([{ tempId: "temp:9", productId: "prod-42" }])
  })
})
