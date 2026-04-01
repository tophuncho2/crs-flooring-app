// @vitest-environment jsdom

import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  RecordCalculationSection,
  CurrencyCell,
  RecordDetailClientScaffold,
  RecordGridCellInput,
  RecordItemCell,
  RecordItemSectionControls,
  RecordMultiSectionPanel,
  RecordPageActionNotices,
  RecordSectionGrid,
  RecordSectionGridRow,
  RecordRowLayout,
  RecordRowToggleButton,
  RecordSectionSubHeader,
  RecordSingleSectionPanel,
  RecordSectionShell,
  formatRecordCalculationValue,
  getGenericRecordRowStatus,
  getRecordAllocationStateStatus,
  resolveRecordRowStatus,
  useRecordPageController,
  useRecordScopedSectionController,
  useSingleSectionRecordController,
} from "@/modules/shared/engines/record-view"
import * as RecordViewEngine from "@/modules/shared/engines/record-view"

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

function renderScopedSectionHarness() {
  const saveSection = vi.fn().mockImplementation(async ({ name }: { name: string }) => ({
    serverValue: {
      id: "rec-1",
      updatedAt: "2026-03-21T00:00:00.000Z",
      name,
    },
    serverRevisionKey: "2026-03-21T00:00:00.000Z",
    noticeMessage: "Scoped section saved",
  }))

  function Harness() {
    const [serverValue, setServerValue] = React.useState({
      id: "rec-1",
      updatedAt: "2026-03-20T00:00:00.000Z",
      name: "Original",
    })
    const [serverRevisionKey, setServerRevisionKey] = React.useState("2026-03-20T00:00:00.000Z")
    const controller = useRecordScopedSectionController<
      { id: string; updatedAt: string; name: string },
      { name: string }
    >({
      currentUserId: "user-1",
      recordId: "rec-1",
      sectionKey: "primary",
      serverValue,
      serverRevisionKey,
      createLocalValue: (record) => ({ name: record.name }),
      cloneLocalValue: (value) => ({ ...value }),
      onSave: async (localValue) => {
        const saveResult = await saveSection(localValue)

        if (saveResult && typeof saveResult === "object" && "serverValue" in saveResult) {
          setServerValue(saveResult.serverValue)
          setServerRevisionKey(saveResult.serverRevisionKey ?? saveResult.serverValue.updatedAt)
        }

        return saveResult
      },
      persistDraft: false,
      policy: {
        addRowPlacement: "bottom",
        childRows: "inline",
      },
    })

    return (
      <div>
        <button
          type="button"
          onClick={() => controller.setLocalValue({ name: "Scoped Updated" })}
        >
          Change Scoped
        </button>
        <button type="button" onClick={() => void controller.save()}>
          Save Scoped
        </button>
        <button type="button" onClick={() => controller.discard()}>
          Discard Scoped
        </button>
        <div data-testid="scoped-name">{controller.localValue.name}</div>
        <div data-testid="scoped-dirty">{String(controller.isDirty)}</div>
        <div data-testid="scoped-notice">{controller.noticeMessage}</div>
        <div data-testid="scoped-placement">{controller.policy.addRowPlacement}</div>
        <div data-testid="scoped-child-rows">{controller.policy.childRows}</div>
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

  it("record-scoped section controller is the canonical section save/discard runtime", async () => {
    const user = userEvent.setup()
    const { saveSection } = renderScopedSectionHarness()

    expect(screen.getByTestId("scoped-name").textContent).toBe("Original")
    expect(screen.getByTestId("scoped-dirty").textContent).toBe("false")
    expect(screen.getByTestId("scoped-placement").textContent).toBe("bottom")
    expect(screen.getByTestId("scoped-child-rows").textContent).toBe("inline")

    await user.click(screen.getByRole("button", { name: "Change Scoped" }))
    expect(screen.getByTestId("scoped-name").textContent).toBe("Scoped Updated")
    expect(screen.getByTestId("scoped-dirty").textContent).toBe("true")

    await user.click(screen.getByRole("button", { name: "Discard Scoped" }))
    expect(screen.getByTestId("scoped-name").textContent).toBe("Original")
    expect(screen.getByTestId("scoped-dirty").textContent).toBe("false")

    await user.click(screen.getByRole("button", { name: "Change Scoped" }))
    await user.click(screen.getByRole("button", { name: "Save Scoped" }))

    await waitFor(() => {
      expect(saveSection).toHaveBeenCalledTimes(1)
      expect(screen.getByTestId("scoped-name").textContent).toBe("Scoped Updated")
      expect(screen.getByTestId("scoped-dirty").textContent).toBe("false")
      expect(screen.getByTestId("scoped-notice").textContent).toBe("Scoped section saved")
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
        backHref="/dashboard/categories"
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

  it("multi-section panel config governs ordering, visibility, dirty aggregation, and generic summary payloads", async () => {
    const user = userEvent.setup()

    function Harness() {
      const page = useRecordPageController({
        backHref: "/dashboard/test",
        dirtyMessage: "Unsaved changes",
      })
      const [showSecondary, setShowSecondary] = React.useState(true)
      const summary = React.useMemo(
        () => ({
          metrics: [{ key: "rows", label: "Rows", value: "3" }],
          payload: { kind: "custom-summary", total: 3 },
        }),
        [],
      )
      const sections = React.useMemo(
        () => [
          {
            key: "secondary",
            type: "item" as const,
            order: 20,
            dirtyLabel: "Secondary Grid",
            controller: { isDirty: true, isSaving: false, hasConflict: false },
            visibleWhen: () => showSecondary,
            render: () => <div data-testid="section-row">Secondary Section</div>,
          },
          {
            key: "primary",
            type: "field" as const,
            order: 10,
            slot: "primary" as const,
            controller: { isDirty: false, isSaving: false, hasConflict: false },
            render: () => <div data-testid="section-row">Primary Section</div>,
          },
        ],
        [showSecondary],
      )

      return (
        <div>
          <button type="button" onClick={() => setShowSecondary((current) => !current)}>
            Toggle Secondary
          </button>
          <RecordMultiSectionPanel
            page={page}
            summary={summary}
            sections={sections}
          />
          <div data-testid="panel-dirty">{page.dirtySections.join(",")}</div>
          <div data-testid="panel-summary">
            {page.summary.metrics?.map((metric) => `${metric.label}:${metric.value}`).join("|")}
          </div>
          <div data-testid="panel-payload">{JSON.stringify(page.summary.payload)}</div>
        </div>
      )
    }

    const { container } = render(<Harness />)

    expect(screen.getAllByTestId("section-row").map((node) => node.textContent)).toEqual([
      "Primary Section",
      "Secondary Section",
    ])
    expect(screen.getByTestId("panel-dirty").textContent).toBe("Secondary Grid")
    expect(screen.getByTestId("panel-summary").textContent).toBe("Rows:3")
    expect(screen.getByTestId("panel-payload").textContent).toBe(
      JSON.stringify({ kind: "custom-summary", total: 3 }),
    )
    expect(container.textContent?.indexOf("Primary Section")).toBeLessThan(
      container.textContent?.indexOf("Secondary Section") ?? Number.POSITIVE_INFINITY,
    )

    await user.click(screen.getByRole("button", { name: "Toggle Secondary" }))
    expect(screen.queryByText("Secondary Section")).toBeNull()
    expect(screen.getByText("Primary Section")).toBeTruthy()
  })

  it("multi-section panel sync stays idempotent when rerenders recreate summary and dirty inputs", async () => {
    const user = userEvent.setup()

    function Harness() {
      const page = useRecordPageController({
        backHref: "/dashboard/test",
        dirtyMessage: "Unsaved changes",
      })
      const [tick, setTick] = React.useState(0)
      const renderCount = React.useRef(0)
      renderCount.current += 1

      return (
        <div>
          <button type="button" onClick={() => setTick((current) => current + 1)}>
            Rerender
          </button>
          <RecordMultiSectionPanel
            page={page}
            summary={{
              metrics: [{ key: "rows", label: "Rows", value: "3" }],
              payload: "stable-payload",
            }}
            sections={[
              {
                key: "primary",
                type: "field" as const,
                order: 10,
                slot: "primary" as const,
                controller: { isDirty: false, isSaving: false, hasConflict: false },
                render: () => <div>Primary Section</div>,
              },
              {
                key: "items",
                type: "item" as const,
                order: 20,
                dirtyLabel: "Items",
                controller: { isDirty: true, isSaving: false, hasConflict: false },
                render: () => <div>{`Items ${tick}`}</div>,
              },
            ]}
          />
          <div data-testid="rerender-count">{String(renderCount.current)}</div>
          <div data-testid="rerender-dirty">{page.dirtySections.join(",")}</div>
          <div data-testid="rerender-summary">
            {page.summary.metrics?.map((metric) => `${metric.label}:${metric.value}`).join("|")}
          </div>
        </div>
      )
    }

    render(<Harness />)

    expect(screen.getByTestId("rerender-dirty").textContent).toBe("Items")
    expect(screen.getByTestId("rerender-summary").textContent).toBe("Rows:3")

    await user.click(screen.getByRole("button", { name: "Rerender" }))

    expect(screen.getByText("Items 1")).toBeTruthy()
    expect(screen.getByTestId("rerender-dirty").textContent).toBe("Items")
    expect(screen.getByTestId("rerender-summary").textContent).toBe("Rows:3")
    expect(Number(screen.getByTestId("rerender-count").textContent ?? "0")).toBeLessThan(8)
  })

  it("section shell reports open-state changes after toggle, not during render", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    render(
      <RecordSectionShell title="Invoice" defaultOpen={false} onOpenChange={onOpenChange}>
        <div>Body</div>
      </RecordSectionShell>,
    )

    expect(onOpenChange).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Expand Invoice" }))
    expect(onOpenChange).toHaveBeenNthCalledWith(1, true)

    await user.click(screen.getByRole("button", { name: "Collapse Invoice" }))
    expect(onOpenChange).toHaveBeenNthCalledWith(2, false)
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

  it("row toggle buttons are canonical and do not bubble into row-open navigation", async () => {
    const user = userEvent.setup()
    const openItem = vi.fn()
    const openAllocation = vi.fn()
    const toggle = vi.fn()

    render(
      <RecordSectionGrid columns={[{ key: "toggle", minWidth: 140 }, { key: "open", minWidth: 140 }]}>
        <RecordSectionGridRow
          columns={[{ key: "toggle", minWidth: 140 }, { key: "open", minWidth: 140 }]}
          onOpen={openItem}
          openAriaLabel="Open property Oak"
          scopedContent={(
            <RecordSectionGrid columns={[{ key: "allocation", minWidth: 180 }]} surface="scoped">
              <RecordSectionGridRow
                columns={[{ key: "allocation", minWidth: 180 }]}
                onOpen={openAllocation}
                openAriaLabel="Open template T-100"
                rowTone="allocation"
              >
                <RecordRowLayout columns={[{ key: "allocation", minWidth: 180 }]}>
                  <RecordItemCell columnKey="allocation" chrome="grid" tone="allocation">
                    Template Row
                  </RecordItemCell>
                </RecordRowLayout>
              </RecordSectionGridRow>
            </RecordSectionGrid>
          )}
        >
          <RecordRowLayout columns={[{ key: "toggle", minWidth: 140 }, { key: "open", minWidth: 140 }]}>
            <RecordItemCell label="Show / Hide" columnKey="toggle" chrome="grid">
              <RecordRowToggleButton expanded={false} onToggle={toggle} ariaLabel="Show templates for Oak" />
            </RecordItemCell>
            <RecordItemCell label="Open" columnKey="open" chrome="grid">
              <span>Open</span>
            </RecordItemCell>
          </RecordRowLayout>
        </RecordSectionGridRow>
      </RecordSectionGrid>,
    )

    await user.click(screen.getByRole("button", { name: "Show templates for Oak" }))
    expect(toggle).toHaveBeenCalledTimes(1)
    expect(openItem).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Open property Oak" }))
    expect(openItem).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole("button", { name: "Open template T-100" }))
    expect(openAllocation).toHaveBeenCalledTimes(1)
  })

  it("item-section controls only render enabled canonical row control columns", () => {
    render(
      <RecordRowLayout
        columns={[
          { key: "toggle", minWidth: 120 },
          { key: "open", minWidth: 108 },
          { key: "status", minWidth: 120 },
          { key: "remove", minWidth: 108 },
        ]}
      >
        <RecordItemSectionControls
          capabilities={{
            supportsScopedRows: true,
            supportsOpenRow: false,
            supportsStatusColumn: true,
            supportsRemoveRow: false,
          }}
          toggle={{
            expanded: false,
            onToggle: vi.fn(),
            ariaLabel: "Show allocations",
          }}
          open={{
            onOpen: vi.fn(),
          }}
          status={{
            content: <span>Ready</span>,
          }}
          remove={{
            onRemove: vi.fn(),
          }}
        />
      </RecordRowLayout>,
    )

    expect(screen.getByLabelText("Show allocations")).toBeTruthy()
    expect(screen.getByText("Ready")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Open" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Remove" })).toBeNull()
  })

  it("calculation sections use the canonical read-only section framing", () => {
    const { container } = render(
      <RecordCalculationSection
        title="Calculations"
        items={[{ key: "subtotal", label: "Subtotal", value: "$12.00" }]}
        loading={false}
        metrics={[{ label: "Rows", value: "1" }]}
        columns={[
          { key: "name", minWidth: 180 },
          { key: "value", minWidth: 120, align: "end" },
        ]}
        renderItem={(item) => (
          <RecordRowLayout
            columns={[
              { key: "name", minWidth: 180 },
              { key: "value", minWidth: 120, align: "end" },
            ]}
          >
            <RecordItemCell label="Calculation" columnKey="name">
              {item.label}
            </RecordItemCell>
            <RecordItemCell label="Value" columnKey="value">
              {item.value}
            </RecordItemCell>
          </RecordRowLayout>
        )}
      />,
    )

    const scoped = within(container)
    expect(screen.getByText("Calculations")).toBeTruthy()
    expect(screen.getByText("Subtotal")).toBeTruthy()
    expect(screen.getByText("$12.00")).toBeTruthy()
    expect(scoped.queryByRole("button", { name: "Save" })).toBeNull()
  })

  it("record page action notices are separate from section notices", () => {
    render(
      <RecordPageActionNotices message="Delete failed" error="">
        <div>Workflow retry required</div>
      </RecordPageActionNotices>,
    )

    expect(screen.getByText("Delete failed")).toBeTruthy()
    expect(screen.getByText("Workflow retry required")).toBeTruthy()
  })

  it("row status adapters resolve generic and allocation states through the engine", () => {
    expect(getGenericRecordRowStatus("unsaved")).toEqual({
      key: "unsaved",
      label: "Unsaved",
      tone: "warning",
    })

    expect(getRecordAllocationStateStatus("PARTIALLY_ALLOCATED")).toEqual({
      key: "allocation-partial",
      label: "Partially Allocated",
      tone: "warning",
    })

    expect(
      resolveRecordRowStatus({
        isUnsaved: true,
        override: {
          key: "custom",
          label: "Custom",
          tone: "success",
        },
      }),
    ).toEqual({
      key: "unsaved",
      label: "Unsaved",
      tone: "warning",
    })

    expect(
      resolveRecordRowStatus({
        fallback: {
          key: "custom-ready",
          label: "Custom Ready",
          tone: "success",
        },
      }),
    ).toEqual({
      key: "custom-ready",
      label: "Custom Ready",
      tone: "success",
    })
  })

  it("calculation format adapter is canonical for currency, percentage, and unitized values", () => {
    expect(formatRecordCalculationValue({ value: 12.5, format: "currency" })).toBe("$12.50")
    expect(formatRecordCalculationValue({ value: 0.125, format: "percentage" })).toBe("12.50%")
    expect(
      formatRecordCalculationValue({
        value: 42,
        format: "unitized",
        unitLabel: "sqft",
      }),
    ).toBe("42 sqft")
    expect(
      formatRecordCalculationValue({
        value: 3.5,
        format: "unitized-total",
        unitLabel: "sqft",
      }),
    ).toBe("$3.50 / sqft")
  })

  it("old row surfaces are not public engine exports", () => {
    expect("RecordAllocationItemsPanel" in RecordViewEngine).toBe(false)
    expect("RecordAllocationItemRow" in RecordViewEngine).toBe(false)
    expect("RecordSectionGridHeader" in RecordViewEngine).toBe(false)
  })
})
