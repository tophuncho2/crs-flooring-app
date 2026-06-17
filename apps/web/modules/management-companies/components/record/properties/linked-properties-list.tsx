"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { PropertyListRow } from "@builders/domain"
import { DataTable } from "@/engines/list-view"
import { RecordItemSection } from "@/engines/record-view"
import {
  PROPERTIES_LIST_QUERY_KEY,
  listPropertiesRequest,
} from "@/modules/properties/data/list-properties-request"
import { PROPERTIES_LIST_COLUMNS } from "@/modules/properties/components/list/table/properties-list-columns"
import { renderPropertyRowCell } from "@/modules/properties/components/list/table/properties-row-cell"

const SECTION_PAGE_SIZE = 15

// The canonical properties list columns minus the Management Company column —
// redundant here, where every row already belongs to the same MC.
const PROPERTIES_SECTION_COLUMNS = PROPERTIES_LIST_COLUMNS.filter(
  (column) => column.key !== "managementCompany",
)

/**
 * Properties linked to a management company — §2 of the MC record view, on the
 * canonical `RecordItemSection` chrome (persistent blue header). "+ Property"
 * lives in the section sub-header beside the row-count summary; the body is a
 * paginated list-view `DataTable` over the same columns as the properties URL
 * list (minus the MC column). Row click **navigates** to that property's
 * standalone record view (`onSelect`); "+ Property" opens the management form
 * pre-linked to this company (`onCreate`). Paginated at {@link SECTION_PAGE_SIZE}
 * rows per page.
 */
export function LinkedPropertiesList({
  managementCompanyId,
  onSelect,
  onCreate,
}: {
  managementCompanyId: string
  onSelect: (propertyId: string) => void
  onCreate: () => void
}) {
  const [page, setPage] = useState(1)

  const query = useQuery({
    queryKey: [...PROPERTIES_LIST_QUERY_KEY, "mc-record-section", managementCompanyId, page],
    queryFn: () =>
      listPropertiesRequest({
        filters: { managementCompanyId: [managementCompanyId] },
        page,
        pageSize: SECTION_PAGE_SIZE,
      }),
  })

  const rows = useMemo(() => query.data?.rows ?? [], [query.data])
  const total = query.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / SECTION_PAGE_SIZE))

  return (
    <RecordItemSection
      title="Properties"
      subHeader={{
        canManage: false,
        showStatus: false,
        isDirty: false,
        isSaving: false,
        hasConflict: false,
        summary: `${total} ${total === 1 ? "property" : "properties"}`,
        actions: [
          { key: "add-property", label: "+ Property", tone: "primary", onClick: onCreate },
        ],
      }}
    >
      <DataTable<PropertyListRow>
        rows={rows}
        columns={PROPERTIES_SECTION_COLUMNS}
        renderCell={renderPropertyRowCell}
        empty={
          query.isError
            ? "Could not load properties."
            : query.isLoading
              ? "Loading properties…"
              : "No linked properties yet."
        }
        onOpenRow={(row) => onSelect(row.id)}
        getRowAriaLabel={(row) => `Open property ${row.name}`}
        pagination={{
          page,
          pageSize: SECTION_PAGE_SIZE,
          totalItems: total,
          totalPages,
          hasPreviousPage: page > 1,
          hasNextPage: page < totalPages,
          onPreviousPage: () => setPage((p) => Math.max(1, p - 1)),
          onNextPage: () => setPage((p) => Math.min(totalPages, p + 1)),
        }}
      />
    </RecordItemSection>
  )
}
