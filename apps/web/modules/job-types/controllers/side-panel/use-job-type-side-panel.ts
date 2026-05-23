"use client"

import { useCallback, useMemo, useState } from "react"
import {
  toJobTypeForm,
  validateJobTypeForm,
  type JobType,
  type JobTypeForm,
  type JobTypeListRow,
} from "@builders/domain"
import { getJobTypeDetailRequest } from "@/modules/job-types/data/job-type-detail-request"
import {
  buildJobTypeFormFromRow,
  EMPTY_JOB_TYPE_FORM,
  jobTypeFormIsDirty,
} from "./form"
import {
  useCreateJobTypeMutation,
  useDeleteJobTypeMutation,
  useUpdateJobTypeMutation,
} from "./mutations"
import type { JobTypeSidePanelMode } from "./types"

/**
 * Controller for the job-types side panel. Modes:
 *   - closed : panel hidden
 *   - create : empty form; Save = POST; on success → flips to edit mode
 *              for the new record (parity with property hub's stay-open
 *              behavior).
 *   - edit   : row preloaded into form; Save = PATCH primary section;
 *              Delete = DELETE with expectedUpdatedAt guard.
 *
 * Save never closes the panel. Delete closes it on success; the 409
 * blocked-by-in-use response surfaces in `error` and the row stays
 * intact (server-side rule in deleteJobTypeUseCase).
 *
 * `onCreated` (optional) fires once with the newly created job type
 * right after a create succeeds — lets a host (e.g. the templates Job
 * group) auto-select the new job type into its picker without a refetch.
 * `onUpdated` (optional) fires after an edit-mode save commits — hosts
 * use it to patch a locally-held name (e.g. the template record cell)
 * without a refetch; identity-gate against the host's bound id.
 */
export function useJobTypeSidePanel(options?: {
  onCreated?: (jobType: JobType) => void
  onUpdated?: (jobType: JobType) => void
}) {
  const onCreated = options?.onCreated
  const onUpdated = options?.onUpdated
  const [mode, setMode] = useState<JobTypeSidePanelMode>({ kind: "closed" })
  const [form, setForm] = useState<JobTypeForm>(EMPTY_JOB_TYPE_FORM)
  const [baseline, setBaseline] = useState<JobTypeForm>(EMPTY_JOB_TYPE_FORM)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const createMutation = useCreateJobTypeMutation()
  const updateMutation = useUpdateJobTypeMutation()
  const deleteMutation = useDeleteJobTypeMutation()

  const isSaving =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  const isDirty = useMemo(() => {
    if (mode.kind === "create") return form.name.trim().length > 0
    if (mode.kind === "edit") return jobTypeFormIsDirty(form, baseline)
    return false
  }, [mode.kind, form, baseline])

  const validationError = useMemo<string | null>(() => {
    if (mode.kind === "closed") return null
    const message = validateJobTypeForm(form)
    return message || null
  }, [mode.kind, form])

  const canSave = useMemo(() => {
    if (mode.kind === "closed") return false
    if (isSaving) return false
    if (validationError) return false
    if (mode.kind === "edit") return isDirty
    return true
  }, [mode.kind, isSaving, validationError, isDirty])

  const openForCreate = useCallback(() => {
    setForm(EMPTY_JOB_TYPE_FORM)
    setBaseline(EMPTY_JOB_TYPE_FORM)
    setUpdatedAt(null)
    setError(null)
    setMode({ kind: "create" })
  }, [])

  const openForEdit = useCallback((row: JobTypeListRow) => {
    const next = buildJobTypeFormFromRow(row)
    setForm(next)
    setBaseline(next)
    setUpdatedAt(row.updatedAt)
    setError(null)
    setMode({ kind: "edit", id: row.id })
  }, [])

  // ID-only entry point for picker-adjacent shortcut buttons that know
  // only the selected id. Fetches the canonical job type (so baseline +
  // updatedAt match the server), then enters edit mode in one shot.
  const openForEditById = useCallback(
    async (id: string) => {
      setError(null)
      try {
        const jobType = await getJobTypeDetailRequest(id)
        openForEdit(jobType)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    },
    [openForEdit],
  )

  const close = useCallback(() => {
    if (isSaving) return
    setMode({ kind: "closed" })
    setForm(EMPTY_JOB_TYPE_FORM)
    setBaseline(EMPTY_JOB_TYPE_FORM)
    setUpdatedAt(null)
    setError(null)
  }, [isSaving])

  const setName = useCallback((value: string) => {
    setForm((prev) => ({ ...prev, name: value }))
    setError(null)
  }, [])

  const save = useCallback(() => {
    if (!canSave) return
    if (mode.kind === "create") {
      createMutation.mutate(
        { form },
        {
          onSuccess: (response) => {
            const created = response.jobType
            const next = toJobTypeForm(created)
            setForm(next)
            setBaseline(next)
            setUpdatedAt(created.updatedAt)
            setError(null)
            setMode({ kind: "edit", id: created.id })
            onCreated?.(created)
          },
          onError: (err: unknown) => {
            setError(err instanceof Error ? err.message : String(err))
          },
        },
      )
      return
    }
    if (mode.kind === "edit" && updatedAt !== null) {
      updateMutation.mutate(
        { id: mode.id, form, revisionKey: updatedAt },
        {
          onSuccess: (response) => {
            const updated = response.jobType
            const next = toJobTypeForm(updated)
            setForm(next)
            setBaseline(next)
            setUpdatedAt(updated.updatedAt)
            setError(null)
            onUpdated?.(updated)
          },
          onError: (err: unknown) => {
            setError(err instanceof Error ? err.message : String(err))
          },
        },
      )
    }
  }, [canSave, mode, createMutation, updateMutation, form, updatedAt, onCreated, onUpdated])

  const discard = useCallback(() => {
    if (isSaving) return
    if (mode.kind === "create") {
      setForm(EMPTY_JOB_TYPE_FORM)
      setError(null)
      return
    }
    if (mode.kind === "edit") {
      setForm(baseline)
      setError(null)
    }
  }, [isSaving, mode.kind, baseline])

  const deleteCurrent = useCallback(() => {
    if (mode.kind !== "edit" || updatedAt === null || isSaving) return
    deleteMutation.mutate(
      { id: mode.id, updatedAt },
      {
        onSuccess: () => {
          setMode({ kind: "closed" })
          setForm(EMPTY_JOB_TYPE_FORM)
          setBaseline(EMPTY_JOB_TYPE_FORM)
          setUpdatedAt(null)
          setError(null)
        },
        onError: (err: unknown) => {
          setError(err instanceof Error ? err.message : String(err))
        },
      },
    )
  }, [mode, updatedAt, isSaving, deleteMutation])

  return {
    mode,
    isOpen: mode.kind !== "closed",
    form,
    baseline,
    updatedAt,
    isDirty,
    isSaving,
    canSave,
    validationError,
    error,
    openForCreate,
    openForEdit,
    openForEditById,
    close,
    setName,
    save,
    discard,
    delete: deleteCurrent,
  }
}

export type JobTypeSidePanelController = ReturnType<typeof useJobTypeSidePanel>
