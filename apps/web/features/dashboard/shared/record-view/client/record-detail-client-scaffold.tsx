"use client"

import type { ReactNode } from "react"
import { RecordDetailPageShell } from "@/features/dashboard/shared/record-view/shell/record-detail-page-shell"
import {
  useRecordPageController,
  type RecordPageController,
} from "@/features/dashboard/shared/record-view/client/use-record-page-controller"

export type RecordDetailClientScaffoldContext = RecordPageController

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
  children,
}: {
  title: string
  backHref: string
  dirtyMessage: string
  headerMeta?: ReactNode | ((context: RecordDetailClientScaffoldContext) => ReactNode)
  headerActions?: ReactNode | ((context: RecordDetailClientScaffoldContext) => ReactNode)
  children: (context: RecordDetailClientScaffoldContext) => ReactNode
}) {
  const page = useRecordPageController({
    backHref,
    dirtyMessage,
  })

  return (
    <RecordDetailPageShell
      title={title}
      backHref={backHref}
      onBack={page.closePage}
      headerMeta={resolveSlot(headerMeta, page)}
      headerActions={resolveSlot(headerActions, page)}
    >
      {children(page)}
    </RecordDetailPageShell>
  )
}
