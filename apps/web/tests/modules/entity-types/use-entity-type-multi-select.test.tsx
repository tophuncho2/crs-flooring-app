// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import type { EntityTypeOption, EntityTypeRef } from "@builders/domain"
import type { PickerListOption } from "@/engines/picker"

// Isolate the chip logic from the async options fetch: the hook only ever reads
// `controller.options` (for the add-list), which this test never exercises, so a
// stub controller keeps the test off react-query and on the seedRefs/refCache path.
vi.mock("@/engines/picker", () => ({
  useAsyncRichDropdownController: () => ({ options: [] }),
}))

import { useEntityTypeMultiSelect } from "@/modules/entity-types/components/picker/use-entity-type-multi-select"

function ref(id: string, type: string, color: EntityTypeRef["color"]): EntityTypeRef {
  return { id, type, color }
}

describe("useEntityTypeMultiSelect — chips", () => {
  it("labels chips from the seeded refs", () => {
    const seedRefs = [ref("t1", "Landlord", "BLUE")]
    const { result } = renderHook(() =>
      useEntityTypeMultiSelect({ selectedIds: ["t1"], seedRefs, enabled: false }),
    )

    expect(result.current.chips).toEqual([{ id: "t1", label: "Landlord", color: "BLUE" }])
  })

  it("re-syncs chip labels when seedRefs + selectedIds change (re-select bug)", () => {
    const { result, rerender } = renderHook(
      ({ selectedIds, seedRefs }) =>
        useEntityTypeMultiSelect({ selectedIds, seedRefs, enabled: false }),
      {
        initialProps: {
          selectedIds: ["t1"],
          seedRefs: [ref("t1", "Landlord", "BLUE")],
        },
      },
    )

    expect(result.current.chips).toEqual([{ id: "t1", label: "Landlord", color: "BLUE" }])

    // Re-select a different entity: brand-new ids + refs handed down via props.
    // Before the fix these resolved against the mount-seeded refCache only and
    // fell back to "—"; now they resolve against the live seedMap.
    rerender({
      selectedIds: ["t2", "t3"],
      seedRefs: [ref("t2", "Vendor", "GREEN"), ref("t3", "Owner", "AMBER")],
    })

    expect(result.current.chips).toEqual([
      { id: "t2", label: "Vendor", color: "GREEN" },
      { id: "t3", label: "Owner", color: "AMBER" },
    ])
  })

  it("keeps labelling a user-picked ref not present in seedRefs (refCache-first)", () => {
    const onChange = vi.fn()
    const { result, rerender } = renderHook(
      ({ selectedIds }) =>
        useEntityTypeMultiSelect({ selectedIds, seedRefs: [], onChange, enabled: false }),
      { initialProps: { selectedIds: [] as string[] } },
    )

    const picked: EntityTypeOption = { id: "t9", type: "Contractor", color: "ROSE" }
    // Picking caches the ref and asks the parent to add the id...
    act(() => result.current.handleSelect({ id: "t9" } as PickerListOption, picked))
    expect(onChange).toHaveBeenCalledWith(["t9"])

    // ...and once the parent echoes the selection back, the chip labels from the
    // cached pick even though seedRefs never carried it.
    rerender({ selectedIds: ["t9"] })
    expect(result.current.chips).toEqual([{ id: "t9", label: "Contractor", color: "ROSE" }])
  })

  it("falls back to a dash when an id has no known ref", () => {
    const { result } = renderHook(() =>
      useEntityTypeMultiSelect({ selectedIds: ["ghost"], seedRefs: [], enabled: false }),
    )

    expect(result.current.chips).toEqual([{ id: "ghost", label: "—", color: undefined }])
  })
})
