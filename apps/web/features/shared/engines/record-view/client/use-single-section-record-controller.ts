"use client"

import { useCallback, useEffect, useMemo } from "react"
import { RequestJsonError } from "@builders/lib"
import { normalizeRecordSectionError } from "../contracts"
import type { RecordDetailClientScaffoldContext } from "./record-detail-client-scaffold"
import { useRecordDetailController } from "./use-record-detail-controller"
import { useRecordSectionController } from "./use-record-section-controller"

type BaseRecord = {
  id: string
  updatedAt: string
}

function readConflictSnapshot<T>(error: unknown): T | null {
  if (error instanceof RequestJsonError && error.status === 409 && error.payload.snapshot) {
    return error.payload.snapshot as T
  }

  return null
}

export function useSingleSectionRecordController<TRecord extends BaseRecord, TLocal>({
  page,
  scope,
  id,
  initialRecord,
  detailUrl,
  payloadKey,
  createLocalValue,
  isEqual,
  saveSection,
  deleteRecord,
  deleteErrorMessage = "Failed to delete record",
}: {
  page: RecordDetailClientScaffoldContext
  scope: string
  id: string
  initialRecord: TRecord
  detailUrl: string
  payloadKey: string
  createLocalValue: (record: TRecord) => TLocal
  isEqual?: (left: TLocal, right: TLocal) => boolean
  saveSection: (args: {
    localValue: TLocal
    record: TRecord
    revisionKey: string
  }) => Promise<TRecord>
  deleteRecord?: (record: TRecord) => Promise<void>
  deleteErrorMessage?: string
}) {
  const detail = useRecordDetailController<TRecord, never>({
    scope,
    id,
    initialRecord,
    url: detailUrl,
    payloadKey,
    manageDraft: false,
  })

  const currentRecord = detail.record ?? initialRecord

  const primarySection = useRecordSectionController<TRecord, TLocal>({
    serverValue: currentRecord,
    serverRevisionKey: currentRecord.updatedAt,
    createLocalValue,
    isEqual,
    onSave: async (localValue, record, revisionKey) => {
      try {
        const nextRecord = await saveSection({
          localValue,
          record,
          revisionKey,
        })
        detail.publishRecord(nextRecord)
        return {
          serverValue: nextRecord,
          serverRevisionKey: nextRecord.updatedAt,
        }
      } catch (error) {
        const conflictSnapshot = readConflictSnapshot<Record<string, TRecord | undefined>>(error)
        const snapshotRecord = conflictSnapshot?.[payloadKey]
        if (snapshotRecord) {
          detail.publishRecord(snapshotRecord)
        }
        throw error
      }
    },
  })

  useEffect(() => {
    page.setDirtySections(primarySection.isDirty ? ["primary"] : [])
  }, [page, primarySection.isDirty])

  const remove = useCallback(async () => {
    if (!deleteRecord) {
      return false
    }

    primarySection.setError(null)

    try {
      await deleteRecord(currentRecord)
      detail.clearRecordCache()
      page.redirectToBack()
      return true
    } catch (error) {
      primarySection.setError(
        normalizeRecordSectionError(error, {
          defaultMessage: deleteErrorMessage,
        }),
      )
      return false
    }
  }, [currentRecord, deleteErrorMessage, deleteRecord, detail, page, primarySection])

  return useMemo(
    () => ({
      page,
      record: currentRecord,
      loading: detail.loading,
      error: detail.error,
      primarySection,
      publishRecord: detail.publishRecord,
      refreshRecord: detail.refreshRecord,
      clearRecordCache: detail.clearRecordCache,
      deleteRecord: remove,
    }),
    [
      currentRecord,
      detail.clearRecordCache,
      detail.error,
      detail.loading,
      detail.publishRecord,
      detail.refreshRecord,
      page,
      primarySection,
      remove,
    ],
  )
}
