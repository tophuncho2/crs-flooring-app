"use client"

// Smoke page mirroring the inventory record view (`/dashboard/inventory/[id]`)
// with the focus on the cut logs section. Cut logs is the next module-level
// migration target; this page rehearses the workflow on top of the new
// `apps/web/components/` primitives before any real-module wiring lands.
//
// Cut logs reuses the same controller surface as the imports staged-inventory
// rows section: add row · discard · save rows · selection-driven multi-row
// action. The deviation from staged-rows is that the multi-row action is
// "Finalize" instead of "Run Import", and finalized rows expose a separate
// `void` trailing-control column. Once finalized, a row can no longer be
// edited or deleted — it can only be voided.
//
// The void column lives behind a generic `RowActionButton` primitive so the
// staged-inventory section could adopt it later without new components.
//
// DELETE BEFORE MERGING THE NEXT MIGRATION SWEEP:
//   rm -rf apps/web/app/components-smoke

import Link from "next/link"
import { useState } from "react"
import { Grid, GridEmpty, type GridLayout, type GridRow } from "@/components/grid"
import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField, StaticFieldValue } from "@/components/fields"
import {
  CheckboxCell,
  DropdownCell,
  RowActionButton,
  SelectCell,
  TextCell,
  TextareaCell,
  UnitCell,
} from "@/components/cells"
import { StatusBadge } from "@/components/badges"
import { ConfirmDialog } from "@/components/dialogs"
import { ActionHeader, SectionHeader } from "@/components/headers"

// ---------- Cut log fixture types ------------------------------------------

type CutLogStatus = "DRAFT" | "FINALIZED" | "VOIDED"

type CutLogFixture = GridRow & {
  cutNumber: number
  cutAmount: string
  workOrderId: string | null
  materialItemId: string | null
  cutBy: string
  notes: string
  status: CutLogStatus
}

const WORK_ORDERS = [
  { value: "wo-1001", label: "WO-1001 · Mercer kitchen" },
  { value: "wo-1002", label: "WO-1002 · Holcomb master bath" },
  { value: "wo-1003", label: "WO-1003 · Patel hallway" },
  { value: "wo-1004", label: "WO-1004 · Brookhurst office" },
]

// Mock material-item allocations — each work order has 1-2 line items the cut
// can be applied against. Real wiring will fetch these scoped to the selected
// work order's allocations.
const MATERIAL_ITEMS_BY_WORK_ORDER: Record<string, Array<{ id: string; label: string }>> = {
  "wo-1001": [
    { id: "mi-1001-a", label: "Living room · 28.00 bx" },
    { id: "mi-1001-b", label: "Hallway · 12.00 bx" },
  ],
  "wo-1002": [{ id: "mi-1002-a", label: "Master bath floor · 18.00 bx" }],
  "wo-1003": [
    { id: "mi-1003-a", label: "Hall main · 22.00 bx" },
    { id: "mi-1003-b", label: "Hall closet · 4.00 bx" },
  ],
  "wo-1004": [
    { id: "mi-1004-a", label: "Office bay · 40.00 bx" },
    { id: "mi-1004-b", label: "Office closet · 6.00 bx" },
  ],
}

const CUTTERS = [
  { value: "alex", label: "Alex (warehouse)" },
  { value: "jordan", label: "Jordan (install crew)" },
  { value: "sam", label: "Sam (install crew)" },
]

const INITIAL_CUT_LOGS: CutLogFixture[] = [
  {
    id: "cut-1",
    cutNumber: 1,
    cutAmount: "12.50",
    workOrderId: "wo-1001",
    materialItemId: "mi-1001-a",
    cutBy: "alex",
    notes: "First cut from this lot",
    status: "FINALIZED",
  },
  {
    id: "cut-2",
    cutNumber: 2,
    cutAmount: "8.00",
    workOrderId: "wo-1002",
    materialItemId: "mi-1002-a",
    cutBy: "jordan",
    notes: "",
    status: "FINALIZED",
  },
  {
    id: "cut-3",
    cutNumber: 3,
    cutAmount: "5.25",
    workOrderId: "wo-1001",
    materialItemId: "mi-1001-b",
    cutBy: "sam",
    notes: "Cut undersize — voided per Mercer change order",
    status: "VOIDED",
  },
  {
    id: "cut-4",
    cutNumber: 4,
    cutAmount: "15.00",
    workOrderId: "wo-1003",
    materialItemId: "mi-1003-a",
    cutBy: "jordan",
    notes: "",
    status: "DRAFT",
  },
  {
    id: "cut-5",
    cutNumber: 5,
    cutAmount: "",
    workOrderId: null,
    materialItemId: null,
    cutBy: "",
    notes: "",
    status: "DRAFT",
  },
]

