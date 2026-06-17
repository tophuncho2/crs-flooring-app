"use client"

import { QuickCreateModal } from "@/engines/record-view"
import type { ManagementCompanyDetail } from "@builders/domain"
import { ManagementCompanyCellsSection } from "@/modules/management-companies/components/record/primary/management-company-cells-section"
import { useManagementCompanyQuickCreate } from "@/modules/management-companies/controllers/record/use-management-company-quick-create"

/**
 * The management-company **quick create** form mounted in a modal inside a record
 * view — the lean counterpart to the full `/dashboard/management-companies/new`
 * page. Reuses the shared `ManagementCompanyCellsSection` with
 * `showContactAndAddress={false}`, so the modal trims down to the required Company
 * Name cell only. Creates via `/api/management-companies`, then hands the created
 * `ManagementCompanyDetail` back through `onCreated` so the host fills the
 * originating cell — no navigation.
 *
 * Mount it conditionally (only while open) so each open starts from a clean
 * controller snapshot.
 */
export function ManagementCompanyQuickCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (managementCompany: ManagementCompanyDetail) => void
}) {
  const controller = useManagementCompanyQuickCreate()
  const editable = !controller.isSaving

  async function handleCreate() {
    const result = await controller.save()
    if (result?.managementCompany) {
      onCreated(result.managementCompany)
    }
  }

  return (
    <QuickCreateModal
      open={open}
      title="New Management Company"
      onClose={onClose}
      onCreate={() => void handleCreate()}
      canCreate={controller.canCreate}
      isSaving={controller.isSaving}
      error={controller.error}
    >
      <ManagementCompanyCellsSection
        form={controller.localValue}
        editable={editable}
        onFieldChange={(field, value) =>
          controller.setLocalValue((prev) => ({ ...prev, [field]: value }))
        }
        showContactAndAddress={false}
      />
    </QuickCreateModal>
  )
}
