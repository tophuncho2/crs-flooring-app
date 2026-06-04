"use client"

import { Fragment, useEffect, useMemo, type ReactNode } from "react"
import type { RecordNotices } from "../client/hooks/use-record-notices"
import type { RecordPageSummary } from "../client/controllers/use-record-page-controller"
import { RecordPageActionNotices } from "../feedback/record-page-action-notices"
import { RecordSectionStack } from "../sections/structure/record-section-stack"
import { RecordPanelFooter } from "../shell/record-panel-footer"
import type {
  RecordPanelContext,
  RecordPanelFooterConfig,
  RecordPanelSectionConfig,
} from "./record-panel-config"

const EMPTY_PANEL_SUMMARY: RecordPageSummary = {
  metrics: [],
}

export type RecordPanelRendererProps = {
  page: RecordPanelContext["page"]
  notices?: RecordNotices
  noticeContent?: ReactNode
  summary?: RecordPageSummary
  sections: RecordPanelSectionConfig[]
  onDirtyChange?: (value: boolean) => void
  onDirtySectionsChange?: (sections: string[]) => void
  footer?: RecordPanelFooterConfig
}

export function RecordPanelRenderer({
  page,
  notices,
  noticeContent,
  summary,
  sections,
  onDirtyChange,
  onDirtySectionsChange,
  footer,
}: RecordPanelRendererProps) {
  const context = useMemo<RecordPanelContext>(
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
