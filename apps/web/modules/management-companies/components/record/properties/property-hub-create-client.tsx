"use client"

import {
  ChoiceDialog,
  RecordCreateClientScaffold,
  RecordSingleSectionPanel,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { EMPTY_MANAGEMENT_COMPANY_FORM } from "@builders/domain"
import { ActionHeader } from "@/engines/common"
import { usePropertyHubCreateSection } from "@/modules/management-companies/controllers/record/properties/use-property-hub-create-section"
import { ManagementCompanySelectSection } from "./primary/management-company-select-section"
import { PropertyCreateFieldsSection } from "./primary/property-create-fields-section"

const SECTION_CARD_CLASS =
  "rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]"

/**
 * The unified property "hub" create form on the record-view engine — replaces
 * the retired hub side panel. One Create button over two groups: a management
 * company (link or create) and the property fields. Saving creates them
 * atomically via `/api/properties/hub` and lands on the created record.
 */
export type HubCreateManagementCompanySeed = { id: string; label: string | null }

function PropertyHubCreatePanel({
  page,
  backHref,
  initialManagementCompany,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
  initialManagementCompany?: HubCreateManagementCompanySeed | null
}) {
  const controller = usePropertyHubCreateSection({ page, backHref, initialManagementCompany })
  const primary = controller.primarySection
  const editable = !primary.isSaving

  return (
    <>
    <RecordSingleSectionPanel
      title="New Property"
      controller={controller}
      showHeader={false}
      saveLabel="Create"
      savingLabel="Creating…"
    >
      <div className="space-y-4">
        <ManagementCompanySelectSection
          value={primary.localValue}
          disabled={!editable}
          onLink={(option) =>
            primary.setLocalValue((prev) =>
              option
                ? {
                    ...prev,
                    mcLinkId: option.id,
                    mcLinkLabel: option.name,
                    mcForm: EMPTY_MANAGEMENT_COMPANY_FORM,
                  }
                : { ...prev, mcLinkId: null, mcLinkLabel: null },
            )
          }
          onMcFieldChange={(field, next) =>
            primary.setLocalValue((prev) => ({
              ...prev,
              mcLinkId: null,
              mcLinkLabel: null,
              mcForm: { ...prev.mcForm, [field]: next },
            }))
          }
        />

        <div className={SECTION_CARD_CLASS}>
          <ActionHeader title="Property" />
          <div className="p-4">
            <PropertyCreateFieldsSection
              draft={primary.localValue.propertyForm}
              editable={editable}
              onFieldChange={(field, next) =>
                primary.setLocalValue((prev) => ({
                  ...prev,
                  propertyForm: { ...prev.propertyForm, [field]: next },
                }))
              }
            />
          </div>
        </div>
      </div>
    </RecordSingleSectionPanel>
    {controller.choiceDialog ? (
      <ChoiceDialog
        open={controller.choiceDialog.open}
        title="Created"
        message="The management company and property were both created. Where would you like to go?"
        primaryLabel="Go to property"
        onPrimary={controller.choiceDialog.goToProperty}
        secondaryLabel="Go to management company"
        onSecondary={controller.choiceDialog.goToManagementCompany}
      />
    ) : null}
    </>
  )
}

export function PropertyHubCreateClient({
  backHref,
  initialManagementCompany,
}: {
  backHref: string
  initialManagementCompany?: HubCreateManagementCompanySeed | null
}) {
  return (
    <RecordCreateClientScaffold
      title="New Property"
      backHref={backHref}
      dirtyMessage="You have unsaved changes. Leave this form without saving?"
      modeNoticeLabel="Management"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <PropertyHubCreatePanel
          page={page}
          backHref={backHref}
          initialManagementCompany={initialManagementCompany}
        />
      )}
    </RecordCreateClientScaffold>
  )
}
