// @vitest-environment jsdom

import React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SalesRepItemsEditor, type SalesRepDraft } from "@/features/flooring/shared/ui/record-items/sales-rep-items-editor"

afterEach(() => {
  cleanup()
})

function SalesRepItemsHarness() {
  const [draft, setDraft] = React.useState<SalesRepDraft>({
    contactId: "",
    percent: "",
  })

  return (
    <SalesRepItemsEditor
      title="Sales Reps"
      items={[]}
      draft={draft}
      salesRepOptions={[{ id: "contact-1", name: "Jordan Case" }]}
      customerCost={500}
      totalAmount={62.5}
      loading={false}
      adding={false}
      savingItemId={null}
      deletingItemId={null}
      draftErrors={{}}
      itemErrors={{}}
      onDraftChange={(field, value) => setDraft((previous) => ({ ...previous, [field]: value }))}
      onAdd={async () => false}
      onItemFieldChange={vi.fn()}
      onSaveItem={vi.fn()}
      onDeleteItem={vi.fn()}
    />
  )
}

describe("SalesRepItemsEditor", () => {
  it("renders the table total next to the shared section title", () => {
    render(<SalesRepItemsHarness />)

    expect(screen.getByText("$62.50")).toBeTruthy()
  })

  it("limits percent inputs to two decimals while typing", async () => {
    const user = userEvent.setup()

    render(<SalesRepItemsHarness />)
    await user.click(screen.getByRole("button", { name: "Add Sales Reps" }))

    const textboxes = screen.getAllByRole("textbox")
    const percentInput = textboxes[0] as HTMLInputElement

    await user.type(percentInput, "12.345")
    expect(percentInput.value).toBe("12.34")
  })
})
