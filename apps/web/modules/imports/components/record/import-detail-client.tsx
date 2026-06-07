"use client"

import { useState } from "react"
import { RecordDetailClientScaffold, type RecordDetailClientScaffoldContext } from "@/engines/record-view"
import { ImportRecordPanel } from "./import-record-panel"
import type {
  ImportDetail,
  InventoryRow,
  StagedInventoryFilterRow,
  StagedInventoryRow,
} from "@builders/domain"

function formatImportNumber(value: number) {
  return `IMP-${value}`
}

export function ImportDetailClient({
  initialImport,
  initialFilterRows,
  initialStagedRows,
  initialLiveRows,
  backHref,
}: {
  initialImport: ImportDetail
  initialFilterRows: StagedInventoryFilterRow[]
  initialStagedRows: StagedInventoryRow[]
  initialLiveRows: InventoryRow[]
  backHref: string
}) {
  // Live rows fetched server-side; the read-only "Live inventory" section UI
  // lands in the next sweep. Keeping the data wired now so that work is
  // purely additive.
  const [liveRows] = useState(initialLiveRows)
  void liveRows

  return (
    <RecordDetailClientScaffold
      title={`Import ${formatImportNumber(initialImport.importNumber)}`}
      backHref={backHref}
      modeNotice={{ mode: "edit", label: "Import" }}
      dirtyMessage="You have unsaved import changes. Leave this import record without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <ImportRecordPanel
          page={page}
          entry={initialImport}
          initialFilterRows={initialFilterRows}
          initialStagedRows={initialStagedRows}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
