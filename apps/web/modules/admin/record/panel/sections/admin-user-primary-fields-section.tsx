"use client"

import {
  RECORD_FIELD_CONTROL_CLASS_NAME,
  RecordFormField,
  RecordPrimaryFieldCell,
  RecordPrimaryFieldsGrid,
  RecordPrimaryPane,
  RecordPrimarySection,
  RecordStaticFieldValue,
} from "@/modules/shared/engines/record-view"
import { formatStableDateTime } from "@builders/domain"
import type { ManagedUserForm, ManagedUserRow } from "../../../domain/types"

const VERIFICATION_OPTIONS = [
  { value: "true", label: "Verified" },
  { value: "false", label: "Pending Approval" },
]

export function AdminUserPrimaryFieldsSection({
  user,
  draft,
  disabled = false,
  onChange,
}: {
  user: ManagedUserRow
  draft: ManagedUserForm
  disabled?: boolean
  onChange: (value: ManagedUserForm) => void
}) {
  const createdLabel = user.createdAt ? formatStableDateTime(user.createdAt) : "Not saved yet"

  return (
    <RecordPrimarySection>
      <RecordPrimaryPane variant="main">
        <RecordPrimaryFieldsGrid>
          <RecordPrimaryFieldCell size="md">
            <RecordFormField label="Email">
              <RecordStaticFieldValue>{user.email}</RecordStaticFieldValue>
            </RecordFormField>
          </RecordPrimaryFieldCell>

          <RecordPrimaryFieldCell size="sm">
            <RecordFormField label="Role">
              <RecordStaticFieldValue>{user.role}</RecordStaticFieldValue>
            </RecordFormField>
          </RecordPrimaryFieldCell>

          {user.canRestrict && (
            <RecordPrimaryFieldCell size="sm">
              <RecordFormField label="Verification Status">
                <select
                  value={String(draft.isVerified)}
                  onChange={(event) => onChange({ isVerified: event.target.value === "true" })}
                  disabled={disabled}
                  className={RECORD_FIELD_CONTROL_CLASS_NAME}
                >
                  {VERIFICATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </RecordFormField>
            </RecordPrimaryFieldCell>
          )}

          {!user.canRestrict && (
            <RecordPrimaryFieldCell size="sm">
              <RecordFormField label="Status">
                <RecordStaticFieldValue>{user.isVerified ? "Verified" : "Pending Approval"}</RecordStaticFieldValue>
              </RecordFormField>
            </RecordPrimaryFieldCell>
          )}
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>

      <RecordPrimaryPane variant="side">
        <RecordPrimaryFieldsGrid variant="side">
          <RecordFormField label="Created">
            <RecordStaticFieldValue>{createdLabel}</RecordStaticFieldValue>
          </RecordFormField>
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>
    </RecordPrimarySection>
  )
}
