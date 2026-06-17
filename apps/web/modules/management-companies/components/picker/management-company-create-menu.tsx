"use client"

import { RecordCreateMenu } from "@/engines/common"
import { ManagementCompanyQuickCreateModal } from "@/modules/management-companies/components/record/management-company-quick-create-modal"
import type { ManagementCompanyDetail, ManagementCompanyOption } from "@builders/domain"

/**
 * Map a freshly created MC record into the `ManagementCompanyOption` shape the MC
 * cell fills from, so a quick-created company seeds the originating cell exactly
 * like a picked one.
 */
function toManagementCompanyOption(
  managementCompany: ManagementCompanyDetail,
): ManagementCompanyOption {
  return {
    id: managementCompany.id,
    name: managementCompany.name,
    streetAddress: managementCompany.streetAddress,
    city: managementCompany.city,
    state: managementCompany.state,
    zip: managementCompany.zip,
    phone: managementCompany.phone,
    email: managementCompany.email,
    fullAddress: managementCompany.fullAddress,
  }
}

/**
 * The shared "new management company" affordance for a record-view MC cell: a ⋮
 * options menu offering **Quick form** (the inline `ManagementCompanyQuickCreateModal`,
 * which fills the originating cell with no navigation) and **Proper form**
 * (navigate to the full MC create page). Drops straight into a `FormField`
 * `actions` slot beside the cell's `RecordOpenButton`.
 *
 * Self-contained: it owns the modal open-state and the record→option mapping; the
 * host supplies `returnTo` and an `onCreated` that fills its cell from the returned
 * `ManagementCompanyOption` — the same handler its picker already runs for a picked
 * option.
 */
export function ManagementCompanyCreateMenu({
  returnTo,
  onCreated,
}: {
  /** Record-entry path the proper-form route returns to after create. */
  returnTo: string
  /** Fired with the created company mapped to a `ManagementCompanyOption`. */
  onCreated: (option: ManagementCompanyOption) => void
}) {
  return (
    <RecordCreateMenu
      heading="New management company"
      basePath="/dashboard/management-companies"
      returnTo={returnTo}
      renderModal={({ open, onClose }) => (
        <ManagementCompanyQuickCreateModal
          open={open}
          onClose={onClose}
          onCreated={(managementCompany) => {
            onCreated(toManagementCompanyOption(managementCompany))
            onClose()
          }}
        />
      )}
    />
  )
}
