"use client"

import { useQuery } from "@tanstack/react-query"
import {
  useEmbeddedRecordPageController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import {
  PROPERTY_DETAIL_QUERY_KEY,
  getPropertyDetailRequest,
} from "@/modules/properties/data/property-detail-request"
import { PropertyRecordView } from "./property-record-view"

/**
 * Property record view rendered **inside** the MC record view's properties
 * drilldown section. Fetches the property detail client-side, wraps the shared
 * host page in an embedded page proxy (shares the host's guard/dialog, keeps
 * its own dirty/summary state, routes "close" → `onBack`), and bridges its
 * dirtiness up via `onDirtyChange` so the host section reflects it.
 */
export function EmbeddedPropertyRecordView({
  propertyId,
  hostPage,
  onBack,
  onDirtyChange,
}: {
  propertyId: string
  hostPage: RecordDetailClientScaffoldContext
  onBack: () => void
  onDirtyChange?: (isDirty: boolean) => void
}) {
  const embeddedPage = useEmbeddedRecordPageController({ host: hostPage, onNavigateBack: onBack })

  const query = useQuery({
    queryKey: [...PROPERTY_DETAIL_QUERY_KEY, propertyId],
    queryFn: () => getPropertyDetailRequest(propertyId),
  })

  if (query.isLoading) {
    return <p className="text-sm text-[var(--foreground)]/60">Loading property…</p>
  }
  if (query.isError || !query.data) {
    return <p className="text-sm text-rose-400">Could not load property.</p>
  }

  return (
    <PropertyRecordView
      page={embeddedPage}
      entry={query.data}
      embedded
      onDirtyChange={onDirtyChange}
    />
  )
}
