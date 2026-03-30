// @vitest-environment jsdom

import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  CurrencyCell,
  RecordDetailClientScaffold,
  RecordGridCellInput,
  RecordSectionSubHeader,
  RecordSingleSectionPanel,
  RecordSectionShell,
  useRecordPageController,
  useSingleSectionRecordController,
} from "@/features/shared/engines/record-view"

function renderSingleSectionHarness() {
  const saveSection = vi.fn().mockImplementation(async ({ localValue }) => ({
    id: "rec-1",
    updatedAt: "2026-03-20T00:00:00.000Z",
    name: localValue.name,
  }))

  function Harness() {
    const page = useRecordPageController({
      backHref: "/dashboard/test",
      dirtyMessage: "Unsaved changes",
    })
    const controller = useSingleSectionRecordController<
      { id: string; updatedAt: string; name: string },
      { name: string }
    >({
      page,
      scope: "test-record",
      id: "rec-1",
      initialRecord: {
        id: "rec-1",
        updatedAt: "2026-03-19T00:00:00.000Z",
        name: "Original",
      },
      detailUrl: "/api/test/rec-1",
      payloadKey: "record",
      createLocalValue: (record) => ({ name: record.name }),
      saveSection,
    })

    return (
      <div>
        <button
          type="button"
          onClick={() => controller.primarySection.setLocalValue({ name: "Updated" })}
        >
          Change
        </button>
        <button type="button" onClick={() => void controller.primarySection.save()}>
          Save
        </button>
        <button type="button" onClick={() => controller.primarySection.discard()}>
          Discard
        </button>
        <div data-testid="record-name">{controller.record.name}</div>
        <div data-testid="draft-name">{controller.primarySection.localValue.name}</div>
        <div data-testid="dirty">{String(controller.primarySection.isDirty)}</div>
        <div data-testid="dirty-sections">{page.dirtySections.join(",")}</div>
      </div>
    )
  }

  return { saveSection, ...render(<Harness />) }
}

describe("record view single-section engine", () => {
  it("single-section controller owns dirty, discard, and authoritative reseed", async () => {
    const user = userEvent.setup()
    const { saveSection } = renderSingleSectionHarness()

    expect(screen.getByTestId("record-name").textContent).toBe("Original")
    expect(screen.getByTestId("dirty").textContent).toBe("false")

    await user.click(screen.getByRole("button", { name: "Change" }))
    expect(screen.getByTestId("draft-name").textContent).toBe("Updated")
    expect(screen.getByTestId("dirty").textContent).toBe("true")
    expect(screen.getByTestId("dirty-sections").textContent).toBe("primary")

    await user.click(screen.getByRole("button", { name: "Discard" }))
    expect(screen.getByTestId("draft-name").textContent).toBe("Original")
    expect(screen.getByTestId("dirty").textContent).toBe("false")

    await user.click(screen.getByRole("button", { name: "Change" }))
    await user.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(saveSection).toHaveBeenCalledTimes(1)
      expect(screen.getByTestId("record-name").textContent).toBe("Updated")
      expect(screen.getByTestId("dirty").textContent).toBe("false")
    })
  })

  it("single-section panel renders section-local errors through the shared engine surface", () => {
    render(
      <RecordSingleSectionPanel
        title="Primary"
        controller={{
          primarySection: {
            isDirty: true,
            isSaving: false,
            hasConflict: false,
            error: {
              kind: "validation",
              message: "Name is required",
            },
            save: vi.fn(),
            discard: vi.fn(),
          },
        }}
        showHeader={false}
      >
        <div>Fields</div>
      </RecordSingleSectionPanel>,
    )

    expect(screen.getByText("Fix required")).toBeTruthy()
    expect(screen.getByText("Name is required")).toBeTruthy()
  })

  it("record detail scaffold uses the page header as the governing header for single-section panels", async () => {
    const user = userEvent.setup()

    render(
      <RecordDetailClientScaffold
        title="Category Carpet"
        backHref="/dashboard/flooring/categories"
        dirtyMessage="Unsaved changes"
        headerVariant="section"
      >
        {(page) => (
          <RecordSingleSectionPanel
            title="Category Details"
            controller={{
              page,
              primarySection: {
                isDirty: false,
                isSaving: false,
                hasConflict: false,
                error: null,
                save: vi.fn(),
                discard: vi.fn(),
              },
            }}
            showHeader={false}
          >
            <div>Single Section Fields</div>
          </RecordSingleSectionPanel>
        )}
      </RecordDetailClientScaffold>,
    )

    expect(screen.getAllByText("Category Carpet")).toHaveLength(1)
    expect(screen.getByText("Single Section Fields")).toBeTruthy()

    await user.click(screen.getByRole("button", { name: "Collapse Category Carpet" }))
    expect(screen.queryByText("Single Section Fields")).toBeNull()

    await user.click(screen.getByRole("button", { name: "Expand Category Carpet" }))
    expect(screen.getByText("Single Section Fields")).toBeTruthy()
  })

  it("section sub-header renders canonical status and configured actions from engine state", async () => {
    const user = userEvent.setup()
    const save = vi.fn()
    const discard = vi.fn()
    const refresh = vi.fn()

    const { container } = render(
      <RecordSectionSubHeader
        isDirty
        isSaving={false}
        hasConflict
        onSave={save}
        onDiscard={discard}
        actions={[{ key: "refresh", label: "Refresh", onClick: refresh }]}
      />,
    )
    const scoped = within(container)

    expect(scoped.getAllByText("Dirty").length).toBeGreaterThan(0)
    expect(scoped.getByText("Conflict")).toBeTruthy()
    expect(scoped.getByRole("button", { name: "Refresh" })).toBeTruthy()
    expect(scoped.getByRole("button", { name: "Discard" })).toBeTruthy()
    expect(scoped.getByRole("button", { name: "Save" })).toBeTruthy()

    await user.click(scoped.getByRole("button", { name: "Refresh" }))
    await user.click(scoped.getByRole("button", { name: "Discard" }))
    await user.click(scoped.getByRole("button", { name: "Save" }))

    expect(refresh).toHaveBeenCalledTimes(1)
    expect(discard).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it("section shell wraps metrics in the engine-owned responsive metrics group", () => {
    const { container } = render(
      <RecordSectionShell title="Materials" metrics={[{ label: "Items", value: "4" }]}>
        <div>Rows</div>
      </RecordSectionShell>,
    )

    const metricsGroup = container.querySelector(".hidden.md\\:flex")
    expect(metricsGroup).toBeTruthy()
    expect(screen.getByText("Items")).toBeTruthy()
    expect(screen.getByText("4")).toBeTruthy()
  })

  it("grid cell controls and currency cells use canonical engine chrome", () => {
    const { container } = render(
      <div>
        <RecordGridCellInput value="12.5" readOnly controlSize="compact" align="right" />
        <CurrencyCell value="1.50" unit="sqft" />
      </div>,
    )

    const input = container.querySelector("input")
    expect(input?.className).toContain("border-sky-500/35")
    expect(screen.getByText("$")).toBeTruthy()
    expect(screen.getByText("/ sqft")).toBeTruthy()
  })
})
