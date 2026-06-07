"use client"

import type { ReactNode } from "react"
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog"
import { useRecordPageController, type RecordPageController } from "../controllers/use-record-page-controller"
import { RecordDetailPageShell } from "../../shell/record-detail-page-shell"
import { RecordModeNoticePortal } from "../../shell/record-mode-notice"

export type RecordDetailClientScaffoldContext = RecordPageController

export type RecordModeNoticeConfig = { mode: "form" | "edit"; label: string }

function resolveSlot(
  slot: ReactNode | ((context: RecordDetailClientScaffoldContext) => ReactNode) | undefined,
  context: RecordDetailClientScaffoldContext,
) {
  if (typeof slot === "function") {
    return slot(context)
  }

  return slot
}

export function RecordDetailClientScaffold({
  title,
  backHref,
  dirtyMessage,
  headerMeta,
  headerActions,
  headerVariant = "default",
  modeNotice,
  children,
}: {
  title: string
  backHref: string
  dirtyMessage: string
  headerMeta?: ReactNode | ((context: RecordDetailClientScaffoldContext) => ReactNode)
  headerActions?: ReactNode | ((context: RecordDetailClientScaffoldContext) => ReactNode)
  headerVariant?: "default" | "section"
  modeNotice?: RecordModeNoticeConfig
  children: (context: RecordDetailClientScaffoldContext) => ReactNode
}) {
  const page = useRecordPageController({
    backHref,
    dirtyMessage,
  })

  return (
    <>
      {modeNotice ? (
        <RecordModeNoticePortal mode={modeNotice.mode} label={modeNotice.label} />
      ) : null}
      <RecordDetailPageShell
        title={title}
        backHref={backHref}
        onBack={page.closePage}
        onHeaderToggle={headerVariant === "section" ? page.togglePrimarySectionOpen : undefined}
        isHeaderExpanded={headerVariant === "section" ? page.isPrimarySectionOpen : undefined}
        headerVariant={headerVariant}
        headerMeta={resolveSlot(headerMeta, page)}
        headerActions={resolveSlot(headerActions, page)}
      >
        {children(page)}
      </RecordDetailPageShell>
      <ConfirmDialog
        open={page.dirtyLeaveDialogProps.open}
        title="Discard unsaved changes?"
        message={page.dirtyLeaveDialogProps.message}
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        tone="warning"
        onConfirm={page.dirtyLeaveDialogProps.onConfirm}
        onCancel={page.dirtyLeaveDialogProps.onCancel}
      />
    </>
  )
}