// ---------- Layout ---------------------------------------------------------

const CUT_LOGS_LAYOUT: GridLayout<CutLogFixture> = {
  leadingControls: [{ key: "select", kind: "selection", width: 40 }],
  dataColumns: [
    { key: "cutNumber", label: "Cut #", kind: "number", minWidth: 80, grow: 0, align: "end" },
    { key: "cutAmount", label: "Cut Amount", kind: "quantity", minWidth: 140, grow: 0, align: "center" },
    { key: "workOrder", label: "Work Order", minWidth: 240, grow: 1 },
    { key: "materialItem", label: "Material Item", minWidth: 220, grow: 1 },
    { key: "cutBy", label: "Cut By", minWidth: 180, grow: 0 },
    { key: "notes", label: "Notes", minWidth: 240, grow: 1.5 },
  ],
  trailingControls: [
    { key: "status", kind: "status-indicator", width: 132 },
    { key: "delete", kind: "actions", width: 72 },
    { key: "void", kind: "void", width: 80 },
  ],
}

// ---------- Helpers --------------------------------------------------------

function statusTone(status: CutLogStatus) {
  switch (status) {
    case "FINALIZED":
      return "success" as const
    case "VOIDED":
      return "muted" as const
    case "DRAFT":
    default:
      return "default" as const
  }
}

function isRowEditable(row: CutLogFixture) {
  return row.status === "DRAFT"
}

function isEligibleForFinalize(row: CutLogFixture) {
  return (
    row.status === "DRAFT" &&
    row.cutAmount !== "" &&
    row.workOrderId !== null &&
    row.materialItemId !== null &&
    row.cutBy !== ""
  )
}

function nextCutNumber(rows: CutLogFixture[]) {
  const max = rows.reduce((acc, row) => (row.cutNumber > acc ? row.cutNumber : acc), 0)
  return max + 1
}

// ---------- Page -----------------------------------------------------------

