"use client"

import { normalizeAddressState } from "@builders/domain"
import {
  RecordCreateClientScaffold,
  RecordPanelFooter,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { buildRecordDetailHref } from "@/modules/shared/engines/common/record-entry"
import { createPropertyRequest } from "@/modules/properties/data/mutations"
import type { PropertyDetailRecord, PropertyPrimaryForm } from "@builders/domain"
import { PropertyPrimaryFieldsSection } from "./property-primary-fields-section"

const EMPTY_PROPERTY: PropertyDetailRecord = {
  id: "new",
  updatedAt: "",
  name: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  instructions: "",
  fullAddress: "",
  managementCompany: null,
}

const EMPTY_PROPERTY_FORM: PropertyPrimaryForm = {
  name: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  instructions: "",
  managementCompanyId: "",
}

function PropertyCreatePanel({
  page,
  backHref,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
}) {
  const controller = useSingleSectionCreateController<PropertyPrimaryForm>({
    page,
    createInitialValue: () => ({ ...EMPTY_PROPERTY_FORM }),
    createRecord: async (localValue) => {
      const payload = await createPropertyRequest(localValue)

      return {
        redirectTo: buildRecordDetailHref("/dashboard/properties", payload.property.id, backHref),
      }
    },
  })

  return (
    <div className="space-y-4">
      <RecordSingleSectionPanel
        title="Property Details"
        controller={controller}
        showHeader={false}
        saveLabel="Create Property"
        savingLabel="Creating Property..."
      >
        <PropertyPrimaryFieldsSection
          property={EMPTY_PROPERTY}
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

export function PropertyCreateClient({ backHref }: { backHref: string }) {
  return (
    <RecordCreateClientScaffold
      title="New Property"
      backHref={backHref}
      dirtyMessage="You have unsaved property changes. Leave this form without saving?"
    >
      {(page) => <PropertyCreatePanel page={page} backHref={backHref} />}
    </RecordCreateClientScaffold>
  )
}
