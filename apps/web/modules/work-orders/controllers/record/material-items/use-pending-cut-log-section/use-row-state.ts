"use client"

import { useCallback, useState } from "react"
import type { CutLogRow } from "@builders/domain"
import { rowId, toSavedRow } from "./helpers"
import { EMPTY_FORM, type PendingCutLogForm, type SavedRow, type SectionRow } from "./types"

/**
 * Owns the row state machinery for `usePendingCutLogSection`: the rows
 * array, the editing-row pointer, the per-row error map, and the
 * recently-saved-row pointer. Exposes both low-level writers (for
 * mutations to call from `onSuccess` / `onError`) and the semantic
 * actions consumers need (`enterEditMode`, `addDraft`, `discardDraft`,
 * `setField`).
 */
export function usePendingCutLogRowState(initialRows: ReadonlyArray<CutLogRow>) {
  const [rows, setRows] = useState<SectionRow[]>(() => initialRows.map(toSavedRow))
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [errorByRowId, setErrorByRowId] = useState<Record<string, string>>({})
  const [recentlySavedRowId, setRecentlySavedRowId] = useState<string | null>(null)

  const findRow = useCallback(
    (id: string): SectionRow | undefined => rows.find((row) => rowId(row) === id),
    [rows],
  )

  const writeRow = useCallback((id: string, next: SectionRow) => {
    setRows((current) => current.map((row) => (rowId(row) === id ? next : row)))
  }, [])

  const dropRow = useCallback((id: string) => {
    setRows((current) => current.filter((row) => rowId(row) !== id))
  }, [])

  const setError = useCallback((id: string, message: string | null) => {
    setErrorByRowId((current) => {
      if (message === null) {
        if (!(id in current)) return current
        const { [id]: _drop, ...rest } = current
        return rest
      }
      return { ...current, [id]: message }
    })
  }, [])

  const enterEditMode = useCallback(
    (nextId: string | null) => {
      setEditingRowId((currentId) => {
        if (currentId === nextId) return currentId
        if (currentId !== null) {
          setRows((current) => {
            const previous = current.find((row) => rowId(row) === currentId)
            if (!previous) return current
            if (previous.kind === "draft") {
              return current.filter((row) => rowId(row) !== currentId)
            }
            return current.map((row) =>
              rowId(row) === currentId
                ? { ...(row as SavedRow), edits: {} }
                : row,
            )
          })
          setError(currentId, null)
        }
        return nextId
      })
    },
    [setError],
  )

  const addDraft = useCallback(() => {
    const clientId = crypto.randomUUID()
    setRows((current) => [
      ...current,
      { kind: "draft", clientId, form: { ...EMPTY_FORM } },
    ])
    enterEditMode(clientId)
  }, [enterEditMode])

  const discardDraft = useCallback(
    (id: string) => {
      setEditingRowId((current) => (current === id ? null : current))
      dropRow(id)
      setError(id, null)
    },
    [dropRow, setError],
  )

  const setField = useCallback(
    <K extends keyof PendingCutLogForm>(id: string, key: K, value: PendingCutLogForm[K]) => {
      enterEditMode(id)
      setRows((current) =>
        current.map((row) => {
          if (rowId(row) !== id) return row
          if (row.kind === "draft") {
            // Section + Location filters are mutually exclusive — setting
            // one to a non-empty value clears the other.
            if (key === "locationFilterCode" && String(value ?? "") !== "") {
              return { ...row, form: { ...row.form, locationFilterCode: String(value), sectionFilterCode: "" } }
            }
            if (key === "sectionFilterCode" && String(value ?? "") !== "") {
              return { ...row, form: { ...row.form, sectionFilterCode: String(value), locationFilterCode: "" } }
            }
            return { ...row, form: { ...row.form, [key]: value } }
          }
          const saved = row as SavedRow
          if (key === "locationFilterCode") {
            const next = String(value ?? "")
            return { ...saved, locationFilterCode: next, sectionFilterCode: next ? "" : saved.sectionFilterCode }
          }
          if (key === "sectionFilterCode") {
            const next = String(value ?? "")
            return { ...saved, sectionFilterCode: next, locationFilterCode: next ? "" : saved.locationFilterCode }
          }
          if (key === "inventoryId") {
            return saved
          }
          const nextEdits = { ...saved.edits, [key]: value }
          const matchesServer =
            (key === "cut" && value === saved.row.cut) ||
            (key === "isWaste" && value === saved.row.isWaste) ||
            (key === "notes" && value === saved.row.notes)
          if (matchesServer) {
            const { [key]: _drop, ...rest } = nextEdits
            return { ...saved, edits: rest }
          }
          return { ...saved, edits: nextEdits }
        }),
      )
      setError(id, null)
      setRecentlySavedRowId((current) => (current === id ? null : current))
    },
    [enterEditMode, setError],
  )

  const clearLocationAndSectionFilters = useCallback(
    (id: string) => {
      setRows((current) =>
        current.map((row) => {
          if (rowId(row) !== id) return row
          if (row.kind === "draft") {
            return { ...row, form: { ...row.form, locationFilterCode: "", sectionFilterCode: "" } }
          }
          return { ...(row as SavedRow), locationFilterCode: "", sectionFilterCode: "" }
        }),
      )
    },
    [],
  )

  return {
    rows,
    editingRowId,
    errorByRowId,
    recentlySavedRowId,
    setEditingRowId,
    setRecentlySavedRowId,
    findRow,
    writeRow,
    dropRow,
    setError,
    enterEditMode,
    addDraft,
    discardDraft,
    setField,
    clearLocationAndSectionFilters,
  }
}