export default function InventoryRecordCutLogsSmokePage() {
  // ----- Cut-logs section state (mirrors `useImportStagedInventoryRowsSection`)
  const [rows, setRows] = useState(INITIAL_CUT_LOGS)
  const [savedSnapshot, setSavedSnapshot] = useState(INITIAL_CUT_LOGS)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)
  const [noticeError, setNoticeError] = useState<string | null>(null)
  // Cut id pending void confirmation. `null` → dialog closed.
  const [voidPendingId, setVoidPendingId] = useState<string | null>(null)
  const voidPendingRow = voidPendingId ? rows.find((r) => r.id === voidPendingId) ?? null : null

  const isDirty = JSON.stringify(rows) !== JSON.stringify(savedSnapshot)
  const eligibleSelectedIds = Array.from(selectedIds).filter((id) => {
    const row = rows.find((r) => r.id === id)
    return row ? isEligibleForFinalize(row) : false
  })

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function updateRow(id: string, patch: Partial<CutLogFixture>) {
    setNoticeMessage(null)
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function removeRow(id: string) {
    setNoticeMessage(null)
    setRows((prev) => prev.filter((r) => r.id !== id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function addRow() {
    setNoticeMessage(null)
    setRows((prev) => [
      ...prev,
      {
        id: `cut-${Date.now()}`,
        cutNumber: nextCutNumber(prev),
        cutAmount: "",
        workOrderId: null,
        materialItemId: null,
        cutBy: "",
        notes: "",
        status: "DRAFT",
      },
    ])
  }

  function discard() {
    setRows(savedSnapshot)
    setNoticeMessage(null)
    setNoticeError(null)
  }

  function save() {
    setIsSaving(true)
    setNoticeError(null)
    setTimeout(() => {
      setSavedSnapshot(rows)
      setIsSaving(false)
      setNoticeMessage("Cut logs saved")
    }, 350)
  }

  function finalizeSelected() {
    if (eligibleSelectedIds.length === 0) return
    setIsFinalizing(true)
    setNoticeError(null)
    setTimeout(() => {
      const eligibleSet = new Set(eligibleSelectedIds)
      const next = rows.map((row) =>
        eligibleSet.has(row.id) ? { ...row, status: "FINALIZED" as const } : row,
      )
      setRows(next)
      setSavedSnapshot(next)
      setSelectedIds(new Set())
      setIsFinalizing(false)
      setNoticeMessage(`${eligibleSelectedIds.length} cut${eligibleSelectedIds.length === 1 ? "" : "s"} finalized`)
    }, 350)
  }

  function voidRow(id: string) {
    setNoticeError(null)
    const next = rows.map((row) =>
      row.id === id && row.status === "FINALIZED" ? { ...row, status: "VOIDED" as const } : row,
    )
    setRows(next)
    setSavedSnapshot(next)
    setNoticeMessage(`Cut #${rows.find((r) => r.id === id)?.cutNumber} voided`)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <nav className="flex flex-wrap gap-3 text-sm">
        <span className="font-medium text-[var(--foreground)]">Inventory record (cut logs)</span>
        <span className="text-[var(--foreground)]/45">·</span>
        <Link
          href="/components-smoke/inventory-list"
          className="text-[var(--foreground)]/65 hover:text-[var(--foreground)]"
        >
          Inventory list
        </Link>
        <span className="text-[var(--foreground)]/45">·</span>
        <Link
          href="/components-smoke/templates-list"
          className="text-[var(--foreground)]/65 hover:text-[var(--foreground)]"
        >
          Templates list
        </Link>
        <span className="text-[var(--foreground)]/45">·</span>
        <Link
          href="/components-smoke/templates-record"
          className="text-[var(--foreground)]/65 hover:text-[var(--foreground)]"
        >
          Templates record →
        </Link>
      </nav>

      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          Inventory record · cut logs smoke
        </h1>
        <p className="text-sm text-[var(--foreground)]/65">
          Visual rehearsal of the cut logs section on top of the new{" "}
          <code className="rounded bg-[var(--panel-border)]/30 px-1">apps/web/components/</code>{" "}
          primitives. Same controller shape as the imports staged-inventory rows section, with two
          additions: <strong>Finalize</strong> replaces Run Import, and finalized rows expose a
          dedicated <strong>void</strong> column. Voided rows are read-only and cannot be deleted.
        </p>
      </header>

      {/* ---------------- Primary section (minimal context) ---------------- */}
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <SectionHeader
          title="Inventory · INV-2046"
          subtitle="Mirror of /dashboard/inventory/[id] — primary kept minimal so the focus is below."
        />
        <div className="px-4 py-4">
          <FieldSection>
            <CellAt col={1} row={1} colSpan={4}>
              <FormField label="Product">
                <TextCell editable={false} value="Vinyl Plank — XL Cyrus Grayton" />
              </FormField>
            </CellAt>
            <CellAt col={5} row={1} colSpan={2}>
              <FormField label="Import #">
                <TextCell editable={false} value="IMP-0007" />
              </FormField>
            </CellAt>
            <CellAt col={7} row={1} colSpan={2}>
              <FormField label="Available">
                <StaticFieldValue tone="muted">42.50 bx</StaticFieldValue>
              </FormField>
            </CellAt>
          </FieldSection>
        </div>
      </div>

      {/* ---------------- Cut logs section ---------------- */}
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <ActionHeader
          title="Cut Logs"
          summary={
            <span>
              {rows.length} cut{rows.length === 1 ? "" : "s"}
              {selectedIds.size > 0
                ? ` · ${selectedIds.size} selected (${eligibleSelectedIds.length} eligible)`
                : ""}
            </span>
          }
          status={
            eligibleSelectedIds.length > 0
              ? { tone: "processing", label: "Ready to finalize", detail: "Finalized cuts are no longer editable" }
              : undefined
          }
          actions={[
            {
              key: "add",
              label: "+ Add Row",
              onClick: addRow,
              kind: "secondary",
              disabled: isSaving || isFinalizing,
            },
            {
              key: "discard",
              label: "Discard",
              onClick: discard,
              kind: "secondary",
              disabled: !isDirty || isSaving || isFinalizing,
            },
            {
              key: "save",
              label: isSaving ? "Saving Rows..." : "Save Rows",
              onClick: save,
              kind: "primary",
              disabled: !isDirty || isSaving || isFinalizing,
            },
            {
              key: "finalize",
              label: isFinalizing ? "Finalizing..." : "Finalize",
              onClick: finalizeSelected,
              kind: "primary",
              disabled: eligibleSelectedIds.length === 0 || isSaving || isFinalizing,
            },
          ]}
          message={noticeMessage}
          error={
            noticeError ??
            (selectedIds.size > 0 && eligibleSelectedIds.length === 0
              ? "None of the selected rows are eligible to finalize. Drafts must have a cut amount, work order, material item, and cutter assigned."
              : undefined)
          }
        />

        <Grid<CutLogFixture>
          rows={rows}
          layout={CUT_LOGS_LAYOUT}
          empty={<GridEmpty>No cut logs recorded yet.</GridEmpty>}
          renderCell={(column, row) => {
            const editable = isRowEditable(row)
            switch (column.key) {
              case "cutNumber":
                return <span className="tabular-nums">{row.cutNumber}</span>
              case "cutAmount":
                return (
                  <UnitCell
                    editable={editable}
                    value={row.cutAmount}
                    onChange={(next) => updateRow(row.id, { cutAmount: next })}
                    unit="bx"
                    ariaLabel={`Cut #${row.cutNumber} amount`}
                  />
                )
              case "workOrder":
                return (
                  <SelectCell
                    editable={editable}
                    value={row.workOrderId ?? ""}
                    onChange={(next) =>
                      updateRow(row.id, {
                        workOrderId: next || null,
                        // Clear material item when work order changes — material
                        // items are scoped to a single work order's allocations.
                        materialItemId: null,
                      })
                    }
                    options={WORK_ORDERS}
                    placeholder="Select work order"
                    ariaLabel={`Cut #${row.cutNumber} work order`}
                  />
                )
              case "materialItem": {
                const items = row.workOrderId ? MATERIAL_ITEMS_BY_WORK_ORDER[row.workOrderId] ?? [] : []
                return (
                  <DropdownCell
                    editable={editable && row.workOrderId !== null}
                    value={row.materialItemId}
                    onChange={(next) => updateRow(row.id, { materialItemId: next })}
                    options={items}
                    placeholder={row.workOrderId ? "Select material item" : "Select work order first"}
                    ariaLabel={`Cut #${row.cutNumber} material item`}
                  />
                )
              }
              case "cutBy":
                return (
                  <SelectCell
                    editable={editable}
                    value={row.cutBy}
                    onChange={(next) => updateRow(row.id, { cutBy: next })}
                    options={CUTTERS}
                    placeholder="Cut by…"
                    ariaLabel={`Cut #${row.cutNumber} cut by`}
                  />
                )
              case "notes":
                return (
                  <TextareaCell
                    editable={editable}
                    value={row.notes}
                    onChange={(next) => updateRow(row.id, { notes: next })}
                    rows={1}
                    ariaLabel={`Cut #${row.cutNumber} notes`}
                  />
                )
              default:
                return null
            }
          }}
          renderControl={(control, row) => {
            if (control.kind === "selection") {
              return (
                <CheckboxCell
                  editable={isRowEditable(row)}
                  value={selectedIds.has(row.id)}
                  onChange={() => toggleSelection(row.id)}
                  ariaLabel={`Select cut #${row.cutNumber}`}
                />
              )
            }
            if (control.kind === "status-indicator") {
              return <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>
            }
            if (control.kind === "actions") {
              const canDelete = row.status === "DRAFT"
              return (
                <RowActionButton
                  label="✕"
                  ariaLabel={`Delete cut #${row.cutNumber}`}
                  tone="destructive"
                  title={canDelete ? "Delete this draft" : "Only draft cuts can be deleted"}
                  {...(canDelete ? { editable: true } : { editable: false, reason: "locked" })}
                  onClick={() => removeRow(row.id)}
                />
              )
            }
            if (control.kind === "void") {
              const canVoid = row.status === "FINALIZED"
              const isVoided = row.status === "VOIDED"
              return (
                <RowActionButton
                  label={isVoided ? "Voided" : "Void"}
                  ariaLabel={`Void cut #${row.cutNumber}`}
                  tone="warning"
                  title={
                    canVoid
                      ? "Mark this finalized cut as voided"
                      : isVoided
                        ? "This cut is already voided"
                        : "Only finalized cuts can be voided"
                  }
                  {...(canVoid ? { editable: true } : { editable: false, reason: "locked" })}
                  onClick={() => setVoidPendingId(row.id)}
                />
              )
            }
            return null
          }}
        />

        <div className="border-t border-[var(--panel-border)] px-4 py-3 text-xs text-[var(--foreground)]/55">
          <strong>Cut log lifecycle:</strong> DRAFT (editable, deletable, selectable) → FINALIZED
          (locked, voidable) → VOIDED (terminal, read-only). The trailing <em>void</em> column uses
          the generic <code>RowActionButton</code> primitive — staged-inventory rows could adopt the
          same column without any new components. Clicking <em>Void</em> opens a{" "}
          <code>ConfirmDialog</code>; the void only runs after the user confirms.
        </div>
      </div>

      <ConfirmDialog
        open={voidPendingRow !== null}
        title="Void this cut?"
        message={
          voidPendingRow ? (
            <>
              Cut <strong>#{voidPendingRow.cutNumber}</strong> ({voidPendingRow.cutAmount} bx) will be
              marked <strong>VOIDED</strong>. Voided cuts are read-only and cannot be edited, deleted, or
              voided again. This action cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Void cut"
        cancelLabel="Keep finalized"
        tone="warning"
        onCancel={() => setVoidPendingId(null)}
        onConfirm={() => {
          if (voidPendingId) voidRow(voidPendingId)
          setVoidPendingId(null)
        }}
      />
    </div>
  )
}
