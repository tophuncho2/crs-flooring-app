"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import type { PropertyListRow } from "@builders/domain"
import { DataTable, useRecordSectionPagination } from "@/engines/list-view"
import { RecordItemSection } from "@/engines/record-view"
import {
  PROPERTIES_LIST_QUERY_KEY,
  listPropertiesRequest,
} from "@/modules/properties/data/list-properties-request"
import { PROPERTIES_LIST_COLUMNS } from "@/modules/properties/components/list/table/properties-list-columns"
import { renderPropertyRowCell } from "@/modules/properties/components/list/table/properties-row-cell"

// The canonical properties list columns minus the Entity column —
// redundant here, where every row already belongs to the same entity.
const PROPERTIES_SECTION_COLUMNS = PROPERTIES_LIST_COLUMNS.filter(
  (column) => column.key !== "entity",
)

/**
 * Properties linked to a entity — §2 of the entity record view, on the
 * canonical `RecordItemSection` chrome (persistent blue header). "+ Property"
 * lives in the section sub-header beside the row-count summary; the body is a
 * paginated list-view `DataTable` over the same columns as the properties URL
 * list (minus the entity column). Row click **navigates** to that property's
 * standalone record view (`onSelect`); "+ Property" opens the management form
 * pre-linked to this entity (`onCreate`). Pagination is engine-owned via
 * {@link useRecordSectionPagination}.
 */
export function LinkedPropertiesList({
  entityId,
  onSelect,
  onCreate,
}: {
  entityId: string
  onSelect: (propertyId: string) => void
  onCreate: () => void
}) {
  const pager = useRecordSectionPagination()

  const query = useQuery({
    queryKey: [...PROPERTIES_LIST_QUERY_KEY, "entity-record-section", entityId, pager.page],
    queryFn: () =>
      listPropertiesRequest({
        filters: { entityId: [entityId] },
        page: pager.page,
        pageSize: pager.pageSize,
      }),
  })

  const rows = useMemo(() => query.data?.rows ?? [], [query.data])
  const total = query.data?.total ?? 0

  return (
    <RecordItemSection
      title="Properties"
      subHeader={{
        canManage: false,
        showStatus: false,
        isDirty: false,
        isSaving: false,
        hasConflict: false,
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
        pagination={pager.toContract(total)}
      />
    </RecordItemSection>
  )
}
