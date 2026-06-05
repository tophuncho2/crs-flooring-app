"use client"

import { useState } from "react"
import {
  RecordBackButton,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  useEmbeddedRecordPageController,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import type { ManagementCompanyOption } from "@builders/domain"
import { usePropertyCreateSection } from "@/modules/properties/controllers/record/primary/use-property-create-section"
import { PropertyPrimaryFieldsSection } from "./primary/property-primary-fields-section"

/**
 * The **create** face of the MC record view's properties drilldown — opened
 * from the "+ Property" button. Mirrors `EmbeddedPropertyRecordView`: wraps the
 * host page in an embedded page proxy (shared guard/dialog, own dirty state,
 * "back" → the list), and renders the same property primary fields with the
 * management company **prelinked but editable**. On save it creates the
 * property and drills into it in edit mode (via `?property=<newId>`).
 */
export function EmbeddedPropertyCreateView({
  managementCompanyId,
  managementCompanyName,
  hostPage,
  backHref,
  onBack,
  onDirtyChange,
}: {
  managementCompanyId: string
  managementCompanyName: string | null
  hostPage: RecordDetailClientScaffoldContext
  backHref: string
  onBack: () => void
  onDirtyChange?: (isDirty: boolean) => void
}) {
  const embeddedPage = useEmbeddedRecordPageController({ host: hostPage, onNavigateBack: onBack })
  const controller = usePropertyCreateSection({
    page: embeddedPage,
    managementCompanyId,
    backHref,
  })
  const primary = controller.primarySection
  const [mcLabel, setMcLabel] = useState<string | null>(managementCompanyName)

  const sections: RecordPanelSectionConfig[] = [
    {
      key: "primary",
      type: "field",
      order: 10,
      dirtyLabel: "property",
      controller: primary,
      render: () => (
        <RecordPrimarySectionInstance
          title="New Property"
          showHeader={false}
          error={primary.error}
          noticeMessage={primary.noticeMessage}
          noticeError={primary.noticeError}
          isDirty={primary.isDirty}
          isSaving={primary.isSaving}
          hasConflict={primary.hasConflict}
          onSave={() => void primary.save()}
          onDiscard={primary.discard}
          saveLabel="Create"
          savingLabel="Creating…"
          actionsLeading={<RecordBackButton onClick={embeddedPage.closePage} label="Back" />}
        >
          <PropertyPrimaryFieldsSection
            draft={primary.localValue}
            editable={!primary.isSaving}
            onFieldChange={(field, value) =>
              primary.setLocalValue((previous) => ({ ...previous, [field]: value }))
            }
            managementCompanyLabel={mcLabel}
            onManagementCompanyOption={(option: ManagementCompanyOption | null) =>
              setMcLabel(option?.name ?? null)
            }
          />
        </RecordPrimarySectionInstance>
      ),
    },
  ]

  return (
    <RecordMultiSectionPanel page={embeddedPage} sections={sections} onDirtyChange={onDirtyChange} />
  )
}
