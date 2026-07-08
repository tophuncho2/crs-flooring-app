// @vitest-environment jsdom

import { afterEach, describe, it, expect, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DataTable, type DataTableColumn } from "@/engines/list-view"

type Row = { id: string; name: string; status: string }

const COLUMNS: ReadonlyArray<DataTableColumn<Row>> = [
  { key: "name", label: "Name" },
  { key: "status", label: "Status" },
]

const ROWS: ReadonlyArray<Row> = [
  { id: "a", name: "Alpha", status: "OPEN" },
  { id: "b", name: "Bravo", status: "CLOSED" },
]

describe("DataTable", () => {
  afterEach(() => cleanup())

  it("renders a header per column and a default cell per row value", () => {
    const { getByRole, getByText } = render(<DataTable rows={ROWS} columns={COLUMNS} />)
    expect(getByRole("columnheader", { name: "Name" })).toBeTruthy()
    expect(getByRole("columnheader", { name: "Status" })).toBeTruthy()
    expect(getByText("Alpha")).toBeTruthy()
    expect(getByText("CLOSED")).toBeTruthy()
  })

  it("renders a dash for empty/null cell values", () => {
    const { getByText } = render(
      <DataTable rows={[{ id: "a", name: "", status: "OPEN" }]} columns={COLUMNS} />,
    )
    expect(getByText("-")).toBeTruthy()
  })

  it("renders the empty slot when there are no rows", () => {
    const { getByText } = render(
      <DataTable rows={[]} columns={COLUMNS} empty="Nothing here" />,
    )
    expect(getByText("Nothing here")).toBeTruthy()
  })

  it("prefers column.render over the default cell", () => {
    const columns: ReadonlyArray<DataTableColumn<Row>> = [
      { key: "name", label: "Name", render: (row) => `→ ${row.name}` },
      { key: "status", label: "Status" },
    ]
    const { getByText } = render(<DataTable rows={ROWS} columns={columns} />)
    expect(getByText("→ Alpha")).toBeTruthy()
  })

  it("lets renderCell override every cell", () => {
    const { getAllByText } = render(
      <DataTable rows={ROWS} columns={COLUMNS} renderCell={() => "X"} />,
    )
    // 2 rows × 2 columns
    expect(getAllByText("X")).toHaveLength(4)
  })

  it("makes rows interactive and fires onRowClick on click", async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    const { getAllByRole } = render(
      <DataTable rows={ROWS} columns={COLUMNS} onRowClick={onRowClick} />,
    )
    const rows = getAllByRole("button")
    await user.click(rows[0])
    expect(onRowClick).toHaveBeenCalledWith(ROWS[0])
  })

  it("fires onRowClick on Enter and Space", async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    const { getAllByRole } = render(
      <DataTable rows={ROWS} columns={COLUMNS} onRowClick={onRowClick} />,
    )
    const firstRow = getAllByRole("button")[0]
    firstRow.focus()
    await user.keyboard("{Enter}")
    await user.keyboard(" ")
    expect(onRowClick).toHaveBeenCalledTimes(2)
    expect(onRowClick).toHaveBeenNthCalledWith(1, ROWS[0])
    expect(onRowClick).toHaveBeenNthCalledWith(2, ROWS[0])
  })

  it("applies getRowAriaLabel to interactive rows", () => {
    const { getByRole } = render(
      <DataTable
        rows={ROWS}
        columns={COLUMNS}
        onRowClick={vi.fn()}
        getRowAriaLabel={(row) => `Open ${row.name}`}
      />,
    )
    expect(getByRole("button", { name: "Open Alpha" })).toBeTruthy()
  })

  it("renders non-interactive rows (no button role) without onRowClick", () => {
    const { queryByRole } = render(<DataTable rows={ROWS} columns={COLUMNS} />)
    expect(queryByRole("button")).toBeNull()
  })
})

describe("DataTable — onOpenRow (leading open gutter)", () => {
  afterEach(() => cleanup())

  it("renders one leading open button per row that fires onOpenRow", async () => {
    const user = userEvent.setup()
    const onOpenRow = vi.fn()
    const { getAllByRole } = render(
      <DataTable
        rows={ROWS}
        columns={COLUMNS}
        onOpenRow={onOpenRow}
        getRowAriaLabel={(row) => `Open ${row.name}`}
      />,
    )
    // One gutter button per row — and the rows themselves are NOT buttons
    // (would be 2× this count if rows stayed interactive).
    const buttons = getAllByRole("button")
    expect(buttons).toHaveLength(ROWS.length)
    await user.click(buttons[0])
    expect(onOpenRow).toHaveBeenCalledWith(ROWS[0])
  })

  it("labels the open button via getRowAriaLabel", () => {
    const { getByRole } = render(
      <DataTable
        rows={ROWS}
        columns={COLUMNS}
        onOpenRow={vi.fn()}
        getRowAriaLabel={(row) => `Open ${row.name}`}
      />,
    )
    expect(getByRole("button", { name: "Open Alpha" })).toBeTruthy()
  })

  it("renders an Open gutter column header", () => {
    const { getByText } = render(
      <DataTable rows={ROWS} columns={COLUMNS} onOpenRow={vi.fn()} />,
    )
    expect(getByText("Open")).toBeTruthy()
  })
})

describe("DataTable — headers carry no sort affordance", () => {
  afterEach(() => cleanup())

  // The clickable header sort caret was removed in favor of the toolbar Sort
  // menu; `DataTableColumn.sortable` + the `sort`/`sorts`/`onSort` props no longer
  // exist, so a header can never render an interactive sort control.
  it("renders column headers as plain static labels (no sort control)", () => {
    const { getByText, queryByRole } = render(<DataTable rows={ROWS} columns={COLUMNS} />)
    expect(getByText("Name")).toBeTruthy()
    expect(queryByRole("button", { name: /Sort by/ })).toBeNull()
  })
})

