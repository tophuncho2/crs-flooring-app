"use client"

import { useQuery } from "@tanstack/react-query"
import {
  useEmbeddedRecordPageController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import {
  PROPERTY_DETAIL_QUERY_KEY,
  getPropertyDetailRequest,
} from "@/modules/management-companies/data/properties/property-detail-request"
import { PropertyRecordPanel } from "./property-record-panel"

/**
 * Property record view rendered **inside** the MC record view's properties
 * drilldown section. Fetches the property detail client-side, wraps the shared
 * host page in an embedded page proxy (shares the host's guard/dialog, keeps
 * its own dirty/summary state, routes "close" → `onBack`), and bridges its
 * dirtiness up via `onDirtyChange` so the host section reflects it.
 *
 * `deletable` opts into the property's "Delete Property" action — on for the MC
 * drilldown (edit), off for the MC create flow's linked-property section.
 */
export function PropertyRecordView({
  propertyId,
  hostPage,
  onBack,
  onDirtyChange,
  deletable = false,
  onShowList,
  showTemplates = true,
}: {
  propertyId: string
  hostPage: RecordDetailClientScaffoldContext
  onBack: () => void
  onDirtyChange?: (isDirty: boolean) => void
  deletable?: boolean
  /** In-section drilldown flip — see `PropertyRecordView`. Omitted by the MC
   *  create flow (no list to flip to). */
  onShowList?: () => void
  /** Off in the MC edit drilldown (the host shows an MC-wide templates
   *  reference header) — see `PropertyRecordPanel`. */
  showTemplates?: boolean
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
    <PropertyRecordPanel
      page={embeddedPage}
      entry={query.data}
      onDirtyChange={onDirtyChange}
      deletable={deletable}
      onShowList={onShowList}
      showTemplates={showTemplates}
    />
  )
}
