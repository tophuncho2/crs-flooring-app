// @vitest-environment jsdom

import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MaterialItemsEditor, type MaterialItemDraft } from "@/features/flooring/shared/material-items-editor"

function MaterialItemsHarness({
  draftErrors = {},
  onAdd = async () => false,
}: {
  draftErrors?: { productId?: string; quantity?: string }
  onAdd?: () => Promise<boolean>
}) {
  const [draft, setDraft] = React.useState<MaterialItemDraft>({
    productId: "",
    quantity: "",
    unitPrice: "",
    notes: "",
  })

  return (
    <MaterialItemsEditor
      title="Material Items"
      description="Material rows"
      items={[]}
      draft={draft}
      productOptions={[{ id: "prod-1", label: "Test Product", sendUnit: "SY" }]}
      loading={false}
      adding={false}
      savingItemId={null}
      deletingItemId={null}
      draftErrors={draftErrors}
      itemErrors={{}}
      onDraftChange={(field, value) => setDraft((previous) => ({ ...previous, [field]: value }))}
      onAdd={onAdd}
      onItemFieldChange={vi.fn()}
      onDeleteItem={vi.fn()}
      onSaveItem={vi.fn()}
    />
  )
}

describe("MaterialItemsEditor", () => {
  it("keeps the inline add row open when add fails", async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn(async () => false)

    render(<MaterialItemsHarness onAdd={onAdd} />)

    await user.click(screen.getByRole("button", { name: "Add Material Items" }))
    await user.click(screen.getByRole("button", { name: "Add" }))

    expect(onAdd).toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Add" })).toBeTruthy()
  })

  it("renders shared draft field errors inline", async () => {
    const user = userEvent.setup()

    render(<MaterialItemsHarness draftErrors={{ productId: "Select a product.", quantity: "Enter a quantity." }} />)

    await user.click(screen.getByRole("button", { name: "Add Material Items" }))

    expect(screen.getByText("Select a product.")).toBeTruthy()
    expect(screen.getByText("Enter a quantity.")).toBeTruthy()
  })
})
