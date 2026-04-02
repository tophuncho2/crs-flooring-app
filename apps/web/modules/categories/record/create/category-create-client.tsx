"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import { withMutationMeta } from "@/modules/shared/engines/common/transport/mutation"
import {
  RecordCreateClientScaffold,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { buildRecordDetailHref } from "@/modules/shared/engines/common/record-entry"
import {
  EMPTY_CATEGORY_FORM,
  type CategoryForm,
  type CategoryRow,
  type UnitOfMeasureOption,
} from "../../domain/types"
import { CategoryPrimaryFieldsSection } from "../panel/sections/category-primary-fields-section"

const EMPTY_CATEGORY: CategoryRow = {
  id: "new",
  name: "",
  sendUnitId: "",
  stockUnitId: "",
  coverageAvailableUnitId: "",
  itemCoverageUnitId: "",
  serviceUnitId: "",
  sendUnit: "",
  stockUnit: "",
  coverageAvailableUnit: "",
  itemCoverageUnit: "",
  serviceUnit: "",
  productCount: 0,
  createdAt: "",
  updatedAt: "",
}

function CategoryCreatePanel({
  page,
  backHref,
  unitOfMeasureOptions,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
  unitOfMeasureOptions: UnitOfMeasureOption[]
}) {
  const controller = useSingleSectionCreateController<CategoryForm>({
    page,
    createInitialValue: () => ({ ...EMPTY_CATEGORY_FORM }),
    createRecord: async (localValue) => {
      const payload = await requestJson<{ category: CategoryRow }>("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withMutationMeta(localValue)),
      })

      return {
        redirectTo: buildRecordDetailHref("/dashboard/categories", payload.category.id, backHref),
      }
    },
  })

  return (
    <RecordSingleSectionPanel
      title="Category Details"
      controller={controller}
      showHeader={false}
      saveLabel="Create Category"
      savingLabel="Creating Category..."
      footer={{ onClose: page.closePage }}
    >
      <CategoryPrimaryFieldsSection
        category={EMPTY_CATEGORY}
        draft={controller.primarySection.localValue}
        unitOfMeasureOptions={unitOfMeasureOptions}
        disabled={controller.primarySection.isSaving}
        onFieldChange={(field, value) => {
          controller.primarySection.setLocalValue((previous) => ({
            ...previous,
            [field]: value,
          }))
        }}
      />
    </RecordSingleSectionPanel>
  )
}

export function CategoryCreateClient({
  backHref,
  unitOfMeasureOptions,
}: {
  backHref: string
  unitOfMeasureOptions: UnitOfMeasureOption[]
}) {
  return (
    <RecordCreateClientScaffold
      title="New Category"
      backHref={backHref}
      dirtyMessage="You have unsaved category changes. Leave this form without saving?"
    >
      {(page) => (
        <CategoryCreatePanel page={page} backHref={backHref} unitOfMeasureOptions={unitOfMeasureOptions} />
      )}
    </RecordCreateClientScaffold>
  )
}
