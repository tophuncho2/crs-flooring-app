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

describe("DataTable — sort headers", () => {
  afterEach(() => cleanup())

  const SORTABLE_COLUMNS: ReadonlyArray<DataTableColumn<Row>> = [
    { key: "name", label: "Name", sortable: true },
    { key: "status", label: "Status", sortable: true },
  ]

  it("reflects a single active sort with no priority badge", () => {
    const { getByRole } = render(
      <DataTable
        rows={ROWS}
        columns={SORTABLE_COLUMNS}
        sort={{ field: "name", direction: "asc" }}
        onSort={vi.fn()}
      />,
    )
    const button = getByRole("button", { name: /Sort by Name/ })
    expect(button.getAttribute("aria-label")).toContain("(ascending)")
    expect(button.getAttribute("aria-label")).not.toContain("priority")
  })

  it("shows 1-based priority badges for a multi-column sort", () => {
    const { getByRole } = render(
      <DataTable
        rows={ROWS}
        columns={SORTABLE_COLUMNS}
        sorts={[
          { field: "status", direction: "desc" },
          { field: "name", direction: "asc" },
        ]}
        onSort={vi.fn()}
      />,
    )
    expect(getByRole("button", { name: /Sort by Status/ }).getAttribute("aria-label")).toContain(
      "priority 1",
    )
    expect(getByRole("button", { name: /Sort by Name/ }).getAttribute("aria-label")).toContain(
      "priority 2",
    )
  })

  it("fires onSort with the column key on header click", async () => {
    const user = userEvent.setup()
    const onSort = vi.fn()
    const { getByRole } = render(
      <DataTable rows={ROWS} columns={SORTABLE_COLUMNS} sort={null} onSort={onSort} />,
    )
    await user.click(getByRole("button", { name: /Sort by Name/ }))
    expect(onSort).toHaveBeenCalledWith("name")
  })
})
