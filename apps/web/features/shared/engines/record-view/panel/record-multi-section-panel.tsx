"use client"

import { Fragment, useEffect, useMemo, type ReactNode } from "react"
import type { RecordDetailClientScaffoldContext } from "../client/record-detail-client-scaffold"
import type { RecordNotices } from "../client/use-record-notices"
import type { RecordPageSummary } from "../client/use-record-page-controller"
import { RecordPageActionNotices } from "../feedback/record-page-action-notices"
import type { RecordSectionCapabilities, RecordSectionType } from "../sections/record-section-capabilities"
import type { RecordSectionMetricValue } from "../sections/record-section-metric"
import type { RecordSectionSubHeaderProps } from "../sections/record-section-sub-header"
import { RecordSectionStack } from "../sections/record-section-stack"
import { RecordPanelFooter } from "../shell/record-panel-footer"

const EMPTY_PANEL_SUMMARY: RecordPageSummary = {
  metrics: [],
}

export type RecordPanelSectionControllerState = {
  isDirty?: boolean
  isSaving?: boolean
  hasConflict?: boolean
}

export type RecordPanelSectionConfig = {
  key: string
  type: RecordSectionType
  order: number
  slot?: "primary" | "section"
  dirtyLabel?: string
  controller?: RecordPanelSectionControllerState
  capabilities?: RecordSectionCapabilities
  metrics?: ReactNode | RecordSectionMetricValue[]
  actions?: RecordSectionSubHeaderProps["actions"]
  visibleWhen?: (context: RecordMultiSectionPanelContext) => boolean
  render: (context: RecordMultiSectionPanelContext) => ReactNode
}

export type RecordMultiSectionPanelContext = {
  page: RecordDetailClientScaffoldContext
  notices?: RecordNotices
}

export function RecordMultiSectionPanel({
  page,
  notices,
  noticeContent,
  summary,
  sections,
  onDirtyChange,
  onDirtySectionsChange,
  footer,
}: {
  page: RecordDetailClientScaffoldContext
  notices?: RecordNotices
  noticeContent?: ReactNode
  summary?: RecordPageSummary
  sections: RecordPanelSectionConfig[]
  onDirtyChange?: (value: boolean) => void
  onDirtySectionsChange?: (sections: string[]) => void
  footer?: {
    deleteLabel?: string
    deleteConfirmMessage?: string
    onDelete?: () => void | Promise<void>
    onClose?: () => void
  }
}) {
  const context = useMemo<RecordMultiSectionPanelContext>(
    () => ({
      page,
      notices,
    }),
    [notices, page],
  )
  const resolvedSummary = summary ?? EMPTY_PANEL_SUMMARY
  const setDirtySections = page.setDirtySections
  const setSummary = page.setSummary
  const closePage = page.closePage
  const isPrimarySectionOpen = page.isPrimarySectionOpen

  const orderedSections = useMemo(
    () => [...sections].sort((left, right) => left.order - right.order),
    [sections],
  )

  const visibleSections = useMemo(
    () =>
      orderedSections.filter((section) => {
        if (section.slot === "primary" && !isPrimarySectionOpen) {
          return false
        }

        return section.visibleWhen ? section.visibleWhen(context) : true
      }),
    [context, isPrimarySectionOpen, orderedSections],
  )

  const dirtySections = useMemo(
    () =>
      orderedSections
        .filter((section) => section.controller?.isDirty)
        .map((section) => section.dirtyLabel ?? section.key),
    [orderedSections],
  )

  useEffect(() => {
    setDirtySections(dirtySections)
    onDirtyChange?.(dirtySections.length > 0)
    onDirtySectionsChange?.(dirtySections)
  }, [dirtySections, onDirtyChange, onDirtySectionsChange, setDirtySections])

  useEffect(() => {
    setSummary(resolvedSummary)
  }, [resolvedSummary, setSummary])

  return (
    <div className="space-y-4">
      {notices || noticeContent ? (
        <RecordPageActionNotices
          message={notices?.message}
          error={notices?.error}
        >
          {noticeContent}
        </RecordPageActionNotices>
      ) : null}

      <RecordSectionStack>
        {visibleSections.map((section) => (
          <Fragment key={section.key}>{section.render(context)}</Fragment>
        ))}
      </RecordSectionStack>

      {footer ? (
        <RecordPanelFooter
          deleteLabel={footer.deleteLabel}
          deleteConfirmMessage={footer.deleteConfirmMessage}
          onDelete={footer.onDelete}
          onClose={footer.onClose ?? closePage}
        />
      ) : null}
    </div>
  )
}
