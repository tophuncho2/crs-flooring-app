// @vitest-environment jsdom

import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ServiceItemsEditor, type ServiceItemDraft } from "@/features/flooring/shared/service-items-editor"

function ServiceItemsHarness({
  draftErrors = {},
  onAdd = async () => false,
}: {
  draftErrors?: { name?: string; unitId?: string; quantity?: string; unitPrice?: string }
  onAdd?: () => Promise<boolean>
}) {
  const [draft, setDraft] = React.useState<ServiceItemDraft>({
    serviceId: "",
    name: "",
    unitId: "",
    quantity: "",
    unitPrice: "",
    notes: "",
  })

  return (
    <ServiceItemsEditor
      title="Service Items"
      description="Service rows"
      items={[]}
      draft={draft}
      serviceOptions={[{ id: "svc-1", name: "Removal", baseCost: "10.00", unitId: "unit-1", unitName: "EA" }]}
      unitOptions={[{ id: "unit-1", name: "EA" }]}
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

describe("ServiceItemsEditor", () => {
  it("keeps the inline add row open when add fails", async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn(async () => false)

    render(<ServiceItemsHarness onAdd={onAdd} />)

    await user.click(screen.getByRole("button", { name: "Add Service Items" }))
    await user.click(screen.getByRole("button", { name: "Add" }))

    expect(onAdd).toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Add" })).toBeTruthy()
  })

  it("renders shared draft field errors inline", async () => {
    const user = userEvent.setup()

    render(<ServiceItemsHarness draftErrors={{ name: "Enter a service name or select a service.", unitId: "Select a unit.", quantity: "Enter a quantity." }} />)

    await user.click(screen.getByRole("button", { name: "Add Service Items" }))

    expect(screen.getByText("Enter a service name or select a service.")).toBeTruthy()
    expect(screen.getByText("Select a unit.")).toBeTruthy()
    expect(screen.getByText("Enter a quantity.")).toBeTruthy()
  })

  it("limits quantity and unit price inputs to two decimals while typing", async () => {
    const user = userEvent.setup()

    render(<ServiceItemsHarness />)

    await user.click(screen.getByRole("button", { name: "Add Service Items" }))

    const textboxes = screen.getAllByRole("textbox")
    const quantityInput = textboxes[1] as HTMLInputElement
    const unitPriceInput = textboxes[2] as HTMLInputElement

    await user.type(quantityInput, "3.456")
    expect(quantityInput.value).toBe("3.45")

    await user.type(unitPriceInput, "17.899")
    expect(unitPriceInput.value).toBe("17.89")
  })
})
