"use client"

import { requestJson } from "@/features/flooring/shared/transport/http"
import {
  RecordCreateClientScaffold,
  RecordPanelFooter,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/features/shared/engines/record-view"
import { buildRecordDetailHref } from "@/features/shared/engines/common/record-entry"
import {
  EMPTY_UNIT_OF_MEASURE_FORM,
  type UnitOfMeasureForm,
  type UnitOfMeasureRow,
} from "../../domain/types"
import { UnitOfMeasurePrimaryFieldsSection } from "../panel/sections/unit-of-measure-primary-fields-section"

const EMPTY_UNIT_OF_MEASURE: UnitOfMeasureRow = {
  id: "new",
  name: "",
  createdAt: "",
  updatedAt: "",
}

function UnitOfMeasureCreatePanel({
  page,
  backHref,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
}) {
  const controller = useSingleSectionCreateController<UnitOfMeasureForm>({
    page,
    createInitialValue: () => ({ ...EMPTY_UNIT_OF_MEASURE_FORM }),
    createRecord: async (localValue) => {
      const payload = await requestJson<{ unitOfMeasure: UnitOfMeasureRow }>("/api/builder/unit-of-measures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localValue),
      })

      return {
        redirectTo: buildRecordDetailHref("/dashboard/flooring/unit-of-measures", payload.unitOfMeasure.id, backHref),
      }
    },
  })

  return (
    <div className="space-y-4">
      <RecordSingleSectionPanel
        title="Unit Of Measure Details"
        controller={controller}
        showHeader={false}
        saveLabel="Create Unit Of Measure"
        savingLabel="Creating Unit Of Measure..."
      >
        <UnitOfMeasurePrimaryFieldsSection
          unitOfMeasure={EMPTY_UNIT_OF_MEASURE}
          draft={controller.primarySection.localValue}
          disabled={controller.primarySection.isSaving}
          onChange={(value) => {
            controller.primarySection.setLocalValue({ name: value })
          }}
        />
      </RecordSingleSectionPanel>
      <RecordPanelFooter onClose={page.closePage} />
    </div>
  )
}

export function UnitOfMeasureCreateClient({ backHref }: { backHref: string }) {
  return (
    <RecordCreateClientScaffold
      title="New Unit Of Measure"
      backHref={backHref}
      dirtyMessage="You have unsaved unit of measure changes. Leave this form without saving?"
    >
      {(page) => <UnitOfMeasureCreatePanel page={page} backHref={backHref} />}
    </RecordCreateClientScaffold>
  )
}
