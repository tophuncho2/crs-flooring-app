// @vitest-environment jsdom

import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import type { EntityTypeRef } from "@builders/domain"
import { EntityTypeSelect } from "@/modules/entity-types/components/picker/entity-type-select"

function ref(id: string, type: string, color: EntityTypeRef["color"]): EntityTypeRef {
  return { id, type, color }
}

describe("EntityTypeSelect — read-only chip", () => {
  it("renders the seeded type as a single chip", () => {
    const { container } = render(
      <EntityTypeSelect value="t1" seedRef={ref("t1", "Landlord", "BLUE")} editable={false} />,
    )
    expect(container.textContent).toBe("Landlord")
  })

  it("renders a dash when unassigned", () => {
    const { container } = render(
      <EntityTypeSelect value={null} seedRef={null} editable={false} />,
    )
    expect(container.textContent).toBe("—")
  })

  it("renders a dash when the seed does not match the value", () => {
    const { container } = render(
      <EntityTypeSelect value="t1" seedRef={ref("other", "Vendor", "GREEN")} editable={false} />,
    )
    expect(container.textContent).toBe("—")
  })
})
