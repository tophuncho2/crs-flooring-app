"use client"

import type { EntityForm, EntityOption } from "@builders/domain"
import { CellAt, FieldSection, FormField } from "@/engines/record-view"
import { ActionHeader } from "@/engines/common"
import { EntityTypePicker } from "@/modules/entities/components/picker/entity-type-picker"
import { EntityCellsSection } from "@/modules/entities/components/record/primary/entity-cells-section"
import {
  deriveEntityMode,
  type PropertyHubCreateForm,
} from "@/modules/entities/controllers/record/properties/use-property-hub-create-section"

const SECTION_CARD_CLASS =
  "rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]"

/**
 * The entity half of the hub create form: link an existing entity
 * (picker) OR create a new one (cells). The two are mutually exclusive — picking
 * a link disables the create cells and vice-versa (the legacy `deriveEntityMode`
 * rule). Leaving both empty creates the property with no entity.
 */
export function EntitySelectSection({
  value,
  disabled,
  onLink,
  onEntityFieldChange,
  compact = false,
}: {
  value: PropertyHubCreateForm
  disabled: boolean
  onLink: (option: EntityOption | null) => void
  onEntityFieldChange: <K extends keyof EntityForm>(
    field: K,
    next: EntityForm[K],
  ) => void
  /**
   * Trim the "create new" cells to Entity Name only (no phone/email/address).
   * Used by the quick-create modal; the full hub page leaves this `false`.
   */
  compact?: boolean
}) {
  const mode = deriveEntityMode(value)

  return (
    <div className={SECTION_CARD_CLASS}>
      <ActionHeader title="Entity" />
      <div className="space-y-4 p-4">
        <FieldSection gap="0.75rem">
          <CellAt col={1} colSpan={6}>
            <FormField label="Link existing entity" required>
              <EntityTypePicker
                value={value.entityLinkId}
                selectedLabel={value.entityLinkLabel}
                disabled={disabled || mode === "create"}
                placeholder="Link an existing entity"
                ariaLabel="Link existing entity"
                onChange={(id) => {
                  if (!id) onLink(null)
                }}
                onOptionSelected={(option) => {
                  if (option) onLink(option)
                }}
              />
            </FormField>
          </CellAt>
        </FieldSection>

        <p className="text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/55">
          or create new
        </p>

        <EntityCellsSection
          form={value.entityForm}
          editable={!disabled && mode !== "link"}
          onFieldChange={onEntityFieldChange}
          showContactAndAddress={!compact}
        />
      </div>
    </div>
  )
}
