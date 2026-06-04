"use client"

import type { ReactNode } from "react"
import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "./record-detail-client-scaffold"

export function RecordCreateClientScaffold({
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
  return (
    <RecordDetailClientScaffold
      title={title}
      backHref={backHref}
      dirtyMessage={dirtyMessage}
      headerVariant="section"
      headerMeta={headerMeta}
      headerActions={headerActions}
    >
      {children}
    </RecordDetailClientScaffold>
  )
}
