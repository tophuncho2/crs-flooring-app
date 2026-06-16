"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  RecordDetailClientScaffold,
  RecordStepperPortal,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { ImportRecordPanel } from "./import-record-panel"
import type {
  ImportDetail,
  ImportNeighbor,
  InventoryRow,
  StagedInventoryFilterRow,
  StagedInventoryRow,
} from "@builders/domain"

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
  const router = useRouter()
  const { previousImport, nextImport } = initialImport

  // Live rows fetched server-side; the read-only "Live inventory" section UI
  // lands in the next sweep. Keeping the data wired now so that work is
  // purely additive.
  const [liveRows] = useState(initialLiveRows)
  void liveRows

  // The import record view is a full SSR route (not in-place selection like
  // inventory/templates), so stepping is a route navigation to the neighbor.
  // Carry `backHref` through as `returnTo` so the neighbor's back button lands
  // wherever this record's did. The portal's dirty-guard prompts before the push.
  const stepTo = (neighbor: ImportNeighbor) => {
    const query = new URLSearchParams({ returnTo: backHref }).toString()
    router.push(`/dashboard/imports/${neighbor.id}?${query}`)
  }

  // Warm the neighbor routes so stepping lands on already-fetched data — a step
  // is a soft nav (the shell + stepper stay mounted), so with the page segment
  // prefetched the swap is near-instant.
  useEffect(() => {
    if (previousImport) router.prefetch(`/dashboard/imports/${previousImport.id}`)
    if (nextImport) router.prefetch(`/dashboard/imports/${nextImport.id}`)
  }, [previousImport, nextImport, router])

  return (
    <RecordDetailClientScaffold
      title="Imports Hub"
      backHref={backHref}
      dirtyMessage="You have unsaved import changes. Leave this import record without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <>
          {/* Top-bar stepper — walks the global import-number line. Mounted
              here off the SSR snapshot so the label/neighbors come straight from
              the loaded record; each step is a route nav to the neighbor. */}
          <RecordStepperPortal
            label={`IMP-${initialImport.importNumber}`}
            isDirty={page.isDirty}
            discardMessage="This import has unsaved changes. Stepping to another import will discard them."
            onPrevious={previousImport ? () => stepTo(previousImport) : null}
            onNext={nextImport ? () => stepTo(nextImport) : null}
          />
          <ImportRecordPanel
            page={page}
            entry={initialImport}
            initialFilterRows={initialFilterRows}
            initialStagedRows={initialStagedRows}
          />
        </>
      )}
    </RecordDetailClientScaffold>
  )
}
