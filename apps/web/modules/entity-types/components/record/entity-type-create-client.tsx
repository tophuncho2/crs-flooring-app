"use client"

import { buildRecordDetailHref } from "@/hooks/navigation"
import {
  RecordCreateClientScaffold,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { EMPTY_ENTITY_TYPE_FORM, type EntityTypeForm } from "@builders/domain"
import { createEntityTypeRequest } from "@/modules/entity-types/data/mutations"
import { EntityTypePrimaryFieldsSection } from "./primary/entity-type-primary-fields-section"

function EntityTypeCreatePanel({
  page,
  backHref,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
}) {
  const controller = useSingleSectionCreateController<EntityTypeForm>({
    page,
    createInitialValue: () => ({ ...EMPTY_ENTITY_TYPE_FORM }),
    createRecord: async (localValue) => {
      const { entityType } = await createEntityTypeRequest(localValue)
      return {
        redirectTo: buildRecordDetailHref("/dashboard/entity-types", entityType.id, backHref),
      }
    },
  })

  return (
    <RecordSingleSectionPanel
      title="Entity Type Details"
      controller={controller}
      showHeader={false}
      saveLabel="Create"
      savingLabel="Creating..."
    >
      <EntityTypePrimaryFieldsSection
        draft={controller.primarySection.localValue}
        editable={!controller.primarySection.isSaving}
        onTypeChange={(value) =>
          controller.primarySection.setLocalValue((previous) => ({ ...previous, type: value }))
        }
        onColorChange={(value) =>
          controller.primarySection.setLocalValue((previous) => ({ ...previous, color: value }))
        }
      />
    </RecordSingleSectionPanel>
  )
}

export function EntityTypeCreateClient({ backHref }: { backHref: string }) {
  return (
    <RecordCreateClientScaffold
      title="New Entity Type"
      backHref={backHref}
      dirtyMessage="You have unsaved entity type changes. Leave this form without saving?"
    >
      {(page) => <EntityTypeCreatePanel page={page} backHref={backHref} />}
    </RecordCreateClientScaffold>
  )
}
