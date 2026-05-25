"use client"

import { useCallback, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  TEMPLATE_PREVIEW_ITEMS_PAGE_SIZE,
  type TemplateMaterialItemRow,
} from "@builders/domain"
import {
  TEMPLATE_SYNC_PREVIEW_MATERIAL_ITEMS_QUERY_KEY,
  templatePreviewMaterialItemsRequest,
} from "@/modules/template-sync/data/template-preview-material-items-request"

export type TemplateSyncItemsController = {
  page: number
  totalPages: number
  total: number
  rows: ReadonlyArray<TemplateMaterialItemRow>
  isFetching: boolean
  isError: boolean
  hasData: boolean
  canPrev: boolean
  canNext: boolean
  goPrev: () => void
  goNext: () => void
  showSubHeader: boolean
}

const EMPTY_ROWS: ReadonlyArray<TemplateMaterialItemRow> = []

export function useTemplateSyncItems(
  templateId: string | null,
): TemplateSyncItemsController {
  const [page, setPage] = useState(1)

  // Reset to page 1 when the previewed template changes — derived during
  // render so the query never fires the new template against the stale page.
  const [trackedTemplateId, setTrackedTemplateId] = useState(templateId)
  if (trackedTemplateId !== templateId) {
    setTrackedTemplateId(templateId)
    setPage(1)
  }

  const query = useQuery({
    enabled: templateId !== null,
    queryKey: [
      ...TEMPLATE_SYNC_PREVIEW_MATERIAL_ITEMS_QUERY_KEY,
      templateId,
      page,
    ],
    queryFn: ({ signal }) =>
      templatePreviewMaterialItemsRequest(
        templateId as string,
        page,
        TEMPLATE_PREVIEW_ITEMS_PAGE_SIZE,
        signal,
      ),
  })

  const data = query.data
  const total = data?.total ?? 0
  const pageSize = data?.pageSize ?? TEMPLATE_PREVIEW_ITEMS_PAGE_SIZE
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const rows = data?.rows ?? EMPTY_ROWS

  const goPrev = useCallback(() => {
    setPage((value) => Math.max(1, value - 1))
  }, [])

  const goNext = useCallback(() => {
    setPage((value) => Math.min(totalPages, value + 1))
  }, [totalPages])

  return useMemo<TemplateSyncItemsController>(() => {
    const hasData = data !== undefined
    const canPrev = hasData && page > 1 && !query.isFetching
    const canNext = hasData && page < totalPages && !query.isFetching
    return {
      page,
      totalPages,
      total,
      rows,
      isFetching: query.isFetching,
      isError: query.isError,
      hasData,
      canPrev,
      canNext,
      goPrev,
      goNext,
      showSubHeader: templateId !== null,
    }
  }, [
    data,
    page,
    totalPages,
    total,
    rows,
    query.isFetching,
    query.isError,
    goPrev,
    goNext,
    templateId,
  ])
}
