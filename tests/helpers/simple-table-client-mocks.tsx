import React from "react"
import { cleanup } from "@testing-library/react"
import { vi } from "vitest"

type TableStateInput = {
  rows: Array<{ id: string }>
  fields: Array<{ key: string; label: string }>
}

type UrlRecordEditorInput<Row extends { id: string }> = {
  rows: Row[]
  createDraft: (row: Row) => unknown
}

export const requestJsonMock = vi.fn()

export const lucideReactModule = {
  Plus: () => <span>+</span>,
  X: () => <span>x</span>,
}

export const httpModule = {
  requestJson: requestJsonMock,
}

export function useConfiguredTableStateStub({ rows, fields }: TableStateInput) {
  return {
    searchQuery: "",
    setSearchQuery: vi.fn(),
    isAscendingSort: true,
    setIsAscendingSort: vi.fn(),
    isGroupingEnabled: false,
    setIsGroupingEnabled: vi.fn(),
    groupByKeys: [],
    updateGroupByKeyAtIndex: vi.fn(),
    addGroupByKey: vi.fn(),
    removeGroupByKeyAtIndex: vi.fn(),
    groupFields: [],
    filteredRows: rows,
    sortedRows: rows,
    groupedRowTree: [],
    page: 1,
    pageSize: rows.length || 1,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
    goToPreviousPage: vi.fn(),
    goToNextPage: vi.fn(),
    allColumns: fields.map((field) => ({ key: field.key, label: field.label })),
    visibleColumns: fields.map((field) => ({ key: field.key, label: field.label })),
    hiddenColumnKeys: [],
    toggleColumnVisibility: vi.fn(),
    moveColumn: vi.fn(),
    setColumnOrder: vi.fn(),
  }
}

export const useConfiguredTableStateModule = {
  useConfiguredTableState: useConfiguredTableStateStub,
}

export function useUrlRecordEditorStub<Row extends { id: string }>({
  rows,
  createDraft,
}: UrlRecordEditorInput<Row>) {
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [draftState, setDraftState] = React.useState<unknown | null>(null)
  const activeRecord = rows.find((row) => row.id === activeId) ?? null
  const draft = activeRecord ? (draftState ?? createDraft(activeRecord)) : draftState

  return {
    activeRecord,
    draft,
    setDraft: setDraftState,
    openRecord: (row: Row) => {
      setActiveId(row.id)
      setDraftState(createDraft(row))
    },
    closeRecord: () => {
      setActiveId(null)
      setDraftState(null)
    },
  }
}

export const useUrlRecordEditorModule = {
  useUrlRecordEditor: useUrlRecordEditorStub,
}

export const tableControlsBarModule = {
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}

export const tableColumnSettingsModule = {
  TableColumnSettings: () => null,
}

export const tableShellModule = {
  TableActionsSummary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TableEmptyRow: ({ message, colSpan }: { message: string; colSpan: number }) => (
    <tr>
      <td colSpan={colSpan}>{message}</td>
    </tr>
  ),
  TableGroupRow: ({ label, colSpan }: { label: string; colSpan: number }) => (
    <tr>
      <td colSpan={colSpan}>{label}</td>
    </tr>
  ),
  TableHead: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableHeaderCell: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TablePaginationControls: () => null,
  TableShell: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
}

export const rowActionButtonsModule = {
  EditRowButton: ({ onClick }: { onClick: () => void }) => <button onClick={onClick}>Edit</button>,
  DeleteRowButton: ({
    onClick,
    children,
    disabled,
  }: {
    onClick: () => void
    children: React.ReactNode
    disabled?: boolean
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}

export function resetSimpleTableClientMocks() {
  cleanup()
  vi.clearAllMocks()
}

vi.mock("lucide-react", () => lucideReactModule)
vi.mock("@/features/flooring/shared/http", () => httpModule)
vi.mock("@/features/flooring/shared/use-configured-table-state", () => useConfiguredTableStateModule)
vi.mock("@/features/flooring/shared/use-url-record-editor", () => useUrlRecordEditorModule)
vi.mock("@/features/flooring/shared/table-controls-bar", () => tableControlsBarModule)
vi.mock("@/features/flooring/shared/table-column-settings", () => tableColumnSettingsModule)
vi.mock("@/features/flooring/shared/table-shell", () => tableShellModule)
vi.mock("@/features/flooring/shared/row-action-buttons", () => rowActionButtonsModule)
