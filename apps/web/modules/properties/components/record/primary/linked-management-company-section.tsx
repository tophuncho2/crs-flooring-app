"use client"

import type { ManagementCompanyForm } from "@builders/domain"
import { ActionHeader } from "@/engines/common"
import { ManagementCompanyCellsSection } from "@/modules/management-companies/components/record/primary/management-company-cells-section"

/**
 * The Property record view's read-only view of its linked management company,
 * rendered at the top of §1 above the editable property fields. Reuses the
 * shared `ManagementCompanyCellsSection` in its read-only mode (the same grid
 * the MC record view edits) and offers a single hand-off to the MC record view —
 * the MC is not re-linkable from here (that happens through the management form).
 */
export function LinkedManagementCompanySection({
  managementCompany,
  onOpen,
}: {
  managementCompany: ManagementCompanyForm
  onOpen: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <ActionHeader
        title="Management Company"
        actions={[
          { key: "open", label: "Open management company ↗", onClick: onOpen, kind: "secondary" },
        ]}
      />
      <ManagementCompanyCellsSection form={managementCompany} editable={false} />
    </div>
  )
}
