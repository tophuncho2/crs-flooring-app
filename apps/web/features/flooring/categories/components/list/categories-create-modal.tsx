"use client"

import { RecordPanelFooter } from "@/features/flooring/shared/forms/record-panel-footer"
import { RecordModalShell } from "@/features/flooring/shared/forms/record-form"
import { FormStatusNotices } from "@/features/flooring/shared/feedback/notices"
import { CategoryFormFields } from "../category-form-fields"
import type { CategoryForm, UnitOfMeasureOption } from "../../domain/types"

export function CategoriesCreateModal({
  draft,
  unitOfMeasureOptions,
  message,
  error,
  isSaving,
  onClose,
  onFieldChange,
  onCreate,
}: {
  draft: CategoryForm
  unitOfMeasureOptions: UnitOfMeasureOption[]
  message: string
  error: string
  isSaving: boolean
  onClose: () => void
  onFieldChange: (field: keyof CategoryForm, value: string) => void
  onCreate: () => void
}) {
  return (
    <RecordModalShell title="Create Category" onClose={onClose} sizeClass="max-w-4xl">
      <div className="space-y-6">
        <FormStatusNotices message={message} error={error} loadingMessage={isSaving ? "Creating category..." : ""} />
        <CategoryFormFields draft={draft} options={unitOfMeasureOptions} onFieldChange={onFieldChange} />
        <RecordPanelFooter
          onClose={onClose}
          onSave={onCreate}
          saveLabel="Create Category"
          savingLabel="Creating Category..."
          isSaving={isSaving}
        />
      </div>
    </RecordModalShell>
  )
}
