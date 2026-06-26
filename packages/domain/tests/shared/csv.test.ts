import { describe, expect, it } from "vitest"
import {
  EXPORT_MAX_ROWS,
  pickExportColumns,
  resolveExportRowCap,
  toCsv,
  type ExportColumn,
} from "../../src/shared/csv.js"

type Row = { id: string; name: string; qty: string }

const COLUMNS: ReadonlyArray<ExportColumn<Row>> = [
  { key: "id", label: "ID", value: (row) => row.id },
  { key: "name", label: "Name", value: (row) => row.name },
  { key: "qty", label: "Qty", value: (row) => row.qty },
]

describe("toCsv", () => {
  it("writes a header row then one CRLF-terminated line per row", () => {
    const csv = toCsv(
      [
        { id: "1", name: "Alpha", qty: "10" },
        { id: "2", name: "Beta", qty: "20" },
      ],
      COLUMNS,
    )
    expect(csv).toBe("ID,Name,Qty\r\n1,Alpha,10\r\n2,Beta,20")
  })

  it("quotes fields containing comma, quote, or newline and doubles embedded quotes", () => {
    const csv = toCsv(
      [{ id: "1", name: 'Smith, "Jr"', qty: "a\nb" }],
      COLUMNS,
    )
    expect(csv).toBe('ID,Name,Qty\r\n1,"Smith, ""Jr""","a\nb"')
  })

  it("prefixes a UTF-8 BOM only when requested", () => {
    const rows = [{ id: "1", name: "x", qty: "1" }]
    expect(toCsv(rows, COLUMNS, { bom: true }).startsWith("﻿")).toBe(true)
    expect(toCsv(rows, COLUMNS).startsWith("﻿")).toBe(false)
  })

  it("emits only the header when there are no rows", () => {
    expect(toCsv([], COLUMNS)).toBe("ID,Name,Qty")
  })
})

describe("pickExportColumns", () => {
  it("narrows to the requested keys, preserving manifest order", () => {
    const picked = pickExportColumns(COLUMNS, ["qty", "id"])
    expect(picked.map((column) => column.key)).toEqual(["id", "qty"])
  })

  it("returns the full manifest when keys are absent or empty", () => {
    expect(pickExportColumns(COLUMNS, undefined)).toHaveLength(3)
    expect(pickExportColumns(COLUMNS, [])).toHaveLength(3)
  })
})

describe("resolveExportRowCap", () => {
  it("maps the discrete options to row counts and 'all'/undefined to the hard cap", () => {
    expect(resolveExportRowCap(250)).toBe(250)
    expect(resolveExportRowCap(1000)).toBe(1000)
    expect(resolveExportRowCap("all")).toBe(EXPORT_MAX_ROWS)
    expect(resolveExportRowCap(undefined)).toBe(EXPORT_MAX_ROWS)
  })

  it("clamps anything above the hard cap and rejects non-positive input", () => {
    expect(resolveExportRowCap(99999)).toBe(EXPORT_MAX_ROWS)
    expect(resolveExportRowCap(0)).toBe(EXPORT_MAX_ROWS)
    expect(resolveExportRowCap(-5)).toBe(EXPORT_MAX_ROWS)
  })
})
