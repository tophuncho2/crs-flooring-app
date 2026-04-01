"use client"

import { requestJson } from "@/features/flooring/shared/transport/http"
import { normalizeAddressState } from "@builders/domain"
import {
  RecordCreateClientScaffold,
  RecordPanelFooter,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/features/shared/engines/record-view"
import { buildRecordDetailHref } from "@/features/shared/engines/common/record-entry"
import type { ManagementCompanyDetail, ManagementCompanyForm } from "../../domain/types"
import { ManagementCompanyPrimaryFieldsSection } from "../panel/sections/management-company-primary-fields-section"

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
  properties: [],
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
      const payload = await requestJson<{ managementCompany: ManagementCompanyDetail }>("/api/flooring/management-companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localValue),
      })

      return {
        redirectTo: buildRecordDetailHref("/dashboard/flooring/management-companies", payload.managementCompany.id, backHref),
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
