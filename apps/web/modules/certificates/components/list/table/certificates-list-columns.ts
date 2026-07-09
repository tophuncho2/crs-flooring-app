import type { DataTableColumn } from "@/engines/list-view"
import type { CertificateListRow } from "@builders/domain"

/**
 * Column definitions for the certificates list-view `DataTable`. Order is the
 * visual left-to-right order. No Sort UI ships yet (the list falls to its server
 * default `expirationDate ASC`), so headers are static labels.
 */
export const CERTIFICATES_LIST_COLUMNS: ReadonlyArray<DataTableColumn<CertificateListRow>> = [
  { key: "name", label: "Certificate" },
  { key: "entity", label: "Entity" },
  { key: "expirationDate", label: "Expires" },
  { key: "status", label: "Status" },
  { key: "internalNotes", label: "Notes" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
  { key: "createdBy", label: "Created by" },
  { key: "updatedBy", label: "Updated by" },
]
