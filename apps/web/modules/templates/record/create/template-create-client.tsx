"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import {
  RecordCreateClientScaffold,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { buildRecordDetailHref } from "@/modules/shared/engines/common/record-entry"
import { TemplatePrimaryFieldsSection } from "../panel/sections/template-primary-fields-section"
import type { DraftTemplate, PadProductOption, PropertyOption, TemplateRow, WarehouseOption } from "../../types"

const EMPTY_TEMPLATE_DRAFT: DraftTemplate = {
  templateTag: "",
  propertyId: "",
  warehouseId: "",
  instructions: "",
  templateNotes: "",
  padProductId: "",
}

function TemplateCreatePanel({
  page,
  backHref,
  propertyOptions,
  warehouseOptions,
  padProductOptions,
  initialPropertyId,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  padProductOptions: PadProductOption[]
  initialPropertyId: string
}) {
  const controller = useSingleSectionCreateController<DraftTemplate>({
    page,
    createInitialValue: () => ({
      ...EMPTY_TEMPLATE_DRAFT,
      propertyId: initialPropertyId,
    }),
    createRecord: async (localValue) => {
      const payload = await requestJson<{ template: TemplateRow }>("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...localValue,
          warehouseId: localValue.warehouseId || null,
          padProductId: localValue.padProductId || null,
        }),
      })

      return {
        redirectTo: buildRecordDetailHref("/dashboard/templates", payload.template.id, backHref),
      }
    },
  })

  return (
    <RecordSingleSectionPanel
      title="Template Details"
      controller={controller}
      showHeader={false}
      saveLabel="Save"
      savingLabel="Saving..."
      footer={{ onClose: page.closePage }}
    >
      <TemplatePrimaryFieldsSection
        draft={controller.primarySection.localValue}
        propertyOptions={propertyOptions}
        warehouseOptions={warehouseOptions}
        padProductOptions={padProductOptions}
        propertyLocked={Boolean(initialPropertyId)}
        setDraft={controller.primarySection.setLocalValue}
      />
    </RecordSingleSectionPanel>
  )
}

export function TemplateCreateClient({
  backHref,
  propertyOptions,
  warehouseOptions,
  padProductOptions,
  initialPropertyId,
}: {
  backHref: string
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  padProductOptions: PadProductOption[]
  initialPropertyId: string
}) {
  return (
    <RecordCreateClientScaffold
      title="New Template"
      backHref={backHref}
      dirtyMessage="You have unsaved template changes. Leave this form without saving?"
    >
      {(page) => (
        <TemplateCreatePanel
          page={page}
          backHref={backHref}
          propertyOptions={propertyOptions}
          warehouseOptions={warehouseOptions}
          padProductOptions={padProductOptions}
          initialPropertyId={initialPropertyId}
        />
      )}
    </RecordCreateClientScaffold>
  )
}