describe("DataTable — gutter header", () => {
  afterEach(() => cleanup())

  it("renders no leading gutter header when onOpenRow/rowActions are both absent", () => {
    const { queryByRole } = render(<DataTable rows={ROWS} columns={COLUMNS} />)
    // No open affordance + no row actions ⇒ no leading gutter <th>.
    expect(queryByRole("button", { name: /^Open / })).toBeNull()
  })
})

describe("DataTable — always-visible selection", () => {
  afterEach(() => cleanup())

  function selectionProps(selectedIds: string[], overrides: Record<string, unknown> = {}) {
    return {
      selectedIds: new Set(selectedIds),
      onToggleRow: vi.fn(),
      onToggleAll: vi.fn(),
      onClear: vi.fn(),
      ...overrides,
    }
  }

  it("renders a header select-all checkbox when onToggleAll is provided", () => {
    const { getByLabelText } = render(
      <DataTable rows={ROWS} columns={COLUMNS} selection={selectionProps([])} />,
    )
    expect(getByLabelText("Select all on this page")).toBeTruthy()
  })

  it("checks the header select-all when every eligible row is selected", () => {
    const { getByLabelText } = render(
      <DataTable rows={ROWS} columns={COLUMNS} selection={selectionProps(["a", "b"])} />,
    )
    const header = getByLabelText("Clear all on this page") as HTMLInputElement
    expect(header.checked).toBe(true)
    expect(header.indeterminate).toBe(false)
  })

  it("shows the header select-all as indeterminate when only some rows are selected", () => {
    const { getByLabelText } = render(
      <DataTable rows={ROWS} columns={COLUMNS} selection={selectionProps(["a"])} />,
    )
    const header = getByLabelText("Select all on this page") as HTMLInputElement
    expect(header.checked).toBe(false)
    expect(header.indeterminate).toBe(true)
  })

  it("fires onToggleAll with the page's eligible ids", async () => {
    const user = userEvent.setup()
    const onToggleAll = vi.fn()
    const { getByLabelText } = render(
      <DataTable rows={ROWS} columns={COLUMNS} selection={selectionProps([], { onToggleAll })} />,
    )
    await user.click(getByLabelText("Select all on this page"))
    expect(onToggleAll).toHaveBeenCalledWith(["a", "b"])
  })

  it("renders the footer 'N selected · Clear' cluster only when rows are selected (fill tables)", async () => {
    const user = userEvent.setup()
    const onClear = vi.fn()
    const { getByText, getByRole, rerender, queryByText } = render(
      <DataTable fill rows={ROWS} columns={COLUMNS} selection={selectionProps([], { onClear })} />,
    )
    expect(queryByText(/selected/)).toBeNull()
    rerender(
      <DataTable fill rows={ROWS} columns={COLUMNS} selection={selectionProps(["a", "b"], { onClear })} />,
    )
    expect(getByText("2 selected")).toBeTruthy()
    await user.click(getByRole("button", { name: "Clear" }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it("does NOT render the footer selection cluster on non-fill (editable) tables", () => {
    // The editable record grids run their own selection cluster.
    const { queryByText } = render(
      <DataTable rows={ROWS} columns={COLUMNS} selection={selectionProps(["a", "b"])} />,
    )
    expect(queryByText("2 selected")).toBeNull()
  })
})

describe("DataTable — editable variant", () => {
  afterEach(() => cleanup())

  const EDITABLE_COLUMNS: ReadonlyArray<DataTableColumn<Row>> = [
    { key: "name", label: "Name", minWidth: 200, grow: 2 },
    { key: "status", label: "Status", width: 120, align: "end" },
  ]

  it("switches the table to fixed layout and emits a <colgroup>", () => {
    const { container } = render(
      <DataTable rows={ROWS} columns={EDITABLE_COLUMNS} variant="editable" />,
    )
    const table = container.querySelector("table")
    expect(table?.className).toContain("table-fixed")
    // One <col> per data column (no leading gutter here).
    const cols = container.querySelectorAll("colgroup > col")
    expect(cols).toHaveLength(EDITABLE_COLUMNS.length)
  })

  it("drops whitespace-nowrap on data cells so inline editors can fill", () => {
    const { getByText } = render(
      <DataTable rows={ROWS} columns={EDITABLE_COLUMNS} variant="editable" />,
    )
    const cell = getByText("Alpha").closest("td")
    expect(cell?.className).not.toContain("whitespace-nowrap")
    expect(cell?.className).toContain("align-middle")
  })

  it("hosts a per-row rowActions control in the gutter and leaves rows inert", async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    const { getAllByRole, container } = render(
      <DataTable
        rows={ROWS}
        columns={EDITABLE_COLUMNS}
        variant="editable"
        rowActions={(row) => (
          <button type="button" aria-label={`Remove ${row.name}`} onClick={() => onDelete(row.id)}>
            x
          </button>
        )}
      />,
    )
    // Gutter <col> precedes the data <col>s when rowActions is present.
    expect(container.querySelectorAll("colgroup > col")).toHaveLength(EDITABLE_COLUMNS.length + 1)
    // One action button per row; the rows themselves are not buttons.
    const buttons = getAllByRole("button")
    expect(buttons).toHaveLength(ROWS.length)
    await user.click(getAllByRole("button", { name: /^Remove / })[0])
    expect(onDelete).toHaveBeenCalledWith("a")
  })
})
