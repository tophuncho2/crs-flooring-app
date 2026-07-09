"use client"

import { useCallback, useMemo } from "react"
import { SlidersHorizontal } from "lucide-react"
import {
  ListActionBar,
  ListCreateButtonPortal,
  ListPageShell,
  ListPageFeedback,
  ToolbarMenuButton,
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
} from "@/engines/list-view"
import type { CertificatesListFilters, ListInput } from "@builders/application"
import {
  LIST_CERTIFICATES_PAGE_SIZE,
  type CertificateListRow,
  type EntityOption,
} from "@builders/domain"
import {
  CERTIFICATES_LIST_QUERY_KEY,
  listCertificatesRequest,
} from "@/modules/certificates/data/list-certificates-request"
import { useCertificatesListController } from "@/modules/certificates/controllers/list/use-certificates-list-controller"
import { CertificatesTable } from "./certificates-table"
import { EntityFilterChip } from "./toolbar-controls/entity-filter-chip"

const CERTIFICATES_FILTERABLE_FIELDS = ["entityId"] as const

// The list-view engine stores every filter value as `string[]`. The app filter
// type is already array-shaped (entityId), so the bridge is a near-identity.
type EngineCertificateFilters = {
  entityId?: ReadonlyArray<string>
}

function toEngineFilters(app: CertificatesListFilters): EngineCertificateFilters {
  const out: EngineCertificateFilters = {}
  if (app.entityId?.length) out.entityId = app.entityId
  return out
}

function toAppFilters(engine: EngineCertificateFilters): CertificatesListFilters {
  const out: CertificatesListFilters = {}
  if (engine.entityId?.length) out.entityId = engine.entityId
  return out
}

export type CertificatesClientProps = {
  initialSearchQuery: string
  initialPage: number
  initialFilters: CertificatesListFilters
  initialEntityOptions: EntityOption[]
  initialSelectedEntity?: EntityOption | null
}

export default function CertificatesClient({
  initialSearchQuery,
  initialPage,
  initialFilters,
  initialEntityOptions,
  initialSelectedEntity = null,
}: CertificatesClientProps) {
  const { message, pageError, openCreate, openCertificate } = useCertificatesListController()

  const adaptedListFn = useCallback(
    (input: ListInput<EngineCertificateFilters>) =>
      listCertificatesRequest({
        ...input,
        filters: input.filters ? toAppFilters(input.filters) : undefined,
      }),
    [],
  )

  const {
    rows,
    total,
    filters,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    onFilterChange,
    onClearAllFilters,
    columnWidths,
    onColumnWidthsChange,
  } = useFetchListController<CertificateListRow, EngineCertificateFilters>({
    mode: "fetch",
    queryKey: [...CERTIFICATES_LIST_QUERY_KEY],
    listFn: adaptedListFn,
    initialSearchQuery,
    initialPage,
    initialFilters: toEngineFilters(initialFilters),
    pageSize: LIST_CERTIFICATES_PAGE_SIZE,
    tableKey: "certificates-main",
    filterableFields: CERTIFICATES_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const selectedEntityId = filters.entityId?.[0] ?? null

  const selectedEntityLabel = useMemo(() => {
    if (!selectedEntityId) return null
    if (initialSelectedEntity?.id === selectedEntityId) {
      return initialSelectedEntity.entity
    }
    return (
      initialEntityOptions.find((option) => option.id === selectedEntityId)?.entity ?? null
    )
  }, [selectedEntityId, initialSelectedEntity, initialEntityOptions])

  const handleEntityChange = useCallback(
    (id: string | null) => {
      onFilterChange("entityId", id ? [id] : [])
    },
    [onFilterChange],
  )

  const hasActiveFilters = Boolean(selectedEntityId)

  return (
    <ListPageShell fill>
      <ListCreateButtonPortal label="Certificate" onClick={() => openCreate()} />

      <ListPageFeedback message={message} pageError={pageError} />

      <ListActionBar
        label="Certificate Tracking"
        rowCount={rows.length}
        total={total}
        rowCountLabel="certificates"
        hasActiveFilters={hasActiveFilters}
        onClearAll={onClearAllFilters}
      >
        <ToolbarMenuButton label="Filter" icon={SlidersHorizontal} active={hasActiveFilters}>
          <EntityFilterChip
            selectedEntityId={selectedEntityId}
            selectedEntityLabel={selectedEntityLabel}
            onChange={handleEntityChange}
            initialOptions={initialEntityOptions}
          />
        </ToolbarMenuButton>
      </ListActionBar>

      <CertificatesTable
        rows={rows}
        onOpenCertificate={(row) => openCertificate(row.id)}
        pagination={{
          page,
          pageSize,
          totalItems: total,
          totalPages,
          hasPreviousPage,
          hasNextPage,
          onPreviousPage: goToPreviousPage,
          onNextPage: goToNextPage,
        }}
        columnWidths={columnWidths}
        onColumnWidthsChange={onColumnWidthsChange}
      />
    </ListPageShell>
  )
}
