"use client"

import { RecordCreateMenu } from "@/engines/common"
import type { TemplateOption } from "@builders/domain"
import { TemplateQuickCreateModal } from "@/modules/templates/components/record/template-quick-create-modal"

/**
 * The shared "new template" affordance for a record-view Template cell: a ⋮
 * options menu offering **Quick form** (the inline `TemplateQuickCreateModal`,
 * which fills the originating cell with no navigation) and **Proper form**
 * (navigate to the full, unseeded `/dashboard/templates/new` page). Drops straight
 * into a `FormField` `actions` slot beside the cell's `RecordOpenButton` — the
 * template-side mirror of `PropertyCreateMenu`.
 *
 * Self-contained: it owns the modal open-state; the host supplies `returnTo` and
 * an `onCreated` that fills its cell from the returned `TemplateOption` — the same
 * handler its picker already runs for a picked option.
 */
export function TemplateCreateMenu({
  returnTo,
  onCreated,
  initialProperty,
}: {
  /** Record-entry path the proper-form route returns to after create. */
  returnTo: string
  /** Fired with the created template as a `TemplateOption`. */
  onCreated: (option: TemplateOption) => void
  /** The host's current property — the quick form scopes the new template to it. */
  initialProperty?: { id: string; label: string | null } | null
}) {
  return (
    <RecordCreateMenu
      heading="New template"
      basePath="/dashboard/templates"
      returnTo={returnTo}
      renderModal={({ open, onClose }) => (
        <TemplateQuickCreateModal
          open={open}
          onClose={onClose}
          initialProperty={initialProperty}
          onCreated={(option) => {
            onCreated(option)
            onClose()
          }}
        />
      )}
    />
  )
}
