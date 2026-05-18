"use client"

import { normalizeAddressState } from "@builders/domain"
import { RecordCreateClientScaffold } from "@/scaffolds/record-create-client-scaffold"
import type { RecordDetailClientScaffoldContext } from "@/scaffolds/record-detail-client-scaffold"
import { RecordPanelFooter } from "@/components/panels/record-panel-footer"
import { RecordSingleSectionPanel } from "@/components/sections/panels/record-single-section-panel"
import { useSingleSectionCreateController } from "@/controllers/record/use-single-section-create-controller"
import { buildRecordDetailHref } from "@/hooks/navigation/routes"
import { createManagementCompanyRequest } from "@/modules/management-companies/data/mutations"
import type { ManagementCompanyDetail, ManagementCompanyForm } from "@builders/domain"
import { ManagementCompanyPrimaryFieldsSection } from "./primary/management-company-primary-fields-section"

const EMPTY_MANAGEMENT_COMPANY: ManagementCompanyDetail = {
  id: "new",
  updatedAt: "",
  name: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  fullAddress: "",
}

const EMPTY_MANAGEMENT_COMPANY_FORM: ManagementCompanyForm = {
  name: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
}

function ManagementCompanyCreatePanel({
  page,
  backHref,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
}) {
  const controller = useSingleSectionCreateController<ManagementCompanyForm>({
    page,
    createInitialValue: () => ({ ...EMPTY_MANAGEMENT_COMPANY_FORM }),
    createRecord: async (localValue) => {
      const payload = await createManagementCompanyRequest(localValue)

      return {
        redirectTo: buildRecordDetailHref("/dashboard/management-companies", payload.managementCompany.id, backHref),
      }
    },
  })

  return (
    <div className="space-y-4">
      <RecordSingleSectionPanel
        title="Management Company Details"
        controller={controller}
        showHeader={false}
        saveLabel="Create Company"
        savingLabel="Creating Company..."
      >
        <ManagementCompanyPrimaryFieldsSection
          company={EMPTY_MANAGEMENT_COMPANY}
          draft={controller.primarySection.localValue}
          disabled={controller.primarySection.isSaving}
          onFieldChange={(field, value) => {
            controller.primarySection.setLocalValue((previous) => ({
              ...previous,
              [field]: field === "state" ? normalizeAddressState(value) : value,
            }))
          }}
        />
      </RecordSingleSectionPanel>
      <RecordPanelFooter onClose={page.closePage} />
    </div>
  )
}

export function ManagementCompanyCreateClient({ backHref }: { backHref: string }) {
  return (
    <RecordCreateClientScaffold
      title="New Management Company"
      backHref={backHref}
      dirtyMessage="You have unsaved management company changes. Leave this form without saving?"
    >
      {(page) => <ManagementCompanyCreatePanel page={page} backHref={backHref} />}
    </RecordCreateClientScaffold>
  )
}
